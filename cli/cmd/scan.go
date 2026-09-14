package cmd

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"github.com/sentinel-sast/sentinel/cli/internal/client"
	"github.com/sentinel-sast/sentinel/cli/internal/model"
	"github.com/sentinel-sast/sentinel/cli/internal/remote"
	"github.com/sentinel-sast/sentinel/cli/internal/scanner"
	"github.com/sentinel-sast/sentinel/cli/pkg/git"
	"github.com/sentinel-sast/sentinel/cli/pkg/ui"
)

// ScanOptions configures directory scanning parameters.
type ScanOptions struct {
	FailOn  string
	Workers int
}

func handleRemoteScan(cmd *cobra.Command, opts *RootOptions, scanOpts *ScanOptions, targetDir string) error {
	return executeScan(cmd, opts, scanOpts, targetDir)
}

func executeScan(cmd *cobra.Command, opts *RootOptions, scanOpts *ScanOptions, targetDir string) error {
	out := cmd.OutOrStdout()

	// Initialize the live Knight ASCII progress indicator as sole visual renderer
	kp := ui.NewKnightProgressWithWriter(out)
	kp.Update(0.0, "Initializing scan environment...")

	depth := 1
	stage1Msg := fmt.Sprintf("[1/4] Cloning repository shallowly (depth=%d)...", depth)
	kp.Update(5.0, stage1Msg)

	var gitRepoURL string
	var token string

	if remote.IsGitHubURL(targetDir) {
		repoInfo, err := remote.ParseGitHubURL(targetDir)
		if err != nil {
			kp.Complete("Invalid GitHub URL")
			return fmt.Errorf("failed to parse github url: %w", err)
		}
		gitRepoURL = repoInfo.FullURL
		token = opts.ConfigMgr.GetGitHubPAT()

		ctx := cmd.Context()
		isPrivate, err := remote.CheckRepoVisibilityWithToken(ctx, repoInfo.Owner, repoInfo.Repo, token)
		if err == nil && isPrivate && token == "" {
			fmt.Fprint(out, "[!] Private repository detected. Enter GitHub Personal Access Token: ")
			reader := bufio.NewReader(os.Stdin)
			input, err := reader.ReadString('\n')
			if err != nil {
				return fmt.Errorf("failed to read token: %w", err)
			}
			token = strings.TrimSpace(input)
			opts.ConfigMgr.SetGitHubPAT(token)
			kp.Update(5.0, stage1Msg)
		}
	}

	stage1Start := time.Now()
	var targetPath string
	var isTemp bool

	// Run clone in background goroutine to decouple execution from UI progress loop
	errChan := make(chan error, 1)
	go func() {
		var err error
		targetPath, isTemp, err = git.PrepareTarget(cmd.Context(), targetDir, git.CloneOptions{
			Depth:     depth,
			AuthToken: token,
		})
		errChan <- err
	}()

	// Smoothly advance progress from 5% to 24% while waiting for the clone to finish
	pct := 5.0
	ticker := time.NewTicker(150 * time.Millisecond)
	defer ticker.Stop()

	cloneDone := false
	for !cloneDone {
		select {
		case err := <-errChan:
			if err != nil {
				kp.Complete(fmt.Sprintf("Git clone failed: %v", err))
				return err
			}
			cloneDone = true
		case <-ticker.C:
			if pct < 24.0 {
				pct += 0.5 // Keep knight filling upward while download streams
				kp.Update(pct, stage1Msg)
			}
		}
	}

	if isTemp {
		defer os.RemoveAll(targetPath)
	}

	scanTarget := targetPath
	stage1Duration := time.Since(stage1Start).Milliseconds()
	if !isTemp {
		stage1Duration = 0
	}

	// Stage 1 Done: Instantly advance to 25%
	kp.Update(25.0, "[1/4] Repository clone complete. Mapping files...")

	opts.Logger.Infof("Initializing Sentinel SAST Engine v%s", Version)
	opts.Logger.Infof("Scanning target: %s", scanTarget)

	// Stage 2: AST Parsing & Graph Construction
	stage2Start := time.Now()
	stage2Msg := "[2/4] Parsing AST & constructing graph layers (Tree-sitter & Rust)..."
	kp.Update(25.0, stage2Msg)

	scanEngine := scanner.NewScanner(Version,
		scanner.WithWorkers(scanOpts.Workers),
		scanner.WithProgress(func(current, total int, loc int64, currentFile string) {
			if total > 0 {
				pct := 25.0 + (float64(current)/float64(total))*40.0
				kp.Update(pct, fmt.Sprintf("Parsing AST [%d/%d files] (%d LOC)", current, total, loc))
			}
		}),
	)
	payload, err := scanEngine.ScanDirectory(cmd.Context(), scanTarget)
	if err != nil {
		kp.Complete("Scan failed")
		opts.Logger.Errorf("Scan failed: %v", err)
		return fmt.Errorf("scan failed: %w", err)
	}

	if gitRepoURL != "" {
		payload.Git.Repository = gitRepoURL
	}
	stage2Duration := time.Since(stage2Start).Milliseconds()
	kp.Update(68.0, fmt.Sprintf("Indexed %d files (%d LOC) — 5-layer graph ready", payload.Stats.FilesScanned, payload.Stats.LinesOfCode))

	opts.Logger.Infof("Indexed %d files (%d LOC) in %dms; %d candidate taint paths identified",
		payload.Stats.FilesScanned, payload.Stats.LinesOfCode, payload.Stats.DurationMs, len(payload.Findings))

	// Intercept cloud transmission if --export flag is set
	exportFlag, _ := cmd.Flags().GetString("export")
	if exportFlag == "" {
		exportFlag = opts.Export
	}

	if exportFlag != "" {
		kp.Complete("Report exported to JSON locally")
		fmt.Fprintf(out, "[✓] [1/4] Cloning repository shallowly (depth=%d)... (%dms)\n", depth, stage1Duration)
		fmt.Fprintf(out, "[✓] [2/4] Parsing AST & constructing graph layers (Tree-sitter & Rust)... (%dms)\n", stage2Duration)
		opts.Reporter.PrintScanSummary(payload)
		exportPath, err := opts.Reporter.ExportJSON(payload, exportFlag)
		if err != nil {
			opts.Logger.Errorf("Failed exporting report: %v", err)
			return fmt.Errorf("failed exporting report: %w", err)
		}
		opts.Logger.Infof("Report exported to JSON: %s", exportPath)
		fmt.Fprintf(out, "[✓] Intercepted cloud API request: Normalized vulnerability report saved to:\n    %s\n\n", exportPath)
		return nil
	}

	// Require local Viper-persisted API key for Cloud verification
	apiKey := opts.ConfigMgr.GetAPIKey()
	if apiKey == "" {
		kp.Complete("Authentication required")
		opts.Logger.Errorf("Authentication required: Sentinel API key not found in Viper config")
		return fmt.Errorf("authentication required: Sentinel API key not found in Viper config. Run 'sentinel login' or set SENTINEL_API_KEY environment variable")
	}

	apiURL := opts.ConfigMgr.GetAPIURL()
	opts.Logger.Infof("Transmitting payload to Sentinel Cloud: %s", apiURL)

	// Stage 3: Tracing taint flows & verifying via Claude 3.5 Sonnet
	stage3Start := time.Now()
	stage3Msg := "[3/4] Tracing taint flows & verifying via Claude 3.5 Sonnet..."
	kp.Update(75.0, stage3Msg)

	c := client.NewClient(apiURL, apiKey, 60*time.Second)
	resp, err := c.SubmitScan(cmd.Context(), payload)
	if err != nil {
		kp.Complete("Cloud verification failed")
		opts.Logger.Errorf("Cloud verification failed: %v", err)
		return fmt.Errorf("cloud verification failed: %w", err)
	}
	stage3Duration := time.Since(stage3Start).Milliseconds()
	kp.Update(90.0, fmt.Sprintf("Cloud verification complete: %d verified findings", len(resp.Findings)))

	// Stage 4: Synchronizing scan records to Prisma database
	stage4Start := time.Now()
	stage4Msg := "[4/4] Synchronizing scan records to Prisma database..."
	kp.Update(95.0, stage4Msg)

	if err := c.SynchronizeScan(cmd.Context(), resp.ScanID); err != nil {
		opts.Logger.Warnf("Prisma synchronization check warning: %v", err)
	}
	stage4Duration := time.Since(stage4Start).Milliseconds()
	kp.Complete(fmt.Sprintf("Scan completed — %d verified findings", len(resp.Findings)))

	fmt.Fprintf(out, "[✓] [1/4] Cloning repository shallowly (depth=%d)... (%dms)\n", depth, stage1Duration)
	fmt.Fprintf(out, "[✓] [2/4] Parsing AST & constructing graph layers (Tree-sitter & Rust)... (%dms)\n", stage2Duration)
	fmt.Fprintf(out, "[✓] [3/4] Tracing taint flows & verifying via Claude 3.5 Sonnet... (%dms)\n", stage3Duration)
	fmt.Fprintf(out, "[✓] [4/4] Synchronizing scan records to Prisma database... (%dms)\n", stage4Duration)

	opts.Reporter.PrintScanSummary(payload)
	opts.Logger.Infof("Cloud verification complete: %d verified findings (status: %s)", len(resp.Findings), resp.Status)
	opts.Reporter.PrintCloudVerification(resp)

	// CI/CD security gate enforcement: check confirmed findings against threshold
	failOn := strings.ToLower(scanOpts.FailOn)
	if failOn != "none" && failOn != "off" {
		failingFindings := 0
		for _, f := range resp.Findings {
			if f.Verdict == "CONFIRMED_TRUE_POSITIVE" {
				switch failOn {
				case "critical":
					if f.Severity == model.SeverityCritical {
						failingFindings++
					}
				case "high":
					if f.Severity == model.SeverityCritical || f.Severity == model.SeverityHigh {
						failingFindings++
					}
				case "medium":
					if f.Severity == model.SeverityCritical || f.Severity == model.SeverityHigh || f.Severity == model.SeverityMedium {
						failingFindings++
					}
				case "any", "all":
					failingFindings++
				}
			}
		}

		if failingFindings > 0 {
			opts.Logger.Errorf("CI/CD pipeline security gate failed: %d confirmed vulnerabilities found exceeding severity threshold '%s'", failingFindings, scanOpts.FailOn)
			return fmt.Errorf("CI/CD pipeline security gate failed: %d confirmed vulnerability/vulnerabilities found exceeding severity threshold '%s'", failingFindings, scanOpts.FailOn)
		}
	}

	opts.Logger.Infof("Security gate passed: 0 blocking vulnerabilities detected")
	fmt.Fprintf(out, "[✓] Security gate passed: 0 blocking vulnerabilities detected.\n")
	return nil
}

// NewScanCmd creates the Cobra subcommand for executing local and remote SAST scans.
func NewScanCmd(opts *RootOptions) *cobra.Command {
	scanOpts := &ScanOptions{
		FailOn:  "high",
		Workers: 0,
	}

	scanCmd := &cobra.Command{
		Use:   "scan [path]",
		Short: "Orchestrate deterministic SAST scan and verify via Sentinel Cloud",
		Long: `Traverses the target directory, orchestrates underlying deterministic scanning engines
using os/exec and concurrent AST taint parsers, and transmits normalized JSON payloads
to the Next.js Sentinel Cloud API route for Taint Graph and LLM exploitability verification.

Use --export=json to intercept the cloud transmission and dump normalized results locally.

Supports remote GitHub repository scanning: pass a GitHub URL (e.g. https://github.com/owner/repo)
and Sentinel will clone the repository shallowly into a secure temporary directory, scan it, and clean up.`,
		Args: cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := InitLogger(cmd, opts); err != nil {
				return err
			}
			defer func() {
				if opts.Logger != nil {
					_ = opts.Logger.Close()
				}
			}()

			targetDir := "."
			if len(args) > 0 && strings.TrimSpace(args[0]) != "" {
				targetDir = args[0]
			}

			return executeScan(cmd, opts, scanOpts, targetDir)
		},
	}

	scanCmd.Flags().StringVar(&opts.Export, "export", "", "Export raw normalized JSON report locally, intercepting cloud request (e.g. --export=json)")
	scanCmd.Flags().StringVar(&opts.LogFile, "log-file", "", "Path to write execution logs (default: sentinel.log when flag is passed without argument)")
	scanCmd.Flags().Lookup("log-file").NoOptDefVal = "sentinel.log"
	scanCmd.Flags().StringVar(&scanOpts.FailOn, "fail-on", "high", "Fail with non-zero exit code if confirmed findings meet severity ('critical', 'high', 'medium', 'any', 'none')")
	scanCmd.Flags().IntVarP(&scanOpts.Workers, "workers", "w", 0, "Number of concurrent goroutines for file analysis (default 2*CPU)")

	return scanCmd
}

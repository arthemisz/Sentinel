package cmd

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"github.com/sentinel-sast/sentinel/cli/internal/client"
	"github.com/sentinel-sast/sentinel/cli/internal/model"
	"github.com/sentinel-sast/sentinel/cli/internal/remote"
	"github.com/sentinel-sast/sentinel/cli/internal/reporter"
	"github.com/sentinel-sast/sentinel/cli/internal/scanner"
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

	// Initialize the live Knight ASCII progress indicator
	kp := ui.NewKnightProgressWithWriter(out)
	kp.Update(0.0, "Initializing scan environment...")

	indicator := reporter.NewStageIndicator(out)

	// Stage 1: Git clone or local directory bypass
	stage1Msg := "[1/4] Cloning repository shallowly (depth=1)..."
	indicator.Start(stage1Msg)
	kp.Update(5.0, stage1Msg)

	var scanTarget string
	var cleanupFunc func()
	var gitRepoURL string

	// If the target is already a local directory path, bypass Git entirely and scan directly
	if fi, err := os.Stat(targetDir); err == nil && fi.IsDir() {
		absTarget, err := filepath.Abs(targetDir)
		if err != nil {
			indicator.Error(err)
			kp.Complete("Failed resolving target path")
			return fmt.Errorf("failed resolving target path '%s': %w", targetDir, err)
		}
		scanTarget = absTarget
		cleanupFunc = func() {}
		indicator.Success(0)
		kp.Update(15.0, "Target directory verified")
	} else if remote.IsGitHubURL(targetDir) {
		repoInfo, err := remote.ParseGitHubURL(targetDir)
		if err != nil {
			indicator.Error(err)
			kp.Complete("Invalid GitHub URL")
			return fmt.Errorf("failed to parse github url: %w", err)
		}
		gitRepoURL = repoInfo.FullURL
		token := opts.ConfigMgr.GetGitHubPAT()

		ctx := cmd.Context()
		isPrivate, err := remote.CheckRepoVisibilityWithToken(ctx, repoInfo.Owner, repoInfo.Repo, token)
		if err == nil && isPrivate && token == "" {
			indicator.Stop()
			fmt.Fprint(out, "[!] Private repository detected. Enter GitHub Personal Access Token: ")
			reader := bufio.NewReader(os.Stdin)
			input, err := reader.ReadString('\n')
			if err != nil {
				return fmt.Errorf("failed to read token: %w", err)
			}
			token = strings.TrimSpace(input)
			opts.ConfigMgr.SetGitHubPAT(token)
			indicator.Start(stage1Msg)
			kp.Update(5.0, stage1Msg)
		}

		cloneRes, err := remote.CloneRepository(ctx, repoInfo.CloneURL, token)
		if err != nil {
			indicator.Error(err)
			kp.Complete("Failed cloning repository")
			opts.Logger.Errorf("Failed to clone repository: %v", err)
			return fmt.Errorf("failed to clone repository: %w", err)
		}
		scanTarget = cloneRes.TempDir
		cleanupFunc = cloneRes.CleanupFunc
		indicator.Success()
		kp.Update(15.0, "Repository cloned shallowly")
	} else {
		absTarget, err := filepath.Abs(targetDir)
		if err != nil {
			indicator.Error(err)
			kp.Complete("Failed resolving target path")
			return fmt.Errorf("failed resolving target path '%s': %w", targetDir, err)
		}
		scanTarget = absTarget
		cleanupFunc = func() {}
		indicator.Success(0)
		kp.Update(15.0, "Target directory verified")
	}

	if cleanupFunc != nil {
		defer cleanupFunc()
	}

	opts.Logger.Infof("Initializing Sentinel SAST Engine v%s", Version)
	opts.Logger.Infof("Scanning target: %s", scanTarget)

	// Stage 2: AST Parsing & Graph Construction
	stage2Msg := "[2/4] Parsing AST & constructing graph layers (Tree-sitter & Rust)..."
	indicator.Start(stage2Msg)
	kp.Update(20.0, "Collecting target source files...")

	scanEngine := scanner.NewScanner(Version,
		scanner.WithWorkers(scanOpts.Workers),
		scanner.WithProgress(func(current, total int, loc int64, currentFile string) {
			if total > 0 {
				pct := 20.0 + (float64(current)/float64(total))*45.0
				kp.Update(pct, fmt.Sprintf("Parsing AST [%d/%d files] (%d LOC)", current, total, loc))
			}
		}),
	)
	payload, err := scanEngine.ScanDirectory(cmd.Context(), scanTarget)
	if err != nil {
		indicator.Error(err)
		kp.Complete("Scan failed")
		opts.Logger.Errorf("Scan failed: %v", err)
		return fmt.Errorf("scan failed: %w", err)
	}

	if gitRepoURL != "" {
		payload.Git.Repository = gitRepoURL
	}
	indicator.Success()
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
	stage3Msg := "[3/4] Tracing taint flows & verifying via Claude 3.5 Sonnet..."
	indicator.Start(stage3Msg)
	kp.Update(75.0, stage3Msg)

	c := client.NewClient(apiURL, apiKey, 60*time.Second)
	resp, err := c.SubmitScan(cmd.Context(), payload)
	if err != nil {
		indicator.Error(err)
		kp.Complete("Cloud verification failed")
		opts.Logger.Errorf("Cloud verification failed: %v", err)
		return fmt.Errorf("cloud verification failed: %w", err)
	}
	indicator.Success()
	kp.Update(90.0, fmt.Sprintf("Cloud verification complete: %d verified findings", len(resp.Findings)))

	// Stage 4: Synchronizing scan records to Prisma database
	stage4Msg := "[4/4] Synchronizing scan records to Prisma database..."
	indicator.Start(stage4Msg)
	kp.Update(95.0, stage4Msg)

	if err := c.SynchronizeScan(cmd.Context(), resp.ScanID); err != nil {
		opts.Logger.Warnf("Prisma synchronization check warning: %v", err)
	}
	indicator.Success()
	kp.Complete(fmt.Sprintf("Scan completed — %d verified findings", len(resp.Findings)))

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

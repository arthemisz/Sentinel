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
	"github.com/sentinel-sast/sentinel/cli/internal/scanner"
)

// ScanOptions configures directory scanning parameters.
type ScanOptions struct {
	FailOn  string
	Workers int
}

func handleRemoteScan(cmd *cobra.Command, opts *RootOptions, scanOpts *ScanOptions, targetDir string) error {
	repoInfo, err := remote.ParseGitHubURL(targetDir)
	if err != nil {
		return fmt.Errorf("failed to parse github url: %w", err)
	}

	fmt.Fprintf(cmd.OutOrStdout(), "[+] Remote scan target detected: %s/%s\n", repoInfo.Owner, repoInfo.Repo)

	ctx := cmd.Context()
	token := opts.ConfigMgr.GetGitHubPAT()

	type visResult struct {
		isPrivate bool
		err       error
	}
	visChan := make(chan visResult, 1)

	go func() {
		isPrivate, err := remote.CheckRepoVisibilityWithToken(ctx, repoInfo.Owner, repoInfo.Repo, token)
		visChan <- visResult{isPrivate, err}
	}()

	res := <-visChan
	if res.err != nil {
		return fmt.Errorf("failed to check repository visibility: %w", res.err)
	}

	if res.isPrivate {
		if token == "" {
			fmt.Fprint(cmd.OutOrStdout(), "[!] Private repository detected. Enter GitHub Personal Access Token: ")
			reader := bufio.NewReader(os.Stdin)
			input, err := reader.ReadString('\n')
			if err != nil {
				return fmt.Errorf("failed to read token: %w", err)
			}
			token = strings.TrimSpace(input)
			opts.ConfigMgr.SetGitHubPAT(token)
		}
	}

	cloneResult, err := remote.CloneRepository(ctx, repoInfo.CloneURL, token)
	if err != nil {
		opts.Logger.Errorf("Failed to clone repository: %v", err)
		return fmt.Errorf("failed to clone repository: %w", err)
	}
	defer func() {
		fmt.Fprintf(cmd.OutOrStdout(), "[+] Temporary scan directory cleaned up successfully.\n")
	}()
	defer cloneResult.CleanupFunc()

	opts.Logger.Infof("Repository cloned to temporary directory: %s", cloneResult.TempDir)
	fmt.Fprintf(cmd.OutOrStdout(), "[+] Repository cloned to temporary directory: %s\n", cloneResult.TempDir)
	fmt.Fprintf(cmd.OutOrStdout(), "[+] Initializing Sentinel SAST Engine v%s\n", Version)

	scanEngine := scanner.NewScanner(Version, scanner.WithWorkers(scanOpts.Workers))

	payload, err := scanEngine.ScanDirectory(ctx, cloneResult.TempDir)
	if err != nil {
		opts.Logger.Errorf("Scan failed: %v", err)
		return fmt.Errorf("scan failed: %w", err)
	}

	payload.Git.Repository = repoInfo.FullURL
	opts.Logger.Infof("Remote scan completed: %d files (%d LOC) in %dms; %d candidate taint paths",
		payload.Stats.FilesScanned, payload.Stats.LinesOfCode, payload.Stats.DurationMs, len(payload.Findings))

	opts.Reporter.PrintScanSummary(payload)

	exportFlag, _ := cmd.Flags().GetString("export")
	if exportFlag == "" {
		exportFlag = opts.Export
	}

	if exportFlag != "" {
		exportPath, err := opts.Reporter.ExportJSON(payload, exportFlag)
		if err != nil {
			opts.Logger.Errorf("Failed exporting report: %v", err)
			return fmt.Errorf("failed exporting report: %w", err)
		}
		opts.Logger.Infof("Report exported to JSON: %s", exportPath)
		fmt.Fprintf(cmd.OutOrStdout(), "[✓] Intercepted cloud API request: Normalized vulnerability report saved to:\n    %s\n\n", exportPath)
		return nil
	}

	apiKey := opts.ConfigMgr.GetAPIKey()
	if apiKey == "" {
		opts.Logger.Errorf("Authentication required: API key not found in config")
		return fmt.Errorf("authentication required: Sentinel API key not found in Viper config. Run 'sentinel login' or set SENTINEL_API_KEY environment variable")
	}

	apiURL := opts.ConfigMgr.GetAPIURL()
	opts.Logger.Infof("Transmitting payload to Sentinel Cloud: %s", apiURL)
	fmt.Fprintf(cmd.OutOrStdout(), "[+] Transmitting payload to Sentinel Cloud (%s) for Taint Graph & LLM verification...\n\n", apiURL)

	c := client.NewClient(apiURL, apiKey, 60*time.Second)
	resp, err := c.SubmitScan(ctx, payload)
	if err != nil {
		opts.Logger.Errorf("Cloud verification failed: %v", err)
		return fmt.Errorf("cloud verification failed: %w", err)
	}

	opts.Logger.Infof("Cloud verification complete: %d verified findings, status: %s", len(resp.Findings), resp.Status)
	opts.Reporter.PrintCloudVerification(resp)

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
	fmt.Fprintf(cmd.OutOrStdout(), "[✓] Security gate passed: 0 blocking vulnerabilities detected.\n")
	return nil
}

// NewScanCmd creates the Cobra subcommand for executing local SAST scans.
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
and Sentinel will clone the repository into a secure temporary directory, scan it, and clean up.`,
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

			opts.Reporter.PrintBanner(Version)

			targetDir := "."
			if len(args) > 0 && strings.TrimSpace(args[0]) != "" {
				targetDir = args[0]
			}

			// === NEW: Check if target is a GitHub URL ===
			if remote.IsGitHubURL(targetDir) {
				return handleRemoteScan(cmd, opts, scanOpts, targetDir)
			}

			// === EXISTING local scan logic (keep all of it unchanged) ===
			absTarget, err := filepath.Abs(targetDir)
			if err != nil {
				opts.Logger.Errorf("Failed resolving target path '%s': %v", targetDir, err)
				return fmt.Errorf("failed resolving target path '%s': %w", targetDir, err)
			}

			opts.Logger.Infof("Initializing Sentinel SAST Engine v%s", Version)
			opts.Logger.Infof("Scanning target directory: %s", absTarget)

			fmt.Fprintf(cmd.OutOrStdout(), "[+] Initializing Sentinel SAST Engine v%s\n", Version)
			fmt.Fprintf(cmd.OutOrStdout(), "[+] Scanning target: %s\n", absTarget)

			// Instantiate orchestrator with concurrent worker pool
			scanEngine := scanner.NewScanner(Version, scanner.WithWorkers(scanOpts.Workers))

			// Orchestrate scanning engines and concurrent AST traversal
			payload, err := scanEngine.ScanDirectory(cmd.Context(), absTarget)
			if err != nil {
				opts.Logger.Errorf("Scan execution failed: %v", err)
				return fmt.Errorf("scan failed: %w", err)
			}

			opts.Logger.Infof("Indexed %d files (%d LOC) in %dms; %d candidate taint paths identified",
				payload.Stats.FilesScanned, payload.Stats.LinesOfCode, payload.Stats.DurationMs, len(payload.Findings))

			// Render local AST indexing and engine orchestration summary
			opts.Reporter.PrintScanSummary(payload)

			// Intercept cloud transmission if --export flag is set
			exportFlag, _ := cmd.Flags().GetString("export")
			if exportFlag == "" {
				exportFlag = opts.Export
			}

			if exportFlag != "" {
				exportPath, err := opts.Reporter.ExportJSON(payload, exportFlag)
				if err != nil {
					opts.Logger.Errorf("Failed exporting report: %v", err)
					return fmt.Errorf("failed exporting report: %w", err)
				}
				opts.Logger.Infof("Report exported to JSON: %s", exportPath)
				fmt.Fprintf(cmd.OutOrStdout(), "[✓] Intercepted cloud API request: Normalized vulnerability report saved to:\n    %s\n\n", exportPath)
				return nil
			}

			// Require local Viper-persisted API key for Cloud verification
			apiKey := opts.ConfigMgr.GetAPIKey()
			if apiKey == "" {
				opts.Logger.Errorf("Authentication required: Sentinel API key not found in Viper config")
				return fmt.Errorf("authentication required: Sentinel API key not found in Viper config. Run 'sentinel login' or set SENTINEL_API_KEY environment variable")
			}

			apiURL := opts.ConfigMgr.GetAPIURL()
			opts.Logger.Infof("Transmitting scan payload to Sentinel Cloud: %s", apiURL)
			fmt.Fprintf(cmd.OutOrStdout(), "[+] Transmitting payload to Sentinel Cloud (%s) for Taint Graph & LLM verification...\n\n", apiURL)

			// Authenticated HTTP client using native net/http
			c := client.NewClient(apiURL, apiKey, 60*time.Second)
			resp, err := c.SubmitScan(cmd.Context(), payload)
			if err != nil {
				opts.Logger.Errorf("Cloud verification failed: %v", err)
				return fmt.Errorf("cloud verification failed: %w", err)
			}

			opts.Logger.Infof("Cloud verification complete: %d verified findings (status: %s)", len(resp.Findings), resp.Status)

			// Render verified cloud findings and taint graph telemetry
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
			fmt.Fprintf(cmd.OutOrStdout(), "[✓] Security gate passed: 0 blocking vulnerabilities detected.\n")
			return nil
		},
	}

	scanCmd.Flags().StringVar(&opts.Export, "export", "", "Export raw normalized JSON report locally, intercepting cloud request (e.g. --export=json)")
	scanCmd.Flags().StringVar(&opts.LogFile, "log-file", "", "Path to write execution logs (default: sentinel.log when flag is passed without argument)")
	scanCmd.Flags().Lookup("log-file").NoOptDefVal = "sentinel.log"
	scanCmd.Flags().StringVar(&scanOpts.FailOn, "fail-on", "high", "Fail with non-zero exit code if confirmed findings meet severity ('critical', 'high', 'medium', 'any', 'none')")
	scanCmd.Flags().IntVarP(&scanOpts.Workers, "workers", "w", 0, "Number of concurrent goroutines for file analysis (default 2*CPU)")

	return scanCmd
}

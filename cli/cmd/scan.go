package cmd

import (
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"github.com/sentinel-sast/sentinel/cli/internal/client"
	"github.com/sentinel-sast/sentinel/cli/internal/model"
	"github.com/sentinel-sast/sentinel/cli/internal/scanner"
)

// ScanOptions configures directory scanning parameters.
type ScanOptions struct {
	FailOn  string
	Workers int
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

Use --export=json to intercept the cloud transmission and dump normalized results locally.`,
		Args: cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			opts.Reporter.PrintBanner(Version)

			targetDir := "."
			if len(args) > 0 && strings.TrimSpace(args[0]) != "" {
				targetDir = args[0]
			}

			absTarget, err := filepath.Abs(targetDir)
			if err != nil {
				return fmt.Errorf("failed resolving target path '%s': %w", targetDir, err)
			}

			fmt.Fprintf(cmd.OutOrStdout(), "[+] Initializing Sentinel SAST Engine v%s\n", Version)
			fmt.Fprintf(cmd.OutOrStdout(), "[+] Scanning target: %s\n", absTarget)

			// Instantiate orchestrator with concurrent worker pool
			scanEngine := scanner.NewScanner(Version, scanner.WithWorkers(scanOpts.Workers))

			// Orchestrate scanning engines and concurrent AST traversal
			payload, err := scanEngine.ScanDirectory(cmd.Context(), absTarget)
			if err != nil {
				return fmt.Errorf("scan failed: %w", err)
			}

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
					return fmt.Errorf("failed exporting report: %w", err)
				}
				fmt.Fprintf(cmd.OutOrStdout(), "[✓] Intercepted cloud API request: Normalized vulnerability report saved to:\n    %s\n\n", exportPath)
				return nil
			}

			// Require local Viper-persisted API key for Cloud verification
			apiKey := opts.ConfigMgr.GetAPIKey()
			if apiKey == "" {
				return fmt.Errorf("authentication required: Sentinel API key not found in Viper config. Run 'sentinel login' or set SENTINEL_API_KEY environment variable")
			}

			apiURL := opts.ConfigMgr.GetAPIURL()
			fmt.Fprintf(cmd.OutOrStdout(), "[+] Transmitting payload to Sentinel Cloud (%s) for Taint Graph & LLM verification...\n\n", apiURL)

			// Authenticated HTTP client using native net/http
			c := client.NewClient(apiURL, apiKey, 60*time.Second)
			resp, err := c.SubmitScan(cmd.Context(), payload)
			if err != nil {
				return fmt.Errorf("cloud verification failed: %w", err)
			}

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
					return fmt.Errorf("CI/CD pipeline security gate failed: %d confirmed vulnerability/vulnerabilities found exceeding severity threshold '%s'", failingFindings, scanOpts.FailOn)
				}
			}

			fmt.Fprintf(cmd.OutOrStdout(), "[✓] Security gate passed: 0 blocking vulnerabilities detected.\n")
			return nil
		},
	}

	scanCmd.Flags().StringVar(&opts.Export, "export", "", "Export raw normalized JSON report locally, intercepting cloud request (e.g. --export=json)")
	scanCmd.Flags().StringVar(&scanOpts.FailOn, "fail-on", "high", "Fail with non-zero exit code if confirmed findings meet severity ('critical', 'high', 'medium', 'any', 'none')")
	scanCmd.Flags().IntVarP(&scanOpts.Workers, "workers", "w", 0, "Number of concurrent goroutines for file analysis (default 2*CPU)")

	return scanCmd
}

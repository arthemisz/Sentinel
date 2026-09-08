package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/sentinel-sast/sentinel/cli/internal/config"
	"github.com/sentinel-sast/sentinel/cli/internal/reporter"
)

// Version represents the Sentinel CLI version.
const Version = "2.4.0"

// RootOptions holds global CLI configuration and flags.
type RootOptions struct {
	ConfigFile string
	Export     string
	APIURL     string
	ConfigMgr  *config.Manager
	Reporter   *reporter.Reporter
}

// NewRootCmd constructs the primary Cobra command for Sentinel CLI.
func NewRootCmd() *cobra.Command {
	opts := &RootOptions{
		ConfigMgr: config.NewManager(),
		Reporter:  reporter.NewReporter(os.Stdout),
	}

	rootCmd := &cobra.Command{
		Use:   "sentinel",
		Short: "Sentinel SAST: Enterprise Static Application Security Testing CLI",
		Long: `Sentinel CLI is the local high-performance static analysis execution engine
for the Sentinel SAST platform. It performs concurrent AST traversal, deterministic
taint flow analysis, and orchestrates cloud-based LLM exploitability verification.`,
		SilenceUsage:  true,
		SilenceErrors: true,
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			if err := opts.ConfigMgr.Init(opts.ConfigFile); err != nil {
				return fmt.Errorf("failed initializing configuration: %w", err)
			}
			if opts.APIURL != "" {
				opts.ConfigMgr.SetAPIURL(opts.APIURL)
			}
			return nil
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			opts.Reporter.PrintBanner(Version)
			return cmd.Help()
		},
	}

	// Persistent flags
	rootCmd.PersistentFlags().StringVar(&opts.ConfigFile, "config", "", "Path to configuration file (default is $HOME/.sentinel/config.yaml)")
	rootCmd.PersistentFlags().StringVar(&opts.Export, "export", "", "Export raw normalized JSON report locally, intercepting cloud request (e.g. --export=json)")
	rootCmd.PersistentFlags().StringVar(&opts.APIURL, "api-url", "", "Override Sentinel Cloud API endpoint URL")

	// Register subcommands
	rootCmd.AddCommand(NewLoginCmd(opts))
	rootCmd.AddCommand(NewScanCmd(opts))

	return rootCmd
}

// Execute is the main entrypoint called by cmd/sentinel/main.go.
func Execute() error {
	rootCmd := NewRootCmd()
	return rootCmd.Execute()
}

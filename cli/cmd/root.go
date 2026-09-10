package cmd

import (
	"fmt"
	"io"
	"os"

	"github.com/spf13/cobra"
	"github.com/sentinel-sast/sentinel/cli/internal/config"
	"github.com/sentinel-sast/sentinel/cli/internal/logger"
	"github.com/sentinel-sast/sentinel/cli/internal/reporter"
)

// Version represents the Sentinel CLI version.
const Version = "2.4.0"

// RootOptions holds global CLI configuration and flags.
type RootOptions struct {
	ConfigFile string
	Export     string
	APIURL     string
	LogFile    string
	ConfigMgr  *config.Manager
	Reporter   *reporter.Reporter
	Logger     *logger.Logger
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
			if err := InitLogger(cmd, opts); err != nil {
				return err
			}
			if opts.Logger != nil {
				opts.Logger.Infof("Sentinel SAST CLI v%s initialized (command: %s)", Version, cmd.Name())
			}
			return nil
		},
		PersistentPostRunE: func(cmd *cobra.Command, args []string) error {
			if opts.Logger != nil {
				opts.Logger.Infof("Sentinel command '%s' completed successfully", cmd.Name())
				return opts.Logger.Close()
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
	rootCmd.PersistentFlags().StringVar(&opts.LogFile, "log-file", "", "Path to write execution logs (default is sentinel.log when flag is passed without value)")
	rootCmd.PersistentFlags().Lookup("log-file").NoOptDefVal = "sentinel.log"

	// Register subcommands
	rootCmd.AddCommand(NewLoginCmd(opts))
	rootCmd.AddCommand(NewScanCmd(opts))

	return rootCmd
}

// InitLogger initializes the file logger if specified via flag or config.
func InitLogger(cmd *cobra.Command, opts *RootOptions) error {
	if opts.Logger != nil {
		return nil
	}

	logTarget := opts.LogFile
	if logTarget == "" && cmd != nil {
		if logFlag, err := cmd.Flags().GetString("log-file"); err == nil && logFlag != "" {
			logTarget = logFlag
		}
	}
	if logTarget == "" && opts.ConfigMgr != nil {
		logTarget = opts.ConfigMgr.GetLogFile()
	}

	if logTarget == "" {
		return nil
	}

	l, err := logger.New(logTarget)
	if err != nil {
		return fmt.Errorf("failed initializing log file '%s': %w", logTarget, err)
	}

	opts.Logger = l
	if opts.Reporter != nil {
		opts.Reporter.SetOutput(io.MultiWriter(opts.Reporter.GetOutput(), l))
	}
	if cmd != nil {
		cmd.SetOut(io.MultiWriter(cmd.OutOrStdout(), l))
	}

	return nil
}

// Execute is the main entrypoint called by cmd/sentinel/main.go.
func Execute() error {
	rootCmd := NewRootCmd()
	return rootCmd.Execute()
}


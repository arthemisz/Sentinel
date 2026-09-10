package cmd

import (
	"bufio"
	"fmt"
	"strings"

	"github.com/spf13/cobra"
)

// NewLoginCmd creates the Cobra subcommand for authenticating developer credentials.
func NewLoginCmd(opts *RootOptions) *cobra.Command {
	var apiKeyFlag string

	loginCmd := &cobra.Command{
		Use:   "login",
		Short: "Authenticate developer with Sentinel Cloud Platform",
		Long: `Prompts for your Sentinel Cloud API key and securely persists the credential
locally into your user configuration directory using Viper.`,
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

			key := strings.TrimSpace(apiKeyFlag)
			if key == "" {
				// Prompt developer interactively
				fmt.Fprint(cmd.OutOrStdout(), "Enter your Sentinel Cloud Platform API Key: ")
				reader := bufio.NewReader(cmd.InOrStdin())
				input, err := reader.ReadString('\n')
				if err != nil {
					opts.Logger.Errorf("Failed reading API key from input: %v", err)
					return fmt.Errorf("failed reading API key from input: %w", err)
				}
				key = strings.TrimSpace(input)
			}

			key = strings.Trim(key, "\"'`")

			if key == "" {
				opts.Logger.Errorf("API key cannot be empty")
				return fmt.Errorf("API key cannot be empty")
			}

			if strings.Contains(key, "•") || strings.Contains(key, "?") {
				opts.Logger.Errorf("Invalid API key format: Key contains masked characters")
				return fmt.Errorf("invalid API key: key contains masked placeholder characters (• or ?). Please copy the full unmasked API key from your Sentinel account menu")
			}

			// Persist credential using Viper
			opts.ConfigMgr.SetAPIKey(key)
			if err := opts.ConfigMgr.Save(); err != nil {
				opts.Logger.Errorf("Failed to securely persist API key: %v", err)
				return fmt.Errorf("failed to securely persist API key: %w", err)
			}

			opts.Logger.Infof("Developer successfully authenticated with Sentinel Cloud (config: %s)", opts.ConfigMgr.ConfigPath())
			fmt.Fprintf(cmd.OutOrStdout(), "\n[✓] Successfully authenticated with Sentinel Cloud!\n")
			fmt.Fprintf(cmd.OutOrStdout(), "[✓] API credential saved securely to: %s\n\n", opts.ConfigMgr.ConfigPath())
			return nil
		},
	}

	loginCmd.Flags().StringVarP(&apiKeyFlag, "key", "k", "", "Sentinel Cloud Platform API key (non-interactive)")
	loginCmd.Flags().StringVar(&apiKeyFlag, "api-key", "", "Alias for --key")

	return loginCmd
}

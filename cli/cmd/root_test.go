package cmd

import (
	"bytes"
	"testing"
)

func TestNewRootCmd_StructureAndFlags(t *testing.T) {
	rootCmd := NewRootCmd()

	if rootCmd.Use != "sentinel" {
		t.Errorf("expected command use 'sentinel', got '%s'", rootCmd.Use)
	}

	// Verify RunE is used
	if rootCmd.RunE == nil {
		t.Errorf("expected RunE to be set on root command")
	}

	// Verify persistent flags
	if rootCmd.PersistentFlags().Lookup("config") == nil {
		t.Errorf("expected --config flag")
	}
	if rootCmd.PersistentFlags().Lookup("export") == nil {
		t.Errorf("expected --export flag")
	}
	if rootCmd.PersistentFlags().Lookup("api-url") == nil {
		t.Errorf("expected --api-url flag")
	}

	// Verify subcommands registered
	foundLogin := false
	foundScan := false
	for _, sub := range rootCmd.Commands() {
		if sub.Name() == "login" {
			foundLogin = true
			if sub.RunE == nil {
				t.Errorf("expected RunE on login subcommand")
			}
		}
		if sub.Name() == "scan" {
			foundScan = true
			if sub.RunE == nil {
				t.Errorf("expected RunE on scan subcommand")
			}
		}
	}

	if !foundLogin {
		t.Errorf("expected 'login' subcommand to be registered")
	}
	if !foundScan {
		t.Errorf("expected 'scan' subcommand to be registered")
	}
}

func TestRootCmd_HelpOutput(t *testing.T) {
	rootCmd := NewRootCmd()
	var out bytes.Buffer
	rootCmd.SetOut(&out)
	rootCmd.SetArgs([]string{"--help"})

	err := rootCmd.Execute()
	if err != nil {
		t.Fatalf("unexpected error executing root help: %v", err)
	}

	output := out.String()
	if !bytes.Contains(out.Bytes(), []byte("sentinel")) {
		t.Errorf("expected help output to contain 'sentinel', got: %s", output)
	}
}

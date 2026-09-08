package cmd

import (
	"bytes"
	"path/filepath"
	"testing"

	"github.com/sentinel-sast/sentinel/cli/internal/config"
	"github.com/sentinel-sast/sentinel/cli/internal/reporter"
)

func TestLoginCmd_FlagInput(t *testing.T) {
	tempDir := t.TempDir()
	cfgFile := filepath.Join(tempDir, "config.yaml")

	cfgMgr := config.NewManager()
	_ = cfgMgr.Init(cfgFile)

	var out bytes.Buffer
	opts := &RootOptions{
		ConfigFile: cfgFile,
		ConfigMgr:  cfgMgr,
		Reporter:   reporter.NewReporter(&out),
	}

	cmd := NewLoginCmd(opts)
	cmd.SetOut(&out)
	cmd.SetArgs([]string{"--key", "snt_test_flag_token_12345"})

	err := cmd.Execute()
	if err != nil {
		t.Fatalf("unexpected error executing login with flag: %v", err)
	}

	if got := cfgMgr.GetAPIKey(); got != "snt_test_flag_token_12345" {
		t.Errorf("expected API key to be saved in Viper, got '%s'", got)
	}
}

func TestLoginCmd_PromptInput(t *testing.T) {
	tempDir := t.TempDir()
	cfgFile := filepath.Join(tempDir, "config.yaml")

	cfgMgr := config.NewManager()
	_ = cfgMgr.Init(cfgFile)

	var out bytes.Buffer
	opts := &RootOptions{
		ConfigFile: cfgFile,
		ConfigMgr:  cfgMgr,
		Reporter:   reporter.NewReporter(&out),
	}

	cmd := NewLoginCmd(opts)
	cmd.SetOut(&out)
	// Simulate user typing key followed by newline
	cmd.SetIn(bytes.NewBufferString("snt_test_interactive_key\n"))

	err := cmd.Execute()
	if err != nil {
		t.Fatalf("unexpected error executing interactive login: %v", err)
	}

	if got := cfgMgr.GetAPIKey(); got != "snt_test_interactive_key" {
		t.Errorf("expected API key saved in Viper, got '%s'", got)
	}
}

func TestLoginCmd_EmptyKeyFails(t *testing.T) {
	tempDir := t.TempDir()
	cfgFile := filepath.Join(tempDir, "config.yaml")

	cfgMgr := config.NewManager()
	_ = cfgMgr.Init(cfgFile)

	var out bytes.Buffer
	opts := &RootOptions{
		ConfigFile: cfgFile,
		ConfigMgr:  cfgMgr,
		Reporter:   reporter.NewReporter(&out),
	}

	cmd := NewLoginCmd(opts)
	cmd.SetOut(&out)
	cmd.SetIn(bytes.NewBufferString("   \n"))

	err := cmd.Execute()
	if err == nil {
		t.Fatalf("expected error when entering empty API key, got nil")
	}
}

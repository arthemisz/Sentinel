package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestConfigManager_InitAndSave(t *testing.T) {
	tempDir := t.TempDir()
	tempConfigFile := filepath.Join(tempDir, "test_config.yaml")

	mgr := NewManager()
	if err := mgr.Init(tempConfigFile); err != nil {
		t.Fatalf("unexpected error initializing config: %v", err)
	}

	testKey := "snt_live_test_api_key_12345"
	testURL := "https://api.sentinel-sast.internal/v1/scan"

	mgr.SetAPIKey(testKey)
	mgr.SetAPIURL(testURL)

	if err := mgr.Save(); err != nil {
		t.Fatalf("failed to save config: %v", err)
	}

	// Verify file was written
	if _, err := os.Stat(tempConfigFile); os.IsNotExist(err) {
		t.Fatalf("config file was not created at %s", tempConfigFile)
	}

	// Read back in a fresh manager instance
	mgr2 := NewManager()
	if err := mgr2.Init(tempConfigFile); err != nil {
		t.Fatalf("failed to reload config file: %v", err)
	}

	if got := mgr2.GetAPIKey(); got != testKey {
		t.Errorf("expected API key %s, got %s", testKey, got)
	}

	if got := mgr2.GetAPIURL(); got != testURL {
		t.Errorf("expected API URL %s, got %s", testURL, got)
	}
}

func TestConfigManager_EnvOverride(t *testing.T) {
	tempDir := t.TempDir()
	tempConfigFile := filepath.Join(tempDir, "test_config.yaml")

	mgr := NewManager()
	_ = mgr.Init(tempConfigFile)

	expectedKey := "snt_env_override_999"
	t.Setenv("SENTINEL_API_KEY", expectedKey)

	// Refresh manager with env
	mgrEnv := NewManager()
	_ = mgrEnv.Init(tempConfigFile)

	if got := mgrEnv.GetAPIKey(); got != expectedKey {
		t.Errorf("expected env key %s, got %s", expectedKey, got)
	}
}

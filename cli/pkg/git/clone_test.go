package git

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestCloneRepository_BypassesLocalDirectory(t *testing.T) {
	tempDir := t.TempDir()
	dummyFile := filepath.Join(tempDir, "main.go")
	if err := os.WriteFile(dummyFile, []byte("package main\n"), 0644); err != nil {
		t.Fatalf("failed creating dummy file: %v", err)
	}

	res, err := CloneRepository(context.Background(), tempDir, "")
	if err != nil {
		t.Fatalf("expected successful bypass for local directory, got err: %v", err)
	}

	if !res.IsLocal {
		t.Errorf("expected IsLocal to be true")
	}

	absExpected, _ := filepath.Abs(tempDir)
	if res.TempDir != absExpected {
		t.Errorf("expected TempDir %s, got %s", absExpected, res.TempDir)
	}

	// Calling cleanup should NOT delete the local directory
	res.CleanupFunc()
	if _, err := os.Stat(dummyFile); os.IsNotExist(err) {
		t.Errorf("expected local directory to NOT be deleted by CleanupFunc")
	}
}

func TestCloneRepository_SanitizeOutput(t *testing.T) {
	raw := "remote: Invalid credentials for https://ghp_secretToken12345@github.com/repo.git"
	token := "ghp_secretToken12345"
	sanitized := sanitizeOutput(raw, token)

	if sanitized == raw {
		t.Errorf("expected token to be sanitized from output")
	}
	if sanitized != "remote: Invalid credentials for https://***@github.com/repo.git" {
		t.Errorf("unexpected sanitized output: %s", sanitized)
	}
}

func TestPrepareTarget_LocalBypass(t *testing.T) {
	tempDir := t.TempDir()
	targetPath, isTemp, err := PrepareTarget(context.Background(), tempDir, CloneOptions{Depth: 1})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if isTemp {
		t.Errorf("expected isTemp to be false for local directory")
	}
	absExpected, _ := filepath.Abs(tempDir)
	if targetPath != absExpected {
		t.Errorf("expected targetPath %s, got %s", absExpected, targetPath)
	}
}

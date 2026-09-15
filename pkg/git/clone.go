package git

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// CloneResult holds the temporary directory path, a flag indicating if local,
// and a cleanup function that MUST be deferred immediately after a successful clone.
type CloneResult struct {
	TempDir     string
	CleanupFunc func()
	IsLocal     bool
}

// CloneOptions defines optional parameters when cloning or preparing a target repository.
type CloneOptions struct {
	Depth     int
	AuthToken string
}

// PrepareTarget resolves a target path or URL. If target is a local directory, it bypasses Git.
// If target is a remote repository, it shallowly clones it into a secure temporary directory.
func PrepareTarget(ctx context.Context, target string, opts CloneOptions) (targetPath string, isTemp bool, err error) {
	// If the target is already a local directory path, bypass Git entirely and scan directly
	if info, err := os.Stat(target); err == nil && info.IsDir() {
		absPath, err := filepath.Abs(target)
		if err != nil {
			absPath = target
		}
		return absPath, false, nil
	}

	tempDir, err := os.MkdirTemp("", "sentinel-scan-*")
	if err != nil {
		return "", false, fmt.Errorf("failed to create temporary scan directory: %w", err)
	}

	depth := opts.Depth
	if depth <= 0 {
		depth = 1
	}

	// Apply authentication token to clone URL if provided
	authURL := target
	if opts.AuthToken != "" {
		authURL = strings.Replace(target, "https://", fmt.Sprintf("https://%s@", opts.AuthToken), 1)
	}

	// Execute git clone with ultra-fast 45-second timeout and shallow single-branch flags
	cloneCtx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()

	cmd := exec.CommandContext(cloneCtx, "git", "clone", "--depth", fmt.Sprintf("%d", depth), "--single-branch", authURL, tempDir)

	// Capture combined output for error diagnostics
	output, err := cmd.CombinedOutput()
	if err != nil {
		// Immediately clean up on clone failure before returning error
		_ = os.RemoveAll(tempDir)
		// Sanitize output to avoid leaking auth tokens in error messages
		sanitized := sanitizeOutput(string(output), opts.AuthToken)
		return "", false, fmt.Errorf("git clone failed for %s: %s: %w", target, sanitized, err)
	}

	return tempDir, true, nil
}

// CloneRepository performs an ultra-fast, shallow, single-branch git clone
// into a randomly generated OS temporary directory.
func CloneRepository(ctx context.Context, target string, authToken string) (*CloneResult, error) {
	targetPath, isTemp, err := PrepareTarget(ctx, target, CloneOptions{
		Depth:     1,
		AuthToken: authToken,
	})
	if err != nil {
		return nil, err
	}

	cleanup := func() {}
	if isTemp {
		cleanup = func() {
			_ = os.RemoveAll(targetPath)
		}
	}

	return &CloneResult{
		TempDir:     targetPath,
		CleanupFunc: cleanup,
		IsLocal:     !isTemp,
	}, nil
}

// sanitizeOutput removes auth tokens from git output to prevent credential leakage.
func sanitizeOutput(output, token string) string {
	if token == "" {
		return output
	}
	return strings.ReplaceAll(output, token, "***")
}

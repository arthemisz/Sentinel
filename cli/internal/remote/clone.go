package remote

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

// CloneResult holds the temporary directory path and a cleanup function
// that MUST be deferred immediately after a successful clone to guarantee
// the temporary directory is removed on any exit path.
type CloneResult struct {
	TempDir     string
	CleanupFunc func()
}

// CloneRepository performs a shallow (depth=1) git clone of the target repository
// into a randomly generated OS temporary directory. If authToken is provided,
// it is embedded in the clone URL for private repository access.
//
// The returned CleanupFunc MUST be deferred by the caller to ensure the temporary
// directory is completely removed via os.RemoveAll, leaving zero residual footprint.
func CloneRepository(ctx context.Context, cloneURL string, authToken string) (*CloneResult, error) {
	tempDir, err := os.MkdirTemp("", "sentinel-scan-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temporary scan directory: %w", err)
	}

	// Cleanup function guarantees directory removal on any exit path
	cleanup := func() {
		fmt.Fprintf(os.Stderr, "[+] Removing temporary scan directory: %s\n", tempDir)
		if err := os.RemoveAll(tempDir); err != nil {
			fmt.Fprintf(os.Stderr, "[!] Warning: failed to remove temp directory %s: %v\n", tempDir, err)
		}
	}

	// Apply authentication token to clone URL if provided
	authURL := cloneURL
	if authToken != "" {
		authURL = strings.Replace(cloneURL, "https://", fmt.Sprintf("https://%s@", authToken), 1)
	}

	// Execute git clone with 120-second timeout
	cloneCtx, cancel := context.WithTimeout(ctx, 120*time.Second)
	defer cancel()

	cmd := exec.CommandContext(cloneCtx, "git", "clone", "--depth", "1", authURL, tempDir)

	// Capture combined output for error diagnostics
	output, err := cmd.CombinedOutput()
	if err != nil {
		// Immediately clean up on clone failure before returning error
		cleanup()
		// Sanitize output to avoid leaking auth tokens in error messages
		sanitized := sanitizeOutput(string(output), authToken)
		return nil, fmt.Errorf("git clone failed for %s: %s: %w", cloneURL, sanitized, err)
	}

	return &CloneResult{
		TempDir:     tempDir,
		CleanupFunc: cleanup,
	}, nil
}

// sanitizeOutput removes auth tokens from git output to prevent credential leakage.
func sanitizeOutput(output, token string) string {
	if token == "" {
		return output
	}
	return strings.ReplaceAll(output, token, "***")
}

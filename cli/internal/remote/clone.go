package remote

import (
	"context"

	"github.com/sentinel-sast/sentinel/cli/pkg/git"
)

// CloneResult aliases git.CloneResult for seamless backward compatibility.
type CloneResult = git.CloneResult

// CloneOptions aliases git.CloneOptions for configuring depth and auth.
type CloneOptions = git.CloneOptions

// CloneRepository performs a shallow (depth=1, single-branch) clone with 45s timeout,
// or directly bypasses Git if target is a local directory path.
func CloneRepository(ctx context.Context, cloneURL string, authToken string) (*CloneResult, error) {
	return git.CloneRepository(ctx, cloneURL, authToken)
}

// PrepareTarget resolves a target path or URL, cloning shallowly if remote.
func PrepareTarget(ctx context.Context, target string, opts CloneOptions) (string, bool, error) {
	return git.PrepareTarget(ctx, target, opts)
}

package scanner

import (
	"bytes"
	"context"
	"os/exec"
	"strings"
	"time"

	"github.com/sentinel-sast/sentinel/cli/internal/model"
)

// ExtractGitContext executes git via os/exec to obtain repository metadata.
func ExtractGitContext(ctx context.Context, targetDir string) model.GitContext {
	ctxTimeout, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	gitCtx := model.GitContext{}

	// Extract Current Branch
	if branch, err := runGitCmd(ctxTimeout, targetDir, "rev-parse", "--abbrev-ref", "HEAD"); err == nil {
		gitCtx.Branch = branch
	}

	// Extract Commit Hash
	if commit, err := runGitCmd(ctxTimeout, targetDir, "rev-parse", "HEAD"); err == nil {
		gitCtx.Commit = commit
	}

	// Extract Remote Origin URL
	if repo, err := runGitCmd(ctxTimeout, targetDir, "config", "--get", "remote.origin.url"); err == nil {
		gitCtx.Repository = repo
	}

	// Extract Author of HEAD commit
	if author, err := runGitCmd(ctxTimeout, targetDir, "log", "-1", "--pretty=format:%an <%ae>"); err == nil {
		gitCtx.Author = author
	}

	return gitCtx
}

func runGitCmd(ctx context.Context, dir string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, "git", args...)
	cmd.Dir = dir
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", err
	}

	return strings.TrimSpace(stdout.String()), nil
}

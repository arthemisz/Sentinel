package remote

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
)

// RepoInfo contains parsed GitHub repository metadata.
type RepoInfo struct {
	Owner     string
	Repo      string
	FullURL   string
	CloneURL  string
	IsPrivate bool
}

// gitHubURLPattern matches GitHub repository URLs.
var gitHubURLPattern = regexp.MustCompile(`^https?://github\.com/[^/]+/[^/]+`)

// IsGitHubURL returns true if the input looks like a GitHub repository URL.
func IsGitHubURL(input string) bool {
	return gitHubURLPattern.MatchString(input)
}

// ParseGitHubURL extracts owner and repo from a GitHub URL.
// Handles URLs with trailing slashes, .git suffixes, and sub-paths like /tree/main/...
func ParseGitHubURL(rawURL string) (*RepoInfo, error) {
	url := strings.TrimRight(rawURL, "/")
	url = strings.TrimSuffix(url, ".git")

	parts := strings.Split(url, "github.com/")
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid GitHub URL: cannot extract path from '%s'", rawURL)
	}

	pathParts := strings.Split(parts[1], "/")
	if len(pathParts) < 2 || pathParts[0] == "" || pathParts[1] == "" {
		return nil, fmt.Errorf("could not extract owner and repo from URL: '%s'", rawURL)
	}

	owner := pathParts[0]
	repo := pathParts[1]

	return &RepoInfo{
		Owner:    owner,
		Repo:     repo,
		FullURL:  rawURL,
		CloneURL: fmt.Sprintf("https://github.com/%s/%s.git", owner, repo),
	}, nil
}

// CheckRepoVisibility checks if a GitHub repository is private using the public API.
// Returns true if the repository is private, false if public.
func CheckRepoVisibility(ctx context.Context, owner, repo string) (bool, error) {
	return CheckRepoVisibilityWithToken(ctx, owner, repo, "")
}

// CheckRepoVisibilityWithToken checks repository visibility with an optional auth token.
// A 404 response is interpreted as a private repository (not accessible without auth).
func CheckRepoVisibilityWithToken(ctx context.Context, owner, repo, token string) (bool, error) {
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s", owner, repo)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return false, fmt.Errorf("failed to create GitHub API request: %w", err)
	}

	req.Header.Set("User-Agent", "Sentinel-SAST-CLI")
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	if token != "" {
		req.Header.Set("Authorization", "token "+token)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return false, fmt.Errorf("failed to query GitHub API: %w", err)
	}
	defer resp.Body.Close()

	// 404 means the repo is either private or doesn't exist
	if resp.StatusCode == http.StatusNotFound {
		return true, nil
	}

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("GitHub API returned unexpected status %d for %s/%s", resp.StatusCode, owner, repo)
	}

	var result struct {
		Private bool `json:"private"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, fmt.Errorf("failed to decode GitHub API response: %w", err)
	}

	return result.Private, nil
}

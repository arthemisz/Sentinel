package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/sentinel-sast/sentinel/cli/internal/model"
)

// Client handles authenticated HTTP communication with Sentinel Cloud API.
type Client struct {
	httpClient *http.Client
	endpoint   string
	apiKey     string
}

// NewClient initializes a native net/http client for Sentinel Cloud communications.
func NewClient(endpoint, apiKey string, timeout time.Duration) *Client {
	if timeout <= 0 {
		timeout = 45 * time.Second
	}

	return &Client{
		httpClient: &http.Client{
			Timeout: timeout,
		},
		endpoint: endpoint,
		apiKey:   apiKey,
	}
}

// SubmitScan transmits the normalized scan payload and API key for cloud Taint Graph & LLM verification.
func (c *Client) SubmitScan(ctx context.Context, payload *model.ScanPayload) (*model.CloudScanResponse, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("authentication required: API key is missing. Run 'sentinel login' or set SENTINEL_API_KEY")
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize scan payload to JSON: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to construct HTTP request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("X-API-Key", c.apiKey)
	req.Header.Set("User-Agent", "Sentinel-CLI/"+payload.EngineVersion)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Sentinel Cloud API at %s: %w", c.endpoint, err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed reading response body from Sentinel Cloud: %w", err)
	}

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return nil, fmt.Errorf("authentication failed (HTTP %d): invalid or expired Sentinel API key", resp.StatusCode)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var errResp struct {
			Error string `json:"error"`
		}
		_ = json.Unmarshal(respBytes, &errResp)
		if errResp.Error != "" {
			return nil, fmt.Errorf("cloud API error (HTTP %d): %s", resp.StatusCode, errResp.Error)
		}
		return nil, fmt.Errorf("cloud API returned unexpected HTTP status %d: %s", resp.StatusCode, string(respBytes))
	}

	var cloudResp model.CloudScanResponse
	if err := json.Unmarshal(respBytes, &cloudResp); err != nil {
		return nil, fmt.Errorf("failed decoding cloud verification JSON: %w (raw response: %s)", err, string(respBytes))
	}

	return &cloudResp, nil
}

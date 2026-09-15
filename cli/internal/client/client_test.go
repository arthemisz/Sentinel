package client

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/sentinel-sast/sentinel/cli/internal/model"
)

func TestClient_SubmitScan_Success(t *testing.T) {
	expectedAPIKey := "snt_secret_test_token_777"
	var receivedAuthHeader string
	var receivedBody model.ScanPayload

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedAuthHeader = r.Header.Get("Authorization")
		if err := json.NewDecoder(r.Body).Decode(&receivedBody); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		resp := model.CloudScanResponse{
			Success:    true,
			ScanID:     "scn_test_123",
			Status:     "COMPLETED",
			VerifiedAt: time.Now().UTC().Format(time.RFC3339),
			Summary: model.VerificationSummary{
				TotalCandidatePaths:    1,
				ConfirmedTruePositives: 1,
			},
			Findings: []model.VerifiedFinding{
				{
					Finding:      receivedBody.Findings[0],
					Verdict:      "CONFIRMED_TRUE_POSITIVE",
					Confidence:   0.998,
					LLMReasoning: "Exploit path mathematically verified",
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	c := NewClient(server.URL, expectedAPIKey, 5*time.Second)

	payload := model.NewScanPayload(".", "2.4.0")
	payload.Findings = append(payload.Findings, model.Finding{
		ID:       "CWE-89-1",
		Title:    "SQL Injection",
		CWE:      "CWE-89",
		Severity: model.SeverityCritical,
	})

	cloudResp, err := c.SubmitScan(context.Background(), payload)
	if err != nil {
		t.Fatalf("unexpected error submitting scan: %v", err)
	}

	if !cloudResp.Success {
		t.Errorf("expected success=true")
	}

	if !strings.Contains(receivedAuthHeader, expectedAPIKey) {
		t.Errorf("expected Authorization header to contain %s, got %s", expectedAPIKey, receivedAuthHeader)
	}

	if len(cloudResp.Findings) != 1 || cloudResp.Findings[0].Verdict != "CONFIRMED_TRUE_POSITIVE" {
		t.Errorf("unexpected verified findings: %+v", cloudResp.Findings)
	}
}

func TestClient_SubmitScan_Unauthorized(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
	}))
	defer server.Close()

	c := NewClient(server.URL, "invalid_key", 5*time.Second)
	payload := model.NewScanPayload(".", "2.4.0")

	_, err := c.SubmitScan(context.Background(), payload)
	if err == nil {
		t.Fatalf("expected error on unauthorized response, got nil")
	}

	if !strings.Contains(err.Error(), "authentication failed") {
		t.Errorf("expected auth failure error message, got %v", err)
	}
}

func TestClient_SubmitScan_MissingKey(t *testing.T) {
	c := NewClient("http://localhost:3000/api/scan", "", 5*time.Second)
	payload := model.NewScanPayload(".", "2.4.0")

	_, err := c.SubmitScan(context.Background(), payload)
	if err == nil {
		t.Fatalf("expected error when API key is missing, got nil")
	}

	if !strings.Contains(err.Error(), "authentication required") {
		t.Errorf("expected missing key message, got %v", err)
	}
}

func TestClient_SynchronizeScan(t *testing.T) {
	var requestedURL string
	var authHeader string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedURL = r.URL.String()
		authHeader = r.Header.Get("Authorization")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"success":true}`))
	}))
	defer server.Close()

	c := NewClient(server.URL, "test_api_key", 5*time.Second)
	err := c.SynchronizeScan(context.Background(), "scn_12345")
	if err != nil {
		t.Fatalf("unexpected error during SynchronizeScan: %v", err)
	}

	if !strings.Contains(requestedURL, "scanId=scn_12345") {
		t.Errorf("expected URL to contain scanId=scn_12345, got %s", requestedURL)
	}

	if !strings.Contains(authHeader, "test_api_key") {
		t.Errorf("expected auth header to contain api key, got %s", authHeader)
	}

	// Empty scan ID should return nil immediately
	if err := c.SynchronizeScan(context.Background(), ""); err != nil {
		t.Errorf("expected empty scanID to succeed with nil, got %v", err)
	}
}


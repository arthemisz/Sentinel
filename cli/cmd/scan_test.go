package cmd

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/sentinel-sast/sentinel/cli/internal/config"
	"github.com/sentinel-sast/sentinel/cli/internal/model"
	"github.com/sentinel-sast/sentinel/cli/internal/reporter"
)

func TestScanCmd_ExportInterceptsCloud(t *testing.T) {
	tempDir := t.TempDir()
	origWd, _ := os.Getwd()
	defer os.Chdir(origWd)
	_ = os.Chdir(tempDir)

	// Create a dummy source file
	testFile := filepath.Join(tempDir, "app.py")
	_ = os.WriteFile(testFile, []byte("import yaml\nobj = yaml.load(payload, Loader=yaml.Loader)\n"), 0644)

	cfgMgr := config.NewManager()
	var out bytes.Buffer

	opts := &RootOptions{
		Export:    "test-report.json",
		ConfigMgr: cfgMgr,
		Reporter:  reporter.NewReporter(&out),
	}

	cmd := NewScanCmd(opts)
	cmd.SetOut(&out)
	cmd.SetArgs([]string{tempDir, "--export=test-report.json"})

	err := cmd.Execute()
	if err != nil {
		t.Fatalf("unexpected error running scan with --export: %v", err)
	}

	// Verify exported file exists locally
	exportedPath := filepath.Join(tempDir, "test-report.json")
	if _, err := os.Stat(exportedPath); os.IsNotExist(err) {
		t.Fatalf("expected export file %s to exist", exportedPath)
	}

	content, err := os.ReadFile(exportedPath)
	if err != nil {
		t.Fatalf("failed reading export file: %v", err)
	}

	var payload model.ScanPayload
	if err := json.Unmarshal(content, &payload); err != nil {
		t.Fatalf("failed unmarshaling exported report: %v", err)
	}

	if len(payload.Findings) == 0 {
		t.Errorf("expected detected findings in exported report, got 0")
	}
}

func TestScanCmd_RequiresAuthWhenNotExporting(t *testing.T) {
	tempDir := t.TempDir()

	cfgMgr := config.NewManager() // Empty config without API key
	var out bytes.Buffer

	opts := &RootOptions{
		ConfigMgr: cfgMgr,
		Reporter:  reporter.NewReporter(&out),
	}

	cmd := NewScanCmd(opts)
	cmd.SetOut(&out)
	cmd.SetArgs([]string{tempDir})

	err := cmd.Execute()
	if err == nil {
		t.Fatalf("expected error due to missing API key, got nil")
	}

	if !strings.Contains(err.Error(), "authentication required") {
		t.Errorf("expected authentication error message, got: %v", err)
	}
}

func TestScanCmd_CloudTransmissionAndSecurityGate(t *testing.T) {
	tempDir := t.TempDir()
	origWd, _ := os.Getwd()
	defer os.Chdir(origWd)
	_ = os.Chdir(tempDir)

	// Create test file with SQLi vulnerability
	testFile := filepath.Join(tempDir, "db.ts")
	_ = os.WriteFile(testFile, []byte("const q = req.query.id;\nconst res = await db.query('SELECT * FROM t WHERE id=' + q);\n"), 0644)

	// Mock Next.js Cloud API server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := model.CloudScanResponse{
			Success:    true,
			ScanID:     "scn_unit_test",
			Status:     "COMPLETED",
			VerifiedAt: time.Now().UTC().Format(time.RFC3339),
			Summary: model.VerificationSummary{
				TotalCandidatePaths:    1,
				ConfirmedTruePositives: 1,
				CriticalCount:          1,
			},
			Findings: []model.VerifiedFinding{
				{
					Finding: model.Finding{
						ID:          "CWE-89-1",
						Category:    "Injection",
						Title:       "SQL Injection",
						CWE:         "CWE-89",
						Severity:    model.SeverityCritical,
						FilePath:    "db.ts",
						LineNumber:  2,
						TaintSource: "req.query.id",
						TaintSink:   "db.query()",
					},
					Verdict:      "CONFIRMED_TRUE_POSITIVE",
					Confidence:   0.998,
					LLMReasoning: "SQL concatenation confirmed with direct user input",
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	cfgMgr := config.NewManager()
	cfgMgr.SetAPIKey("snt_valid_unit_test_key")
	cfgMgr.SetAPIURL(server.URL)

	var out bytes.Buffer
	opts := &RootOptions{
		ConfigMgr: cfgMgr,
		Reporter:  reporter.NewReporter(&out),
	}

	// Case 1: scan with --fail-on=high should fail because critical finding is confirmed
	cmd := NewScanCmd(opts)
	cmd.SetOut(&out)
	cmd.SetArgs([]string{tempDir, "--fail-on=high"})

	err := cmd.Execute()
	if err == nil {
		t.Fatalf("expected CI/CD pipeline failure due to confirmed critical vulnerability, got nil")
	}

	if !strings.Contains(err.Error(), "security gate failed") {
		t.Errorf("expected security gate error, got: %v", err)
	}

	// Case 2: scan with --fail-on=none should pass
	cmdPass := NewScanCmd(opts)
	cmdPass.SetOut(&out)
	cmdPass.SetArgs([]string{tempDir, "--fail-on=none"})

	errPass := cmdPass.Execute()
	if errPass != nil {
		t.Fatalf("expected pass with --fail-on=none, got: %v", errPass)
	}
}

package reporter

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/sentinel-sast/sentinel/cli/internal/model"
)

func TestReporter_ExportJSON(t *testing.T) {
	tempDir := t.TempDir()
	origWd, _ := os.Getwd()
	defer os.Chdir(origWd)
	_ = os.Chdir(tempDir)

	rep := NewReporter(nil)
	payload := model.NewScanPayload(tempDir, "2.4.0")
	payload.Findings = append(payload.Findings, model.Finding{
		ID:       "TEST-1",
		Title:    "Test Vulnerability",
		CWE:      "CWE-89",
		Severity: model.SeverityCritical,
	})

	exportedPath, err := rep.ExportJSON(payload, "custom-report.json")
	if err != nil {
		t.Fatalf("unexpected error exporting JSON: %v", err)
	}

	if filepath.Base(exportedPath) != "custom-report.json" {
		t.Errorf("expected filename custom-report.json, got %s", exportedPath)
	}

	content, err := os.ReadFile(exportedPath)
	if err != nil {
		t.Fatalf("failed reading exported JSON file: %v", err)
	}

	var parsed model.ScanPayload
	if err := json.Unmarshal(content, &parsed); err != nil {
		t.Fatalf("failed unmarshaling exported JSON: %v", err)
	}

	if len(parsed.Findings) != 1 || parsed.Findings[0].ID != "TEST-1" {
		t.Errorf("unexpected content in exported payload: %+v", parsed)
	}
}

func TestReporter_PrintCloudVerification(t *testing.T) {
	var buf bytes.Buffer
	rep := NewReporter(&buf)

	resp := &model.CloudScanResponse{
		Success:    true,
		ScanID:     "scn_test_verify",
		Status:     "COMPLETED",
		Summary:    model.VerificationSummary{ConfirmedTruePositives: 1},
		TaintGraph: model.TaintGraphMetrics{NodesEvaluated: 10, EdgesTraversed: 20},
		Findings: []model.VerifiedFinding{
			{
				Finding: model.Finding{
					ID:         "CWE-89-1",
					Title:      "SQL Injection",
					CWE:        "CWE-89",
					Severity:   model.SeverityCritical,
					FilePath:   "src/auth.ts",
					LineNumber: 42,
				},
				Verdict:    "CONFIRMED_TRUE_POSITIVE",
				Confidence: 0.998,
			},
		},
	}

	rep.PrintCloudVerification(resp)

	out := buf.String()
	if !bytes.Contains(buf.Bytes(), []byte("CWE-89")) {
		t.Errorf("expected CWE-89 in output, got: %s", out)
	}
	if !bytes.Contains(buf.Bytes(), []byte("Confirmed")) {
		t.Errorf("expected Confirmed verdict in output, got: %s", out)
	}
}

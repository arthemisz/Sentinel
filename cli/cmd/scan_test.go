package cmd

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
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

func TestScanCmd_LogFileFlag(t *testing.T) {
	tempDir := t.TempDir()
	origWd, _ := os.Getwd()
	defer os.Chdir(origWd)
	_ = os.Chdir(tempDir)

	testFile := filepath.Join(tempDir, "script.py")
	_ = os.WriteFile(testFile, []byte("import os\nos.system(user_input)\n"), 0644)

	var out bytes.Buffer
	cfgMgr := config.NewManager()
	opts := &RootOptions{
		ConfigMgr: cfgMgr,
		Reporter:  reporter.NewReporter(&out),
	}

	cmd := NewScanCmd(opts)
	cmd.SetOut(&out)
	logPath := filepath.Join(tempDir, "execution.log")
	cmd.SetArgs([]string{tempDir, "--export=report.json", "--log-file=" + logPath})

	err := cmd.Execute()
	if err != nil {
		t.Fatalf("unexpected error executing scan with --log-file: %v", err)
	}

	// Verify log file exists
	if _, err := os.Stat(logPath); os.IsNotExist(err) {
		t.Fatalf("expected log file %s to exist", logPath)
	}

	content, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("failed reading log file: %v", err)
	}

	strContent := string(content)
	if !strings.Contains(strContent, "[INFO]") {
		t.Errorf("expected log file to contain '[INFO]', got: %s", strContent)
	}
	if !strings.Contains(strContent, "Scanning target") {
		t.Errorf("expected log file to contain 'Scanning target', got: %s", strContent)
	}
	if !strings.Contains(strContent, "Report exported to JSON") {
		t.Errorf("expected log file to contain 'Report exported to JSON', got: %s", strContent)
	}
}

func TestScanCmd_DefaultLogFile(t *testing.T) {
	tempDir := t.TempDir()
	origWd, _ := os.Getwd()
	defer os.Chdir(origWd)
	_ = os.Chdir(tempDir)

	testFile := filepath.Join(tempDir, "test.py")
	_ = os.WriteFile(testFile, []byte("import subprocess\nsubprocess.Popen(cmd)\n"), 0644)

	var out bytes.Buffer
	cfgMgr := config.NewManager()
	opts := &RootOptions{
		ConfigMgr: cfgMgr,
		Reporter:  reporter.NewReporter(&out),
	}

	cmd := NewScanCmd(opts)
	cmd.SetOut(&out)
	cmd.SetArgs([]string{tempDir, "--export=report.json", "--log-file"})

	err := cmd.Execute()
	if err != nil {
		t.Fatalf("unexpected error executing scan with default --log-file: %v", err)
	}

	defaultLog := filepath.Join(tempDir, "sentinel.log")
	if _, err := os.Stat(defaultLog); os.IsNotExist(err) {
		t.Fatalf("expected default log file %s to exist", defaultLog)
	}

	content, err := os.ReadFile(defaultLog)
	if err != nil {
		t.Fatalf("failed reading default log file: %v", err)
	}

	if len(content) == 0 {
		t.Errorf("expected default log file to not be empty")
	}
}

func TestScanCmd_RealTimeStageDiagnostics(t *testing.T) {
	tempDir := t.TempDir()

	// Add valid source file
	appFile := filepath.Join(tempDir, "app.js")
	_ = os.WriteFile(appFile, []byte("const id = req.query.id;\ndb.query('SELECT ' + id);\n"), 0644)

	// Add vendor / ignored directory that should NOT be parsed
	nmDir := filepath.Join(tempDir, "node_modules", "package")
	_ = os.MkdirAll(nmDir, 0755)
	_ = os.WriteFile(filepath.Join(nmDir, "bloat.js"), []byte("const evil = req.query.x;\ndb.query(evil);\n"), 0644)

	// Mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := model.CloudScanResponse{
			Success:    true,
			ScanID:     "scn_stages_test",
			Status:     "COMPLETED",
			VerifiedAt: time.Now().UTC().Format(time.RFC3339),
			Summary: model.VerificationSummary{
				TotalCandidatePaths:    1,
				ConfirmedTruePositives: 1,
			},
			TaintGraph: model.TaintGraphMetrics{
				NodesEvaluated:            10,
				EdgesTraversed:            20,
				TraversalDurationMs:       15,
				LLMVerificationDurationMs: 120,
			},
			Findings: []model.VerifiedFinding{
				{
					Finding: model.Finding{
						ID:          "CWE-89-1",
						Category:    "Injection",
						Title:       "SQL Injection",
						CWE:         "CWE-89",
						Severity:    model.SeverityMedium,
						FilePath:    "app.js",
						LineNumber:  2,
						TaintSource: "req.query.id",
						TaintSink:   "db.query()",
					},
					Verdict:    "CONFIRMED_TRUE_POSITIVE",
					Confidence: 0.99,
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	var out bytes.Buffer
	cfgMgr := config.NewManager()
	cfgMgr.SetAPIKey("snt_test_key_diagnostics")
	cfgMgr.SetAPIURL(server.URL)

	opts := &RootOptions{
		ConfigMgr: cfgMgr,
		Reporter:  reporter.NewReporter(&out),
	}

	cmd := NewScanCmd(opts)
	cmd.SetOut(&out)
	cmd.SetArgs([]string{tempDir, "--fail-on=critical"})

	err := cmd.Execute()
	if err != nil {
		t.Fatalf("unexpected scan error: %v", err)
	}

	outStr := out.String()

	// Verify all 4 stages are executed with checkmarks and millisecond durations
	expectedStages := []string{
		"[✓] [1/4] Cloning repository shallowly (depth=1)...",
		"[✓] [2/4] Parsing AST & constructing graph layers (Tree-sitter & Rust)...",
		"[✓] [3/4] Tracing taint flows & verifying via Claude 3.5 Sonnet...",
		"[✓] [4/4] Synchronizing scan records to Prisma database...",
	}

	for _, expected := range expectedStages {
		if !strings.Contains(outStr, expected) {
			t.Errorf("expected output to contain %q, output was:\n%s", expected, outStr)
		}
	}

	// Verify milestone durations in ms are present
	if !strings.Contains(outStr, "(0ms)") && !strings.Contains(outStr, "ms)") {
		t.Errorf("expected milestone durations in ms in output, got:\n%s", outStr)
	}

	// Verify only app.js was indexed and node_modules was ignored
	if strings.Contains(outStr, "Indexed 2 files") {
		t.Errorf("expected node_modules to be skipped (only 1 file indexed)")
	}
}

func TestScanCmd_BackgroundClonePulsing(t *testing.T) {
	tempDir := t.TempDir()
	origWd, _ := os.Getwd()
	defer os.Chdir(origWd)
	_ = os.Chdir(tempDir)

	// Create a local git repo
	repoDir := t.TempDir()
	_ = exec.Command("git", "init", repoDir).Run()
	_ = exec.Command("git", "-C", repoDir, "config", "user.email", "test@sentinel.dev").Run()
	_ = exec.Command("git", "-C", repoDir, "config", "user.name", "Sentinel").Run()
	testFile := filepath.Join(repoDir, "app.py")
	_ = os.WriteFile(testFile, []byte("import os\nprint('hello')\n"), 0644)
	_ = exec.Command("git", "-C", repoDir, "add", "app.py").Run()
	_ = exec.Command("git", "-C", repoDir, "commit", "-m", "initial commit").Run()

	cfgMgr := config.NewManager()
	var out bytes.Buffer

	opts := &RootOptions{
		Export:    "test-report.json",
		ConfigMgr: cfgMgr,
		Reporter:  reporter.NewReporter(&out),
	}

	cmd := NewScanCmd(opts)
	cmd.SetOut(&out)
	cmd.SetArgs([]string{repoDir, "--export=test-report.json"})

	err := cmd.Execute()
	if err != nil {
		t.Fatalf("unexpected scan error on git repo: %v", err)
	}

	outStr := out.String()
	if !strings.Contains(outStr, "[SENTINEL CORE]") {
		t.Errorf("expected output to contain [SENTINEL CORE]")
	}
	if !strings.Contains(outStr, "Repository clone complete") && !strings.Contains(outStr, "100%") {
		t.Errorf("expected output to show progress completion")
	}
}



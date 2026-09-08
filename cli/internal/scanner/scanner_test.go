package scanner

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/sentinel-sast/sentinel/cli/internal/model"
)

func TestScanner_ConcurrentScanDirectory(t *testing.T) {
	tempDir := t.TempDir()

	// Create test vulnerable files across multiple languages
	pyFile := filepath.Join(tempDir, "handler.py")
	pyContent := `import yaml
from flask import request

@app.route('/upload')
def upload():
    untrusted_data = request.get_data()
    payload = untrusted_data
    obj = yaml.load(payload, Loader=yaml.Loader)
    return str(obj)
`
	if err := os.WriteFile(pyFile, []byte(pyContent), 0644); err != nil {
		t.Fatalf("failed creating py test file: %v", err)
	}

	tsFile := filepath.Join(tempDir, "auth.ts")
	tsContent := `export async function loginUser(req: Request) {
    const { username, password } = req.body;
    const query = "SELECT * FROM users WHERE username = '" + username + "'";
    const user = await db.query(query);
    return user;
}
`
	if err := os.WriteFile(tsFile, []byte(tsContent), 0644); err != nil {
		t.Fatalf("failed creating ts test file: %v", err)
	}

	goFile := filepath.Join(tempDir, "crypto.go")
	goContent := `package auth

import "crypto/md5"

func HashPassword(password string) []byte {
    h := md5.New()
    h.Write([]byte(password))
    return h.Sum(nil)
}
`
	if err := os.WriteFile(goFile, []byte(goContent), 0644); err != nil {
		t.Fatalf("failed creating go test file: %v", err)
	}

	// Initialize scanner with 4 workers
	s := NewScanner("2.4.0", WithWorkers(4))
	ctx := context.Background()

	payload, err := s.ScanDirectory(ctx, tempDir)
	if err != nil {
		t.Fatalf("unexpected error scanning directory: %v", err)
	}

	if payload.Stats.FilesScanned != 3 {
		t.Errorf("expected 3 files scanned, got %d", payload.Stats.FilesScanned)
	}

	if payload.Stats.LinesOfCode == 0 {
		t.Errorf("expected LOC > 0, got %d", payload.Stats.LinesOfCode)
	}

	if len(payload.Findings) < 3 {
		t.Errorf("expected at least 3 findings detected across files, got %d", len(payload.Findings))
	}

	// Verify CWE presence
	foundCWEs := make(map[string]bool)
	for _, f := range payload.Findings {
		foundCWEs[f.CWE] = true
	}

	if !foundCWEs["CWE-502"] {
		t.Errorf("expected CWE-502 Deserialization finding")
	}
	if !foundCWEs["CWE-89"] {
		t.Errorf("expected CWE-89 SQL Injection finding")
	}
	if !foundCWEs["CWE-328"] {
		t.Errorf("expected CWE-328 Weak Crypto finding")
	}
}

// MockProcessEngine implements DeterministicEngine for test execution
type MockProcessEngine struct {
	name      string
	available bool
	findings  []model.Finding
}

func (m *MockProcessEngine) Name() string { return m.name }
func (m *MockProcessEngine) Available() bool { return m.available }
func (m *MockProcessEngine) Execute(ctx context.Context, dir string) ([]model.Finding, error) {
	return m.findings, nil
}

func TestScanner_WithExternalEngine(t *testing.T) {
	tempDir := t.TempDir()
	testFile := filepath.Join(tempDir, "main.go")
	_ = os.WriteFile(testFile, []byte("package main\nfunc main() {}\n"), 0644)

	mockFinding := model.Finding{
		ID:       "EXT-001",
		Title:    "Deterministic Subprocess Finding",
		CWE:      "CWE-79",
		Severity: model.SeverityHigh,
		FilePath: "main.go",
	}

	mockEngine := &MockProcessEngine{
		name:      "MockLinter",
		available: true,
		findings:  []model.Finding{mockFinding},
	}

	s := NewScanner("2.4.0", WithEngine(mockEngine))
	payload, err := s.ScanDirectory(context.Background(), tempDir)
	if err != nil {
		t.Fatalf("scan failed: %v", err)
	}

	foundExt := false
	for _, f := range payload.Findings {
		if f.ID == "EXT-001" {
			foundExt = true
			break
		}
	}

	if !foundExt {
		t.Errorf("expected external engine finding EXT-001 to be present in normalized payload")
	}
}

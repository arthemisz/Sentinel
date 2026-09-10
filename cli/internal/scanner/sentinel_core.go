package scanner

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/sentinel-sast/sentinel/cli/internal/model"
)

// RustTaintFinding mirrors the serialized finding from sentinel-core.
type RustTaintFinding struct {
	FindingID             string `json:"finding_id"`
	RuleName              string `json:"rule_name"`
	Severity              string `json:"severity"`
	CWE                   string `json:"cwe"`
	Source                RustTaintNode `json:"source"`
	Sink                  RustTaintNode `json:"sink"`
	IsSanitized           bool   `json:"is_sanitized"`
	Confidence            string `json:"confidence"`
	RemediationSuggestion string `json:"remediation_suggestion"`
}

type RustTaintNode struct {
	NodeID   string        `json:"node_id"`
	VarName  string        `json:"var_name"`
	Role     string        `json:"role"`
	Category string        `json:"category"`
	CWE      string        `json:"cwe"`
	Span     RustSpan      `json:"span"`
}

type RustSpan struct {
	FilePath  string `json:"file_path"`
	StartByte int    `json:"start_byte"`
	EndByte   int    `json:"end_byte"`
	StartLine int    `json:"start_line"`
	StartCol  int    `json:"start_col"`
	EndLine   int    `json:"end_line"`
	EndCol    int    `json:"end_col"`
}

// RustGraphReport represents the unified 5-layer graph response.
type RustGraphReport struct {
	RepositoryURL string              `json:"repository_url"`
	CommitHash    string              `json:"commit_hash"`
	ASTSummary    map[string]any      `json:"ast_summary"`
	CFG           map[string]any      `json:"cfg"`
	CallGraph     map[string]any      `json:"call_graph"`
	PDG           map[string]any      `json:"pdg"`
	TaintGraph    map[string]any      `json:"taint_graph"`
	Findings      []RustTaintFinding  `json:"findings"`
}

// SentinelCoreEngine invokes the compiled Rust graph generation engine.
type SentinelCoreEngine struct {
	binaryPath string
	lastReport *RustGraphReport
}

// NewSentinelCoreEngine locates the sentinel-core binary across standard locations.
func NewSentinelCoreEngine() *SentinelCoreEngine {
	candidates := []string{
		"sentinel-core.exe",
		"sentinel-core",
	}

	// 1. Check next to running executable
	if exe, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exe)
		for _, c := range candidates {
			p := filepath.Join(exeDir, c)
			if _, err := os.Stat(p); err == nil {
				return &SentinelCoreEngine{binaryPath: p}
			}
		}
	}

	// 2. Check current working directory
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			abs, _ := filepath.Abs(c)
			return &SentinelCoreEngine{binaryPath: abs}
		}
	}

	// 3. Check cargo target release directory
	targetPaths := []string{
		filepath.Join("sentinel-core", "target", "release", "sentinel-core.exe"),
		filepath.Join("..", "sentinel-core", "target", "release", "sentinel-core.exe"),
		filepath.Join("sentinel-core", "target", "release", "sentinel-core"),
		filepath.Join("..", "sentinel-core", "target", "release", "sentinel-core"),
	}
	for _, tp := range targetPaths {
		if _, err := os.Stat(tp); err == nil {
			abs, _ := filepath.Abs(tp)
			return &SentinelCoreEngine{binaryPath: abs}
		}
	}

	// 4. Check system PATH
	for _, c := range candidates {
		if path, err := exec.LookPath(c); err == nil {
			return &SentinelCoreEngine{binaryPath: path}
		}
	}

	return &SentinelCoreEngine{binaryPath: ""}
}

func (e *SentinelCoreEngine) Name() string {
	return "Sentinel-Core-Rust (5-Layer Mathematical Graph Engine)"
}

func (e *SentinelCoreEngine) Available() bool {
	return e.binaryPath != ""
}

func (e *SentinelCoreEngine) LastReport() *RustGraphReport {
	return e.lastReport
}

func (e *SentinelCoreEngine) Execute(ctx context.Context, targetDir string) ([]model.Finding, error) {
	if !e.Available() {
		return nil, fmt.Errorf("sentinel-core binary not found")
	}

	cmd := exec.CommandContext(ctx, e.binaryPath, "analyze", "--path", targetDir)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("sentinel-core execution failed: %w (stderr: %s)", err, stderr.String())
	}

	var report RustGraphReport
	if err := json.Unmarshal(stdout.Bytes(), &report); err != nil {
		return nil, fmt.Errorf("failed parsing sentinel-core graph report: %w", err)
	}

	e.lastReport = &report

	findings := make([]model.Finding, 0, len(report.Findings))
	for _, rf := range report.Findings {
		// Map severity
		sev := model.SeverityMedium
		switch strings.ToUpper(rf.Severity) {
		case "CRITICAL":
			sev = model.SeverityCritical
		case "HIGH":
			sev = model.SeverityHigh
		case "MEDIUM":
			sev = model.SeverityMedium
		case "LOW":
			sev = model.SeverityLow
		}

		line := rf.Source.Span.StartLine
		if line <= 0 {
			line = 1
		}

		file := rf.Source.Span.FilePath
		if file == "" {
			file = rf.Sink.Span.FilePath
		}

		finding := model.Finding{
			ID:          rf.FindingID,
			Category:    rf.RuleName,
			Title:       fmt.Sprintf("%s (%s)", rf.RuleName, rf.CWE),
			CWE:         rf.CWE,
			Severity:    sev,
			Language:    "Universal",
			FilePath:    file,
			LineNumber:  line,
			TaintSource: fmt.Sprintf("Source var: %s (%s)", rf.Source.VarName, rf.Source.Category),
			TaintSink:   fmt.Sprintf("Sink: %s", rf.Sink.VarName),
			CodeSnippet: rf.RemediationSuggestion,
			Engine:      "Sentinel-Core (Rust AST/CFG/CG/PDG/VFG)",
		}
		findings = append(findings, finding)
	}

	return findings, nil
}

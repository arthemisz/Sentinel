package scanner

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"

	"github.com/sentinel-sast/sentinel/cli/internal/model"
)

// DeterministicEngine represents an underlying scanning engine orchestrated by Sentinel.
type DeterministicEngine interface {
	Name() string
	Available() bool
	Execute(ctx context.Context, targetDir string) ([]model.Finding, error)
}

// ExternalProcessEngine orchestrates external deterministic CLI security tools via os/exec.
type ExternalProcessEngine struct {
	name       string
	binaryName string
	args       []string
	parser     func(output []byte) ([]model.Finding, error)
}

// NewExternalProcessEngine initializes an external engine orchestrated via os/exec.
func NewExternalProcessEngine(
	name string,
	binaryName string,
	args []string,
	parser func(output []byte) ([]model.Finding, error),
) *ExternalProcessEngine {
	return &ExternalProcessEngine{
		name:       name,
		binaryName: binaryName,
		args:       args,
		parser:     parser,
	}
}

// Name returns the identifier of the engine.
func (e *ExternalProcessEngine) Name() string {
	return e.name
}

// Available checks if the underlying engine binary is resolvable on PATH.
func (e *ExternalProcessEngine) Available() bool {
	_, err := exec.LookPath(e.binaryName)
	return err == nil
}

// Execute orchestrates the underlying command using os/exec and parses raw output.
func (e *ExternalProcessEngine) Execute(ctx context.Context, targetDir string) ([]model.Finding, error) {
	if !e.Available() {
		return nil, fmt.Errorf("engine binary '%s' not found on system PATH", e.binaryName)
	}

	cmd := exec.CommandContext(ctx, e.binaryName, e.args...)
	cmd.Dir = targetDir

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// Execute process; some security tools exit with non-zero when vulnerabilities are found
	err := cmd.Run()
	outputBytes := stdout.Bytes()

	// If stdout is empty, check stderr
	if len(outputBytes) == 0 && stderr.Len() > 0 {
		outputBytes = stderr.Bytes()
	}

	if err != nil && len(outputBytes) == 0 {
		return nil, fmt.Errorf("engine '%s' failed: %w (stderr: %s)", e.name, err, stderr.String())
	}

	if e.parser != nil {
		return e.parser(outputBytes)
	}

	return nil, nil
}

// GenericJSONFinding represents common JSON outputs from deterministic scanners.
type GenericJSONFinding struct {
	RuleID   string `json:"rule_id"`
	Details  string `json:"details"`
	Severity string `json:"severity"`
	File     string `json:"file"`
	Line     int    `json:"line"`
	Code     string `json:"code"`
	CWE      string `json:"cwe"`
}

// ParseGenericJSONOutput parses raw JSON output from deterministic security engines.
func ParseGenericJSONOutput(raw []byte, engineName string) ([]model.Finding, error) {
	if len(bytes.TrimSpace(raw)) == 0 {
		return nil, nil
	}

	var items []GenericJSONFinding
	if err := json.Unmarshal(raw, &items); err != nil {
		// Attempt object with findings key
		var wrapper struct {
			Issues   []GenericJSONFinding `json:"Issues"`
			Results  []GenericJSONFinding `json:"results"`
			Findings []GenericJSONFinding `json:"findings"`
		}
		if wrapErr := json.Unmarshal(raw, &wrapper); wrapErr == nil {
			if len(wrapper.Issues) > 0 {
				items = wrapper.Issues
			} else if len(wrapper.Results) > 0 {
				items = wrapper.Results
			} else {
				items = wrapper.Findings
			}
		} else {
			return nil, fmt.Errorf("failed to parse %s output: %w", engineName, err)
		}
	}

	findings := make([]model.Finding, 0, len(items))
	for idx, item := range items {
		sev := model.SeverityMedium
		switch strings.ToUpper(item.Severity) {
		case "CRITICAL", "HIGH":
			sev = model.SeverityCritical
		case "MEDIUM", "MODERATE":
			sev = model.SeverityMedium
		case "LOW", "INFO":
			sev = model.SeverityLow
		}

		cwe := item.CWE
		if cwe == "" {
			cwe = "CWE-General"
		}

		findings = append(findings, model.Finding{
			ID:          fmt.Sprintf("%s-%d", strings.ToLower(engineName), idx+1),
			Category:    "Static Analysis",
			Title:       item.Details,
			CWE:         cwe,
			Severity:    sev,
			Language:    "Universal",
			FilePath:    item.File,
			LineNumber:  item.Line,
			TaintSource: "Process Scanner Detection",
			TaintSink:   item.RuleID,
			CodeSnippet: item.Code,
			Engine:      engineName,
		})
	}

	return findings, nil
}

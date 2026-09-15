package reporter

import (
	"bytes"
	"errors"
	"strings"
	"testing"
	"time"
)

func TestStageIndicator_SuccessMilestone(t *testing.T) {
	var buf bytes.Buffer
	indicator := NewStageIndicator(&buf)

	stageMsg := "[1/4] Cloning repository shallowly (depth=1)..."
	indicator.Start(stageMsg)
	time.Sleep(10 * time.Millisecond)
	indicator.Success()

	output := buf.String()
	if !strings.HasPrefix(output, "[✓] [1/4] Cloning repository shallowly (depth=1)...") {
		t.Errorf("expected output to start with checkmark and stage label, got: %q", output)
	}

	if !strings.Contains(output, "ms)") {
		t.Errorf("expected milestone duration formatted in ms, got: %q", output)
	}
}

func TestStageIndicator_CustomDuration(t *testing.T) {
	var buf bytes.Buffer
	indicator := NewStageIndicator(&buf)

	stageMsg := "[1/4] Cloning repository shallowly (depth=1)..."
	indicator.Start(stageMsg)
	indicator.Success(0)

	output := buf.String()
	if !strings.Contains(output, "(0ms)") {
		t.Errorf("expected custom duration (0ms), got: %q", output)
	}
}

func TestStageIndicator_ErrorMilestone(t *testing.T) {
	var buf bytes.Buffer
	indicator := NewStageIndicator(&buf)

	stageMsg := "[2/4] Parsing AST & constructing graph layers (Tree-sitter & Rust)..."
	indicator.Start(stageMsg)
	indicator.Error(errors.New("syntax error"))

	output := buf.String()
	if !strings.HasPrefix(output, "[✗] [2/4] Parsing AST & constructing graph layers (Tree-sitter & Rust)... failed") {
		t.Errorf("expected failure output format, got: %q", output)
	}

	if !strings.Contains(output, "ms)") {
		t.Errorf("expected duration in ms, got: %q", output)
	}
}

func TestStageIndicator_AllFourStages(t *testing.T) {
	var buf bytes.Buffer
	indicator := NewStageIndicator(&buf)

	stages := []string{
		"[1/4] Cloning repository shallowly (depth=1)...",
		"[2/4] Parsing AST & constructing graph layers (Tree-sitter & Rust)...",
		"[3/4] Tracing taint flows & verifying via Claude 3.5 Sonnet...",
		"[4/4] Synchronizing scan records to Prisma database...",
	}

	for _, stg := range stages {
		indicator.Start(stg)
		indicator.Success(42)
	}

	output := buf.String()
	for _, stg := range stages {
		expected := "[✓] " + stg + " (42ms)"
		if !strings.Contains(output, expected) {
			t.Errorf("expected output to contain %q, got: %q", expected, output)
		}
	}
}

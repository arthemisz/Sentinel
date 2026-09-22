package ui

import (
	"bytes"
	"strings"
	"testing"
)

func TestKnightProgress_Initialization(t *testing.T) {
	var buf bytes.Buffer
	kp := NewKnightProgressWithWriter(&buf)

	if kp.totalRows != 19 {
		t.Errorf("expected totalRows=19, got %d", kp.totalRows)
	}
	if !kp.isFirstDraw {
		t.Errorf("expected isFirstDraw=true")
	}
}

func TestKnightProgress_Update_0Percent(t *testing.T) {
	var buf bytes.Buffer
	kp := NewKnightProgressWithWriter(&buf)

	kp.Update(0.0, "Scanning initialized")
	output := buf.String()

	// Visual Baseline: Artwork rows start completely drawn in crisp white without toxic green
	lines := strings.Split(output, "\n")
	if len(lines) < 19 {
		t.Fatalf("expected at least 19 lines, got %d", len(lines))
	}
	for i := 0; i < 19; i++ {
		if !strings.Contains(lines[i], KnightWhite) {
			t.Errorf("expected artwork row %d to contain KnightWhite, got: %s", i, lines[i])
		}
		if strings.Contains(lines[i], ToxicGreen) {
			t.Errorf("expected artwork row %d to NOT contain ToxicGreen at 0%%", i)
		}
	}
	if !strings.Contains(output, "[SENTINEL CORE]") {
		t.Errorf("expected status line to contain [SENTINEL CORE]")
	}
	if !strings.Contains(output, "0%") {
		t.Errorf("expected status line to contain 0%%")
	}
	if !strings.Contains(output, "Scanning initialized") {
		t.Errorf("expected status line to contain message")
	}
}

func TestKnightProgress_Update_50Percent(t *testing.T) {
	var buf bytes.Buffer
	kp := NewKnightProgressWithWriter(&buf)

	kp.Update(50.0, "Parsing AST [15/30 files]")
	output := buf.String()

	// Progressive Fill: Body fills with vibrant toxic green from bottom row up
	if !strings.Contains(output, ToxicGreen) {
		t.Errorf("expected 50%% update to contain ToxicGreen in filled rows")
	}
	// Wave Crest: Active cutoff line glows with electric green
	if !strings.Contains(output, AccentGreen) {
		t.Errorf("expected 50%% update to contain AccentGreen for wave crest")
	}
	// Unfilled portion: Still contains KnightWhite in upper rows
	if !strings.Contains(output, KnightWhite) {
		t.Errorf("expected 50%% update to contain KnightWhite in unfilled rows")
	}
	// Dynamic status
	if !strings.Contains(output, "50%") {
		t.Errorf("expected status line to contain 50%%")
	}
	if !strings.Contains(output, "Parsing AST [15/30 files]") {
		t.Errorf("expected status line to contain file count status")
	}
}

func TestKnightProgress_Update_100PercentAndComplete(t *testing.T) {
	var buf bytes.Buffer
	kp := NewKnightProgressWithWriter(&buf)

	kp.Complete("All engines verified")
	output := buf.String()

	if !strings.Contains(output, ToxicGreen) {
		t.Errorf("expected complete update to contain ToxicGreen")
	}
	if strings.Contains(output, KnightWhite) {
		t.Errorf("expected 100%% update to have no KnightWhite unfilled rows")
	}
	if !strings.Contains(output, "100%") {
		t.Errorf("expected complete output to show 100%%")
	}
	if !strings.Contains(output, "All engines verified") {
		t.Errorf("expected complete output to show final message")
	}
}

func TestKnightProgress_InPlaceTerminalRedraw(t *testing.T) {
	var buf bytes.Buffer
	kp := NewKnightProgressWithWriter(&buf)
	// Force terminal mode to verify ANSI cursor rewind and clear-line sequences
	kp.isTerm = true

	// Frame 1: 0%
	kp.Update(0.0, "Starting scan...")
	frame1 := buf.String()
	if strings.Contains(frame1, "\033[20A") {
		t.Errorf("frame 1 should not rewind cursor on first draw")
	}
	if !strings.Contains(frame1, "\r\033[2K") {
		t.Errorf("frame 1 in terminal mode should clear lines with \\r\\033[2K")
	}

	buf.Reset()

	// Frame 2: 50%
	kp.Update(50.0, "Parsing files...")
	frame2 := buf.String()
	// Must rewind cursor up 20 lines to overwrite in-place
	if !strings.Contains(frame2, "\r\033[20A") {
		t.Errorf("frame 2 must emit \\r\\033[20A to rewind cursor in-place, got: %q", frame2)
	}
	if !strings.Contains(frame2, "50%") {
		t.Errorf("frame 2 must contain 50%%")
	}

	buf.Reset()

	// Frame 3: Complete
	kp.Complete("Scan completed successfully")
	frame3 := buf.String()
	if !strings.Contains(frame3, "\r\033[20A") {
		t.Errorf("complete frame must emit \\r\\033[20A to overwrite in-place")
	}
	if !strings.Contains(frame3, ShowCursor) {
		t.Errorf("complete frame must restore cursor with ShowCursor")
	}
	if !strings.Contains(frame3, "100%") {
		t.Errorf("complete frame must contain 100%%")
	}
	if !strings.Contains(frame3, "Scan completed successfully") {
		t.Errorf("complete frame must contain final message")
	}
}

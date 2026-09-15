package ui

import (
	"bytes"
	"strings"
	"testing"
	"time"
)

func TestArtwork_Definition(t *testing.T) {
	if len(Artwork) != 19 {
		t.Fatalf("expected 19 rows in Artwork, got %d", len(Artwork))
	}

	if RowCount() != 19 {
		t.Errorf("expected RowCount() to return 19, got %d", RowCount())
	}

	// Verify first and last rows match expected Braille content
	if !strings.Contains(Artwork[0], "⣠⣴⣶⣿⣿⣿⣶⣦⣄") {
		t.Errorf("unexpected row 0 content: %s", Artwork[0])
	}
	if !strings.Contains(Artwork[18], "⠉⠻⡿⠋") {
		t.Errorf("unexpected row 18 content: %s", Artwork[18])
	}
}

func TestRender_BottomUpCharging(t *testing.T) {
	// At 0% progress: all rows should contain ColorDim and NOT ColorNeonGreen
	dimBanner := Render(0.0)
	if !strings.Contains(dimBanner, ColorDim) {
		t.Errorf("expected dim banner to contain ColorDim")
	}
	if strings.Contains(dimBanner, ColorNeonGreen) {
		t.Errorf("expected dim banner to not contain ColorNeonGreen")
	}

	// At 100% progress: all rows should contain ColorNeonGreen and NOT ColorDim
	chargedBanner := Render(1.0)
	if !strings.Contains(chargedBanner, ColorNeonGreen) {
		t.Errorf("expected charged banner to contain ColorNeonGreen")
	}
	if strings.Contains(chargedBanner, ColorDim) {
		t.Errorf("expected charged banner to not contain ColorDim")
	}

	// At 50% progress:
	// Bottom rows should be neon green, top rows should be dim
	halfBanner := Render(0.5)
	if !strings.Contains(halfBanner, ColorNeonGreen) {
		t.Errorf("expected 50%% banner to contain ColorNeonGreen in bottom half")
	}
	if !strings.Contains(halfBanner, ColorDim) {
		t.Errorf("expected 50%% banner to contain ColorDim in top half")
	}

	// Verify specific rows at 50% (cutoff around row 9-10)
	topRow := RenderRow(0, 0.5)
	bottomRow := RenderRow(18, 0.5)

	if !strings.Contains(topRow, ColorDim) {
		t.Errorf("expected top row (0) to be dim at 50%%, got: %s", topRow)
	}
	if !strings.Contains(bottomRow, ColorNeonGreen) {
		t.Errorf("expected bottom row (18) to be neon green at 50%%, got: %s", bottomRow)
	}
}

func TestRenderRow_Boundaries(t *testing.T) {
	if RenderRow(-1, 0.5) != "" {
		t.Errorf("expected empty string for negative row index")
	}
	if RenderRow(100, 0.5) != "" {
		t.Errorf("expected empty string for out-of-bounds row index")
	}
}

func TestAnimate_BufferOutput(t *testing.T) {
	var buf bytes.Buffer
	Animate(&buf, 10*time.Millisecond)

	out := buf.String()
	if !strings.Contains(out, ColorNeonGreen) {
		t.Errorf("expected buffer output to contain ColorNeonGreen, got: %s", out)
	}
	if strings.Contains(out, "\033[19A") {
		t.Errorf("expected non-terminal output to NOT contain cursor repositioning escape codes")
	}
}

func TestPrintBanner(t *testing.T) {
	var buf bytes.Buffer
	PrintBanner(&buf, "2.4.0")

	out := buf.String()
	if !strings.Contains(out, "2.4.0") {
		t.Errorf("expected banner output to include version '2.4.0'")
	}
	if !strings.Contains(out, ColorNeonGreen) {
		t.Errorf("expected banner output to include neon green charged logo")
	}
}

func TestChargingLogoController(t *testing.T) {
	var buf bytes.Buffer
	ctrl := NewChargingLogoController(&buf)

	ctrl.SetProgress(0.25)
	ctrl.SetProgress(0.75)
	ctrl.Finish()

	if ctrl.progress != 1.0 {
		t.Errorf("expected final progress to be 1.0, got %f", ctrl.progress)
	}
}

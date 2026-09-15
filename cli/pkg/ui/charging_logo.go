package ui

import (
	"bytes"
	"fmt"
	"io"
	"math"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/mattn/go-isatty"
)

// ANSI color escape sequences for luminous green fluid charging.
const (
	ColorNeonGreen = "\033[38;5;82m"    // Luminous neon green
	ColorGreen     = "\033[32m"          // Standard ANSI green fallback
	ColorCrest     = "\033[1;38;5;157m"  // Luminous white-green crest wave front
	ColorDim       = "\033[38;5;240m"    // Dim grayed-out uncharged state
	ColorReset     = "\033[0m"           // Reset formatting
	ColorBold      = "\033[1m"           // Bold text
)

// Artwork stores the exact 19-row Braille character mark representing Sentinel.
var Artwork = []string{
	"⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣴⣶⣿⣿⣿⣶⣦⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
	"⠀⠀⠀⠀⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⡄⠀⠀⠀⠀⠀⠀⠀⠀",
	"⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀",
	"⠀⠀⠀⠀⠀⠀⣠⣿⣿⣿⢟⣭⣴⣶⡦⠍⠛⣿⣿⣿⣿⣿⠇⠀⠀⠀⠀⠀⠀⠀",
	"⠈⠳⣶⣤⣤⣶⣿⠿⢫⣾⣿⣿⠋⠀⠀⠀⠀⢸⣿⡟⠛⠁⠀⠀⠀⠀⠀⠀⠀⠀",
	"⠀⠀⠈⠉⠉⠉⠁⣰⣿⣿⣿⠇⠀⢀⣀⣤⣴⣾⣧⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀",
	"⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⡟⢠⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀",
	"⠀⠀⠀⠀⠀⣠⣿⣿⣿⡟⢠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀",
	"⠀⠀⢀⣠⣶⣿⣿⡿⠋⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡷⠀⠀⠀⠀",
	"⠉⠛⠛⠛⠛⠛⠉⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⣛⣥⣶⣆⠀⠀⠀",
	"⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⠏⣥⣤⡙⢟⣫⡴⠿⠿⠿⠷⠿⣷⡀⠀",
	"⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⡜⢿⡿⢃⣌⢻⣟⠛⠻⠶⠶⢶⣾⣿⡄",
	"⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⡄⣾⣿⣿⣷⡝⢿⣷⣶⣶⣦⡾⠟⠁",
	"⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣟⣛⣻⠿⠿⢧⢹⣿⣿⣿⣿⣦⡙⢷⡶⠋⠀⠀⠀",
	"⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⣝⠻⣿⣿⣛⠷⠌⢿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀",
	"⠀⠀⠀⠀⠀⠀⠀⠀⣠⣾⣿⣿⣿⣮⣝⠻⣿⣶⣦⣤⣉⠛⠿⢿⠁⠀⠀⠀⠀⠀",
	"⠀⠀⠀⠀⠀⠀⠰⣾⣿⣿⣿⣿⣿⣿⣿⣿⣶⣭⣛⠿⢿⣧⢷⣤⡀⠀⠀⠀⠀⠀",
	"⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠿⣿⣿⣿⣿⣷⡦⠉⢿⣿⡷⠦⠀⠀⠀",
	"⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⡿⠋⠀⠀⠈⠀⠀⠀⠀⠰⡆",
}

// RowCount returns the total number of rows in the Braille artwork.
func RowCount() int {
	return len(Artwork)
}

// RenderRow formats a single row of the Artwork based on the bottom-up charging progress.
// Progress ranges from 0.0 (fully dim) to 1.0 (fully neon green).
func RenderRow(rowIndex int, progress float64) string {
	if rowIndex < 0 || rowIndex >= len(Artwork) {
		return ""
	}

	n := len(Artwork)
	chargedRows := int(math.Round(progress * float64(n)))
	if chargedRows < 0 {
		chargedRows = 0
	}
	if chargedRows > n {
		chargedRows = n
	}

	cutoff := n - chargedRows

	// Bottom-up fill:
	// Rows below cutoff are fully charged neon green.
	// The row at cutoff (if actively charging) is the luminous crest wave front.
	// Rows above cutoff are dim/grayed out.
	if rowIndex > cutoff {
		return ColorNeonGreen + Artwork[rowIndex] + ColorReset
	} else if rowIndex == cutoff {
		if chargedRows > 0 && chargedRows < n {
			return ColorCrest + Artwork[rowIndex] + ColorReset
		} else if chargedRows == n {
			return ColorNeonGreen + Artwork[rowIndex] + ColorReset
		}
		return ColorDim + Artwork[rowIndex] + ColorReset
	}

	return ColorDim + Artwork[rowIndex] + ColorReset
}

// Render generates the full multi-line string of the artwork for the given progress (0.0 to 1.0).
func Render(progress float64) string {
	var sb strings.Builder
	for i := 0; i < len(Artwork); i++ {
		sb.WriteString(RenderRow(i, progress))
		if i < len(Artwork)-1 {
			sb.WriteString("\n")
		}
	}
	return sb.String()
}

// RenderPlain returns the uncolored raw Braille artwork.
func RenderPlain() string {
	return strings.Join(Artwork, "\n")
}

// RenderCharged returns all rows in fully charged luminous neon green.
func RenderCharged() string {
	return Render(1.0)
}

// RenderDim returns all rows in dim grayed-out state.
func RenderDim() string {
	return Render(0.0)
}

// isTerminal checks if the writer is an interactive terminal rather than a pipe or buffer.
func isTerminal(w io.Writer) bool {
	if _, isBuffer := w.(*bytes.Buffer); isBuffer {
		return false
	}
	if f, ok := w.(*os.File); ok {
		return isatty.IsTerminal(f.Fd()) || isatty.IsCygwinTerminal(f.Fd())
	}
	return false
}

// Animate renders a smooth bottom-to-top fluid green charging animation.
// If the destination is a terminal, it animates in-place using ANSI cursor rewinds.
// If not a terminal, it renders the fully charged logo once.
func Animate(w io.Writer, duration time.Duration) {
	if w == nil {
		w = os.Stdout
	}

	if !isTerminal(w) {
		fmt.Fprintln(w, RenderCharged())
		return
	}

	if duration <= 0 {
		duration = 450 * time.Millisecond
	}

	n := len(Artwork)
	steps := n
	stepDelay := duration / time.Duration(steps)

	// Hide cursor during animation
	fmt.Fprint(w, "\033[?25l")
	defer fmt.Fprint(w, "\033[?25h")

	// Frame 0: Dim baseline (0%)
	fmt.Fprintln(w, Render(0.0))

	// Animate bottom-to-top charge
	for step := 1; step <= steps; step++ {
		time.Sleep(stepDelay)
		progress := float64(step) / float64(steps)

		// Reposition cursor up n lines
		fmt.Fprintf(w, "\033[%dA\r", n)
		fmt.Fprintln(w, Render(progress))
	}
}

// PrintBanner renders the charging Braille logo and the Sentinel platform banner.
func PrintBanner(w io.Writer, version string) {
	if w == nil {
		w = os.Stdout
	}

	fmt.Fprintln(w)
	Animate(w, 400*time.Millisecond)

	fmt.Fprintf(w, "  ███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗     \n")
	fmt.Fprintf(w, "  ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║     \n")
	fmt.Fprintf(w, "  ███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║     \n")
	fmt.Fprintf(w, "  ╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║     \n")
	fmt.Fprintf(w, "  ███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗\n")
	fmt.Fprintf(w, "  ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝\n")
	fmt.Fprintf(w, "  Deterministic SAST & Interprocedural Taint Engine [v%s]\n\n", version)
}

// ChargingLogoController allows programmatic step-by-step charging during scan setup.
type ChargingLogoController struct {
	w         io.Writer
	isTerm    bool
	progress  float64
	rendered  bool
	mu        sync.Mutex
}

// NewChargingLogoController creates a controller bound to an io.Writer.
func NewChargingLogoController(w io.Writer) *ChargingLogoController {
	if w == nil {
		w = os.Stdout
	}
	return &ChargingLogoController{
		w:      w,
		isTerm: isTerminal(w),
	}
}

// SetProgress updates the charging level from 0.0 to 1.0.
func (c *ChargingLogoController) SetProgress(progress float64) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.progress = progress
	if !c.isTerm {
		return
	}

	n := len(Artwork)
	if c.rendered {
		fmt.Fprintf(c.w, "\033[%dA\r", n)
	}
	fmt.Fprintln(c.w, Render(progress))
	c.rendered = true
}

// Finish completes the charge to 100% and displays the final luminous state.
func (c *ChargingLogoController) Finish() {
	c.SetProgress(1.0)
}

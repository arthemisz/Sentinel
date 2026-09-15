package ui

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"

	"github.com/mattn/go-isatty"
)

const (
	Reset       = "\033[0m"
	KnightWhite = "\033[38;5;255m" // Stark white outline/unfilled portion
	ToxicGreen  = "\033[38;5;82m"  // Filled green portion
	AccentGreen = "\033[38;5;46m"  // Bright rising liquid edge
	CursorUp    = "\033[%dA"
	HideCursor  = "\033[?25l"
	ShowCursor  = "\033[?25h"
)

var KnightAscii = []string{
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

type KnightProgress struct {
	mu           sync.Mutex
	totalRows    int
	isFirstDraw  bool
	linesPrinted int
	out          io.Writer
	isTerm       bool
}

func isKnightTerminal(w io.Writer) bool {
	if _, isBuffer := w.(*bytes.Buffer); isBuffer {
		return false
	}
	if f, ok := w.(*os.File); ok {
		return isatty.IsTerminal(f.Fd()) || isatty.IsCygwinTerminal(f.Fd())
	}
	return false
}

func NewKnightProgress() *KnightProgress {
	fmt.Print(HideCursor)
	return &KnightProgress{
		totalRows:   len(KnightAscii),
		isFirstDraw: true,
		out:         os.Stdout,
		isTerm:      isKnightTerminal(os.Stdout),
	}
}

// NewKnightProgressWithWriter initializes a knight progress indicator targeting a custom writer.
func NewKnightProgressWithWriter(out io.Writer) *KnightProgress {
	if out == nil {
		out = os.Stdout
	}
	isTerm := isKnightTerminal(out)
	if isTerm {
		fmt.Fprint(out, HideCursor)
	}
	return &KnightProgress{
		totalRows:   len(KnightAscii),
		isFirstDraw: true,
		out:         out,
		isTerm:      isTerm,
	}
}

// Update redraws the knight filled from bottom to top based on real scan percent (0.0 to 100.0)
func (kp *KnightProgress) Update(percent float64, message string) {
	kp.mu.Lock()
	defer kp.mu.Unlock()

	if percent < 0 {
		percent = 0
	}
	if percent > 100 {
		percent = 100
	}

	totalLines := kp.totalRows + 1 // artwork rows + status line

	out := kp.out
	if out == nil {
		out = os.Stdout
	}

	// Reposition cursor to top of the block if not the first render
	if !kp.isFirstDraw {
		if kp.isTerm || kp.out == nil {
			fmt.Fprintf(out, CursorUp, totalLines)
		}
	}
	kp.isFirstDraw = false

	filledRows := int((percent / 100.0) * float64(kp.totalRows))
	cutoffIndex := kp.totalRows - filledRows

	var sb strings.Builder
	for i, line := range KnightAscii {
		if i == cutoffIndex && cutoffIndex < kp.totalRows {
			sb.WriteString(AccentGreen) // Rising crest line
		} else if i > cutoffIndex {
			sb.WriteString(ToxicGreen)  // Submerged green
		} else {
			sb.WriteString(KnightWhite) // Unfilled white
		}
		sb.WriteString(line)
		sb.WriteString(Reset + "\n")
	}

	// Dynamic status bar underneath
	sb.WriteString(fmt.Sprintf("%s[SENTINEL CORE]%s %s%3.0f%%%s — \033[K%-35s\n",
		ToxicGreen, Reset, ToxicGreen, percent, Reset, message))

	fmt.Fprint(out, sb.String())
}

// Complete cleanly finishes the animation, showing the cursor and leaving the fully charged knight on screen
func (kp *KnightProgress) Complete(finalMessage string) {
	kp.Update(100.0, finalMessage)
	out := kp.out
	if out == nil {
		out = os.Stdout
	}
	if kp.isTerm || kp.out == nil {
		fmt.Fprint(out, ShowCursor)
	}
	fmt.Fprintln(out)
}

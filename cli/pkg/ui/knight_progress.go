package ui

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"

	"github.com/mattn/go-isatty"
	"golang.org/x/term"
)

const (
	Reset       = "\033[0m"
	KnightWhite = "\033[38;5;255m" // Stark white outline/unfilled portion
	ToxicGreen  = "\033[38;5;82m"  // Filled green portion
	AccentGreen = "\033[38;5;46m"  // Bright rising liquid edge
	CursorUp    = "\033[%dA"
	HideCursor  = "\033[?25l"
	ShowCursor  = "\033[?25h"
	ClearLine   = "\033[2K"
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
	restoreVT    func()
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
	return NewKnightProgressWithWriter(os.Stdout)
}

// NewKnightProgressWithWriter initializes a knight progress indicator targeting a custom writer.
func NewKnightProgressWithWriter(out io.Writer) *KnightProgress {
	if out == nil {
		out = os.Stdout
	}
	isTerm := isKnightTerminal(out)
	var restoreVT func()
	if isTerm {
		restoreVT = enableVirtualTerminalProcessing(out)
		fmt.Fprint(out, HideCursor)
	}
	return &KnightProgress{
		totalRows:   len(KnightAscii),
		isFirstDraw: true,
		out:         out,
		isTerm:      isTerm,
		restoreVT:   restoreVT,
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

	out := kp.out
	if out == nil {
		out = os.Stdout
	}

	filledRows := int((percent / 100.0) * float64(kp.totalRows))
	cutoffIndex := kp.totalRows - filledRows

	// Check terminal dimensions if applicable to prevent line wrapping overflow
	termWidth := 0
	termHeight := 0
	if f, ok := out.(*os.File); ok && kp.isTerm {
		if w, h, err := term.GetSize(int(f.Fd())); err == nil {
			termWidth = w
			termHeight = h
		}
	}

	// Truncate message to avoid accidental line wrapping in narrow terminals
	displayMsg := message
	if termWidth > 35 {
		maxMsgLen := termWidth - 26 // reserve space for "[SENTINEL CORE] 100% — "
		if maxMsgLen > 10 && len(displayMsg) > maxMsgLen {
			displayMsg = displayMsg[:maxMsgLen-3] + "..."
		}
	}

	// In non-interactive file/pipe redirections (CI, file redirection), avoid spamming
	// multi-line ASCII art repeatedly into flat logs where cursor rewinds cannot work.
	if f, isFile := out.(*os.File); isFile && !kp.isTerm {
		if percent < 100.0 {
			fmt.Fprintf(f, "[SENTINEL CORE] %3.0f%% — %s\n", percent, displayMsg)
			return
		}
	}

	var sb strings.Builder

	// In interactive terminal mode, rewind cursor to the start of previously drawn block
	if !kp.isFirstDraw && kp.isTerm && kp.linesPrinted > 0 {
		sb.WriteString(fmt.Sprintf("\r\033[%dA", kp.linesPrinted))
	}
	kp.isFirstDraw = false

	// In extremely constrained terminal heights (< 21 rows), render compact single-line progress
	compactMode := termHeight > 0 && termHeight < 21
	linesCount := 0

	if !compactMode {
		for i, line := range KnightAscii {
			if kp.isTerm {
				sb.WriteString("\r\033[2K")
			}
			if i == cutoffIndex && cutoffIndex < kp.totalRows {
				sb.WriteString(AccentGreen) // Rising crest line
			} else if i > cutoffIndex {
				sb.WriteString(ToxicGreen)  // Submerged green
			} else {
				sb.WriteString(KnightWhite) // Unfilled white
			}
			sb.WriteString(line)
			sb.WriteString(Reset + "\n")
			linesCount++
		}
	}

	// Dynamic status bar underneath
	if kp.isTerm {
		sb.WriteString("\r\033[2K")
	}
	sb.WriteString(fmt.Sprintf("%s[SENTINEL CORE]%s %s%3.0f%%%s — %-35s\n",
		ToxicGreen, Reset, ToxicGreen, percent, Reset, displayMsg))
	linesCount++

	kp.linesPrinted = linesCount

	// Flush the entire frame as a single atomic write to eliminate flicker
	fmt.Fprint(out, sb.String())
}

// Complete cleanly finishes the animation, showing the cursor and leaving the fully charged knight on screen
func (kp *KnightProgress) Complete(finalMessage string) {
	kp.Update(100.0, finalMessage)

	kp.mu.Lock()
	defer kp.mu.Unlock()

	out := kp.out
	if out == nil {
		out = os.Stdout
	}
	if kp.isTerm {
		fmt.Fprint(out, ShowCursor)
	}
	if kp.restoreVT != nil {
		kp.restoreVT()
		kp.restoreVT = nil
	}
	fmt.Fprintln(out)
}

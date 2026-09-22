//go:build windows

package ui

import (
	"io"
	"os"

	"golang.org/x/sys/windows"
)

// enableVirtualTerminalProcessing enables ANSI/VT100 escape sequence processing
// on Windows console handles (PowerShell, CMD, Windows Terminal).
// It returns a cleanup function that restores the original console mode.
func enableVirtualTerminalProcessing(w io.Writer) func() {
	f, ok := w.(*os.File)
	if !ok {
		return func() {}
	}

	handle := windows.Handle(f.Fd())
	var originalMode uint32
	if err := windows.GetConsoleMode(handle, &originalMode); err != nil {
		return func() {}
	}

	const enableVT = windows.ENABLE_VIRTUAL_TERMINAL_PROCESSING
	if originalMode&enableVT != 0 {
		return func() {}
	}

	if err := windows.SetConsoleMode(handle, originalMode|enableVT); err != nil {
		return func() {}
	}

	return func() {
		_ = windows.SetConsoleMode(handle, originalMode)
	}
}

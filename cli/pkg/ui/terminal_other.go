//go:build !windows

package ui

import "io"

// enableVirtualTerminalProcessing is a no-op on non-Windows platforms.
func enableVirtualTerminalProcessing(w io.Writer) func() {
	return func() {}
}

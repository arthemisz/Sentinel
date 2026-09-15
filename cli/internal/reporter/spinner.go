package reporter

import (
	"fmt"
	"io"
	"os"
	"sync"
	"time"
)

// StageIndicator manages stage milestones and diagnostics without competing spinners.
type StageIndicator struct {
	writer    io.Writer
	startTime time.Time
	message   string
	active    bool
	mu        sync.Mutex
}

// NewStageIndicator creates a new stage indicator associated with an io.Writer.
func NewStageIndicator(w io.Writer) *StageIndicator {
	if w == nil {
		w = os.Stdout
	}

	return &StageIndicator{
		writer: w,
	}
}

// Start begins an active stage with the specified label and begins the elapsed timer.
func (si *StageIndicator) Start(msg string) {
	si.mu.Lock()
	defer si.mu.Unlock()

	si.message = msg
	si.startTime = time.Now()
	si.active = true
}

// Success stops the stage indicator with a checkmark [✓] and the elapsed milestone duration in milliseconds.
func (si *StageIndicator) Success(customDurationMs ...int64) {
	si.mu.Lock()
	defer si.mu.Unlock()

	duration := time.Since(si.startTime).Milliseconds()
	if len(customDurationMs) > 0 && customDurationMs[0] >= 0 {
		duration = customDurationMs[0]
	}

	msg := fmt.Sprintf("[✓] %s (%dms)\n", si.message, duration)
	fmt.Fprint(si.writer, msg)
	si.active = false
}

// Error stops the stage indicator with an error state [✗] and the elapsed milestone duration in milliseconds.
func (si *StageIndicator) Error(err error) {
	si.mu.Lock()
	defer si.mu.Unlock()

	duration := time.Since(si.startTime).Milliseconds()
	msg := fmt.Sprintf("[✗] %s failed (%dms)\n", si.message, duration)
	fmt.Fprint(si.writer, msg)
	si.active = false
}

// Stop cleanly pauses or stops the indicator without writing completion messages.
func (si *StageIndicator) Stop() {
	si.mu.Lock()
	defer si.mu.Unlock()

	si.active = false
}

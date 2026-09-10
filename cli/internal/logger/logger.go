package logger

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Level represents the severity level of a log entry.
type Level int

const (
	LevelDebug Level = iota
	LevelInfo
	LevelWarn
	LevelError
)

// String returns the uppercase string representation of the Level.
func (l Level) String() string {
	switch l {
	case LevelDebug:
		return "DEBUG"
	case LevelInfo:
		return "INFO"
	case LevelWarn:
		return "WARN"
	case LevelError:
		return "ERROR"
	default:
		return "UNKNOWN"
	}
}

// ParseLevel converts a string representation to a Level. Defaults to LevelInfo.
func ParseLevel(lvl string) Level {
	switch strings.ToUpper(strings.TrimSpace(lvl)) {
	case "DEBUG":
		return LevelDebug
	case "INFO":
		return LevelInfo
	case "WARN", "WARNING":
		return LevelWarn
	case "ERROR":
		return LevelError
	default:
		return LevelInfo
	}
}

// Option defines a functional configuration option for Logger.
type Option func(*Logger)

// WithLevel sets the minimum log level filter.
func WithLevel(lvl Level) Option {
	return func(l *Logger) {
		l.minLevel = lvl
	}
}

// WithAppend controls whether to append to an existing log file or truncate it.
func WithAppend(append bool) Option {
	return func(l *Logger) {
		l.append = append
	}
}

// Logger provides thread-safe file logging for Sentinel CLI operations.
type Logger struct {
	mu       sync.Mutex
	file     *os.File
	filePath string
	minLevel Level
	append   bool
	closed   bool
}

// New creates and initializes a new file logger at the given path.
// It automatically creates any missing parent directories.
func New(filePath string, opts ...Option) (*Logger, error) {
	if strings.TrimSpace(filePath) == "" {
		return nil, fmt.Errorf("log file path cannot be empty")
	}

	dir := filepath.Dir(filePath)
	if dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed creating log directory '%s': %w", dir, err)
		}
	}

	l := &Logger{
		filePath: filePath,
		minLevel: LevelInfo,
		append:   true,
	}

	for _, opt := range opts {
		opt(l)
	}

	flags := os.O_CREATE | os.O_WRONLY
	if l.append {
		flags |= os.O_APPEND
	} else {
		flags |= os.O_TRUNC
	}

	f, err := os.OpenFile(filePath, flags, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed opening log file '%s': %w", filePath, err)
	}

	l.file = f
	return l, nil
}

// FilePath returns the configured log file path.
func (l *Logger) FilePath() string {
	if l == nil {
		return ""
	}
	return l.filePath
}

// log formats and writes a log entry with timestamp and level.
func (l *Logger) log(lvl Level, format string, args ...interface{}) {
	if l == nil || l.file == nil {
		return
	}
	if lvl < l.minLevel {
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	if l.closed {
		return
	}

	timestamp := time.Now().UTC().Format(time.RFC3339)
	msg := fmt.Sprintf(format, args...)
	// Ensure newline
	if !strings.HasSuffix(msg, "\n") {
		msg += "\n"
	}

	entry := fmt.Sprintf("[%s] [%s] %s", timestamp, lvl.String(), msg)
	_, _ = l.file.WriteString(entry)
}

// Debugf logs a formatted message at LevelDebug.
func (l *Logger) Debugf(format string, args ...interface{}) {
	l.log(LevelDebug, format, args...)
}

// Infof logs a formatted message at LevelInfo.
func (l *Logger) Infof(format string, args ...interface{}) {
	l.log(LevelInfo, format, args...)
}

// Warnf logs a formatted message at LevelWarn.
func (l *Logger) Warnf(format string, args ...interface{}) {
	l.log(LevelWarn, format, args...)
}

// Errorf logs a formatted message at LevelError.
func (l *Logger) Errorf(format string, args ...interface{}) {
	l.log(LevelError, format, args...)
}

// Write implements io.Writer to allow direct output streaming into the log file.
func (l *Logger) Write(p []byte) (n int, err error) {
	if l == nil || l.file == nil {
		return len(p), nil
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	if l.closed {
		return 0, os.ErrClosed
	}

	return l.file.Write(p)
}

// Close flushes and closes the underlying log file.
func (l *Logger) Close() error {
	if l == nil || l.file == nil {
		return nil
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	if l.closed {
		return nil
	}

	l.closed = true
	return l.file.Close()
}

// Ensure Logger implements io.WriteCloser
var _ io.WriteCloser = (*Logger)(nil)

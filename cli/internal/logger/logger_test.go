package logger

import (
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func TestLogger_CreateAndWrite(t *testing.T) {
	tempDir := t.TempDir()
	logPath := filepath.Join(tempDir, "test.log")

	l, err := New(logPath, WithLevel(LevelDebug))
	if err != nil {
		t.Fatalf("unexpected error creating logger: %v", err)
	}

	if l.FilePath() != logPath {
		t.Errorf("expected FilePath '%s', got '%s'", logPath, l.FilePath())
	}

	l.Debugf("debug message: %d", 1)
	l.Infof("info message: %s", "hello")
	l.Warnf("warn message")
	l.Errorf("error message: %v", "failed")

	if err := l.Close(); err != nil {
		t.Fatalf("unexpected error closing logger: %v", err)
	}

	content, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("failed reading log file: %v", err)
	}

	strContent := string(content)
	if !strings.Contains(strContent, "[DEBUG] debug message: 1") {
		t.Errorf("expected debug entry, got: %s", strContent)
	}
	if !strings.Contains(strContent, "[INFO] info message: hello") {
		t.Errorf("expected info entry, got: %s", strContent)
	}
	if !strings.Contains(strContent, "[WARN] warn message") {
		t.Errorf("expected warn entry, got: %s", strContent)
	}
	if !strings.Contains(strContent, "[ERROR] error message: failed") {
		t.Errorf("expected error entry, got: %s", strContent)
	}
}

func TestLogger_LevelFiltering(t *testing.T) {
	tempDir := t.TempDir()
	logPath := filepath.Join(tempDir, "filtered.log")

	l, err := New(logPath, WithLevel(LevelWarn))
	if err != nil {
		t.Fatalf("unexpected error creating logger: %v", err)
	}
	defer l.Close()

	l.Debugf("this should be filtered")
	l.Infof("this should also be filtered")
	l.Warnf("this should appear")
	l.Errorf("this should also appear")

	_ = l.Close()

	content, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("failed reading log file: %v", err)
	}

	strContent := string(content)
	if strings.Contains(strContent, "should be filtered") {
		t.Errorf("expected debug/info messages to be filtered out, got: %s", strContent)
	}
	if !strings.Contains(strContent, "this should appear") {
		t.Errorf("expected warn message to appear, got: %s", strContent)
	}
	if !strings.Contains(strContent, "this should also appear") {
		t.Errorf("expected error message to appear, got: %s", strContent)
	}
}

func TestLogger_DirectWrite(t *testing.T) {
	tempDir := t.TempDir()
	logPath := filepath.Join(tempDir, "direct.log")

	l, err := New(logPath)
	if err != nil {
		t.Fatalf("unexpected error creating logger: %v", err)
	}

	rawText := "DIRECT TERMINAL OUTPUT\nLINE 2\n"
	n, err := l.Write([]byte(rawText))
	if err != nil {
		t.Fatalf("unexpected error writing raw bytes: %v", err)
	}
	if n != len(rawText) {
		t.Errorf("expected %d bytes written, got %d", len(rawText), n)
	}

	_ = l.Close()

	content, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("failed reading log file: %v", err)
	}

	if string(content) != rawText {
		t.Errorf("expected direct content '%s', got '%s'", rawText, string(content))
	}
}

func TestLogger_ConcurrentSafety(t *testing.T) {
	tempDir := t.TempDir()
	logPath := filepath.Join(tempDir, "concurrent.log")

	l, err := New(logPath)
	if err != nil {
		t.Fatalf("unexpected error creating logger: %v", err)
	}

	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			l.Infof("goroutine message %d", idx)
			_, _ = l.Write([]byte("raw chunk\n"))
		}(i)
	}
	wg.Wait()

	_ = l.Close()

	content, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("failed reading log file: %v", err)
	}

	if len(content) == 0 {
		t.Errorf("expected non-empty log file after concurrent writes")
	}
}

func TestLogger_NilSafe(t *testing.T) {
	var l *Logger

	// None of these should panic
	l.Debugf("debug")
	l.Infof("info")
	l.Warnf("warn")
	l.Errorf("error")

	n, err := l.Write([]byte("test"))
	if err != nil || n != 4 {
		t.Errorf("expected nil logger Write to return len, nil; got %d, %v", n, err)
	}

	if err := l.Close(); err != nil {
		t.Errorf("expected nil logger Close to return nil, got: %v", err)
	}

	if path := l.FilePath(); path != "" {
		t.Errorf("expected empty path, got: %s", path)
	}
}

func TestParseLevel(t *testing.T) {
	tests := []struct {
		input    string
		expected Level
	}{
		{"DEBUG", LevelDebug},
		{"debug", LevelDebug},
		{"INFO", LevelInfo},
		{"info", LevelInfo},
		{"WARN", LevelWarn},
		{"WARNING", LevelWarn},
		{"ERROR", LevelError},
		{"error", LevelError},
		{"unknown", LevelInfo},
	}

	for _, tc := range tests {
		got := ParseLevel(tc.input)
		if got != tc.expected {
			t.Errorf("ParseLevel(%q) = %v; want %v", tc.input, got, tc.expected)
		}
	}
}

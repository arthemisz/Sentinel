package scanner

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/sentinel-sast/sentinel/cli/internal/model"
	"github.com/sentinel-sast/sentinel/cli/pkg/analyzer"
)

// Scanner coordinates concurrent file parsing, AST taint flow analysis, and process orchestration.
type Scanner struct {
	rules      []TaintRule
	engines    []DeterministicEngine
	numWorkers int
	version    string
	progressFn ProgressFunc
}

// Option configures Scanner parameters.
type Option func(*Scanner)

// WithWorkers overrides worker count.
func WithWorkers(workers int) Option {
	return func(s *Scanner) {
		if workers > 0 {
			s.numWorkers = workers
		}
	}
}

// WithEngine registers an external process scanning engine.
func WithEngine(engine DeterministicEngine) Option {
	return func(s *Scanner) {
		s.engines = append(s.engines, engine)
	}
}

// ProgressFunc reports scanning progress as files are analyzed.
type ProgressFunc func(current, total int, loc int64, currentFile string)

// WithProgress registers a live progress callback invoked as files are parsed.
func WithProgress(fn ProgressFunc) Option {
	return func(s *Scanner) {
		s.progressFn = fn
	}
}

// NewScanner instantiates a concurrent SAST orchestrator.
func NewScanner(version string, opts ...Option) *Scanner {
	s := &Scanner{
		rules:      DefaultRules(),
		engines:    make([]DeterministicEngine, 0),
		numWorkers: runtime.NumCPU() * 2,
		version:    version,
	}

	rustEngine := NewSentinelCoreEngine()
	if rustEngine.Available() {
		s.engines = append(s.engines, rustEngine)
	}

	for _, opt := range opts {
		opt(s)
	}

	return s
}

type fileJob struct {
	path string
	rel  string
}

type fileResult struct {
	lines    int
	findings []model.Finding
	err      error
}

// ScanDirectory orchestrates concurrent file traversal, taint parsing, and engine execution.
func (s *Scanner) ScanDirectory(ctx context.Context, targetDir string) (*model.ScanPayload, error) {
	startTime := time.Now()

	absTarget, err := filepath.Abs(targetDir)
	if err != nil {
		return nil, fmt.Errorf("invalid scan target path '%s': %w", targetDir, err)
	}

	info, err := os.Stat(absTarget)
	if err != nil {
		return nil, fmt.Errorf("target path '%s' does not exist or is inaccessible: %w", absTarget, err)
	}

	if !info.IsDir() {
		return nil, fmt.Errorf("target path '%s' must be a directory", absTarget)
	}

	payload := model.NewScanPayload(absTarget, s.version)

	// Extract VCS metadata using os/exec
	payload.Git = ExtractGitContext(ctx, absTarget)

	// Collect target files
	files, err := s.collectFiles(absTarget)
	if err != nil {
		return nil, fmt.Errorf("failed collecting source files: %w", err)
	}

	// Concurrent file analysis worker pool
	jobs := make(chan fileJob, 100)
	results := make(chan fileResult, 100)

	var wg sync.WaitGroup
	workers := s.numWorkers
	if workers > len(files) && len(files) > 0 {
		workers = len(files)
	}
	if workers < 1 {
		workers = 1
	}

	// Launch worker goroutines
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range jobs {
				select {
				case <-ctx.Done():
					return
				default:
					res := s.parseFile(job.path, job.rel)
					results <- res
				}
			}
		}()
	}

	// Producer goroutine: feed files into jobs channel
	go func() {
		for _, f := range files {
			rel, _ := filepath.Rel(absTarget, f)
			jobs <- fileJob{path: f, rel: filepath.ToSlash(rel)}
		}
		close(jobs)
	}()

	// Monitor completion and close results channel
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collector: aggregate results from workers
	var totalLOC int64
	var totalFiles int64
	var astFindings []model.Finding

	totalCount := len(files)
	for res := range results {
		if res.err != nil {
			continue
		}
		cur := int(atomic.AddInt64(&totalFiles, 1))
		loc := atomic.AddInt64(&totalLOC, int64(res.lines))
		if len(res.findings) > 0 {
			astFindings = append(astFindings, res.findings...)
		}
		if s.progressFn != nil {
			s.progressFn(cur, totalCount, loc, "")
		}
	}

	payload.Findings = append(payload.Findings, astFindings...)
	payload.Stats.EnginesRan = append(payload.Stats.EnginesRan, "Sentinel-TaintAST-v2")

	// Orchestrate any registered external process engines via os/exec
	for _, engine := range s.engines {
		if engine.Available() {
			payload.Stats.EnginesRan = append(payload.Stats.EnginesRan, engine.Name())
			extFindings, extErr := engine.Execute(ctx, absTarget)
			if extErr == nil && len(extFindings) > 0 {
				payload.Findings = append(payload.Findings, extFindings...)
			}
		}
	}

	payload.Stats.FilesScanned = int(totalFiles)
	payload.Stats.LinesOfCode = int(totalLOC)
	payload.Stats.DurationMs = time.Since(startTime).Milliseconds()

	return payload, nil
}

// collectFiles discovers scannable code files while ignoring build artifacts and dependencies.
func (s *Scanner) collectFiles(root string) ([]string, error) {
	return analyzer.CollectFiles(root)
}

// parseFile streams and inspects lines of code for source-to-sink taint flows.
func (s *Scanner) parseFile(path, relPath string) fileResult {
	f, err := os.Open(path)
	if err != nil {
		return fileResult{err: err}
	}
	defer f.Close()

	ext := strings.ToLower(filepath.Ext(path))
	var activeRules []TaintRule
	for _, r := range s.rules {
		for _, e := range r.FileExtensions {
			if e == ext {
				activeRules = append(activeRules, r)
				break
			}
		}
	}

	scanner := bufio.NewScanner(f)
	var lines []string
	locCount := 0

	for scanner.Scan() {
		line := scanner.Text()
		lines = append(lines, line)
		if strings.TrimSpace(line) != "" {
			locCount++
		}
	}

	var findings []model.Finding
	findingIndex := 1

	// Inspect lines for source and sink patterns
	for idx, line := range lines {
		lineNum := idx + 1
		for _, rule := range activeRules {
			// Check if current line or vicinity contains sink
			if rule.SinkRegex.MatchString(line) {
				// Search backward up to 10 lines for tainted source
				sourceFound := false
				sourceLine := ""
				startIdx := idx - 10
				if startIdx < 0 {
					startIdx = 0
				}

				for backIdx := idx; backIdx >= startIdx; backIdx-- {
					if rule.SourceRegex.MatchString(lines[backIdx]) {
						sourceFound = true
						sourceLine = strings.TrimSpace(lines[backIdx])
						break
					}
				}

				if sourceFound || rule.SourceRegex.MatchString(line) {
					// Extract snippet with context
					snippetStart := idx - 2
					if snippetStart < 0 {
						snippetStart = 0
					}
					snippetEnd := idx + 2
					if snippetEnd >= len(lines) {
						snippetEnd = len(lines) - 1
					}

					var snippet strings.Builder
					for sIdx := snippetStart; sIdx <= snippetEnd; sIdx++ {
						if sIdx == idx {
							snippet.WriteString(">> ")
						} else {
							snippet.WriteString("   ")
						}
						snippet.WriteString(lines[sIdx])
						snippet.WriteString("\n")
					}

					srcDesc := rule.TaintSource
					if sourceLine != "" {
						srcDesc = sourceLine
					}

					findings = append(findings, model.Finding{
						ID:          fmt.Sprintf("%s-%d", rule.ID, findingIndex),
						Category:    rule.Category,
						Title:       rule.Title,
						CWE:         rule.CWE,
						Severity:    rule.Severity,
						Language:    detectLanguage(ext),
						FilePath:    relPath,
						LineNumber:  lineNum,
						TaintSource: srcDesc,
						TaintSink:   rule.TaintSink,
						CodeSnippet: strings.TrimRight(snippet.String(), "\n"),
						Engine:      "Sentinel-AST-Engine",
					})
					findingIndex++
				}
			}
		}
	}

	return fileResult{
		lines:    locCount,
		findings: findings,
	}
}

func detectLanguage(ext string) string {
	switch ext {
	case ".go":
		return "Go"
	case ".ts", ".tsx":
		return "TypeScript"
	case ".js", ".jsx":
		return "JavaScript"
	case ".py":
		return "Python"
	case ".java":
		return "Java"
	case ".php":
		return "PHP"
	default:
		return "Universal"
	}
}

package reporter

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/sentinel-sast/sentinel/cli/internal/model"
)

// Reporter handles terminal output formatting and report file exporting.
type Reporter struct {
	out io.Writer
}

// NewReporter creates a new reporter outputting to the specified writer.
func NewReporter(out io.Writer) *Reporter {
	if out == nil {
		out = os.Stdout
	}
	return &Reporter{out: out}
}

// ExportJSON dumps the raw normalized scan payload directly into the target file in current working directory.
func (r *Reporter) ExportJSON(payload *model.ScanPayload, exportTarget string) (string, error) {
	filename := "sentinel-report.json"
	if exportTarget != "" && exportTarget != "json" && !strings.EqualFold(exportTarget, "true") {
		filename = exportTarget
	}

	cwd, err := os.Getwd()
	if err != nil {
		cwd = "."
	}

	outputPath := filepath.Join(cwd, filename)
	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed marshaling JSON report: %w", err)
	}

	if err := os.WriteFile(outputPath, data, 0644); err != nil {
		return "", fmt.Errorf("failed writing export file '%s': %w", outputPath, err)
	}

	return outputPath, nil
}

// PrintBanner outputs the Sentinel CLI ASCII header.
func (r *Reporter) PrintBanner(version string) {
	fmt.Fprintf(r.out, "\n")
	fmt.Fprintf(r.out, "  ███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗     \n")
	fmt.Fprintf(r.out, "  ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║     \n")
	fmt.Fprintf(r.out, "  ███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║     \n")
	fmt.Fprintf(r.out, "  ╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║     \n")
	fmt.Fprintf(r.out, "  ███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗\n")
	fmt.Fprintf(r.out, "  ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝\n")
	fmt.Fprintf(r.out, "  Deterministic SAST & Interprocedural Taint Engine [v%s]\n\n", version)
}

// PrintScanSummary prints stats for the local AST indexing stage.
func (r *Reporter) PrintScanSummary(payload *model.ScanPayload) {
	fmt.Fprintf(r.out, "[+] Target path: %s\n", payload.TargetPath)
	if payload.Git.Commit != "" {
		fmt.Fprintf(r.out, "[+] Git: branch=%s commit=%s\n", payload.Git.Branch, truncate(payload.Git.Commit, 8))
	}
	fmt.Fprintf(r.out, "[+] Indexed %d files (%d LOC) in %dms\n",
		payload.Stats.FilesScanned,
		payload.Stats.LinesOfCode,
		payload.Stats.DurationMs,
	)
	fmt.Fprintf(r.out, "[+] Underlying engines orchestrated: %s\n", strings.Join(payload.Stats.EnginesRan, ", "))
	fmt.Fprintf(r.out, "[+] Identified %d candidate taint path(s)\n\n", len(payload.Findings))
}

// PrintCloudVerification renders the verified findings and Taint Graph results from the cloud.
func (r *Reporter) PrintCloudVerification(resp *model.CloudScanResponse) {
	fmt.Fprintf(r.out, "=== SENTINEL CLOUD TAINT GRAPH & LLM VERIFICATION ===\n")
	fmt.Fprintf(r.out, "Scan ID: %s | Status: %s\n", resp.ScanID, resp.Status)
	fmt.Fprintf(r.out, "Taint Graph: evaluated %d nodes, traversed %d edges in %dms (LLM: %dms)\n",
		resp.TaintGraph.NodesEvaluated,
		resp.TaintGraph.EdgesTraversed,
		resp.TaintGraph.TraversalDurationMs,
		resp.TaintGraph.LLMVerificationDurationMs,
	)
	fmt.Fprintf(r.out, "Summary: %d Verified True Positive(s) | %d Filtered Noise/Sanitized\n",
		resp.Summary.ConfirmedTruePositives,
		resp.Summary.FilteredFalsePositives,
	)
	fmt.Fprintf(r.out, "Breakdown: Critical=%d | High=%d | Medium=%d | Low=%d\n\n",
		resp.Summary.CriticalCount,
		resp.Summary.HighCount,
		resp.Summary.MediumCount,
		resp.Summary.LowCount,
	)

	if len(resp.Findings) == 0 {
		fmt.Fprintf(r.out, "✓ Clean codebase. No vulnerabilities detected.\n\n")
		return
	}

	// Table header
	fmt.Fprintf(r.out, "%-10s %-12s %-32s %-25s %s\n", "SEVERITY", "CWE", "RULE / TITLE", "LOCATION", "VERDICT")
	fmt.Fprintf(r.out, "%s\n", strings.Repeat("-", 105))

	for _, f := range resp.Findings {
		loc := fmt.Sprintf("%s:%d", f.FilePath, f.LineNumber)
		verdictDisplay := f.Verdict
		if f.Verdict == "CONFIRMED_TRUE_POSITIVE" {
			verdictDisplay = fmt.Sprintf("✓ Confirmed (%.1f%%)", f.Confidence*100)
		} else if f.Verdict == "FILTERED_FALSE_POSITIVE" {
			verdictDisplay = fmt.Sprintf("✗ Filtered (%.1f%%)", f.Confidence*100)
		}

		fmt.Fprintf(r.out, "%-10s %-12s %-32s %-25s %s\n",
			f.Severity,
			f.CWE,
			truncate(f.Title, 30),
			truncate(loc, 23),
			verdictDisplay,
		)

		if f.TaintSource != "" && f.TaintSink != "" {
			fmt.Fprintf(r.out, "   ├─ Source: %s\n", truncate(f.TaintSource, 60))
			fmt.Fprintf(r.out, "   ├─ Sink:   %s\n", truncate(f.TaintSink, 60))
		}
		if f.LLMReasoning != "" {
			fmt.Fprintf(r.out, "   └─ Rationale: %s\n", truncate(f.LLMReasoning, 85))
		}
		fmt.Fprintf(r.out, "\n")
	}
}

func truncate(str string, maxLen int) string {
	if len(str) <= maxLen {
		return str
	}
	if maxLen < 3 {
		return str[:maxLen]
	}
	return str[:maxLen-3] + "..."
}

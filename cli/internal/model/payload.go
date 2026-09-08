package model

import "time"

// Severity represents the vulnerability risk rating.
type Severity string

const (
	SeverityCritical Severity = "Critical"
	SeverityHigh     Severity = "High"
	SeverityMedium   Severity = "Medium"
	SeverityLow      Severity = "Low"
)

// Finding represents a candidate or detected vulnerability in the AST/taint graph.
type Finding struct {
	ID          string   `json:"id"`
	Category    string   `json:"category"`
	Title       string   `json:"title"`
	CWE         string   `json:"cwe"`
	Severity    Severity `json:"severity"`
	Language    string   `json:"language"`
	FilePath    string   `json:"filePath"`
	LineNumber  int      `json:"lineNumber"`
	TaintSource string   `json:"taintSource"`
	TaintSink   string   `json:"taintSink"`
	CodeSnippet string   `json:"codeSnippet"`
	Engine      string   `json:"engine"`
}

// GitContext captures version control metadata for the scanned target.
type GitContext struct {
	Branch     string `json:"branch,omitempty"`
	Commit     string `json:"commit,omitempty"`
	Repository string `json:"repository,omitempty"`
	Author     string `json:"author,omitempty"`
}

// ScanStats captures performance metrics and scope of the scan.
type ScanStats struct {
	FilesScanned int      `json:"filesScanned"`
	LinesOfCode  int      `json:"linesOfCode"`
	DurationMs   int64    `json:"durationMs"`
	EnginesRan   []string `json:"enginesRan"`
}

// ScanPayload is the normalized payload transmitted to Sentinel Cloud or dumped locally.
type ScanPayload struct {
	ScanID        string     `json:"scanId"`
	Timestamp     string     `json:"timestamp"`
	TargetPath    string     `json:"targetPath"`
	EngineVersion string     `json:"engineVersion"`
	Git           GitContext `json:"git"`
	Stats         ScanStats  `json:"stats"`
	Findings      []Finding  `json:"findings"`
}

// NewScanPayload initializes a scan payload with sensible defaults.
func NewScanPayload(targetPath string, engineVersion string) *ScanPayload {
	return &ScanPayload{
		ScanID:        generateScanID(),
		Timestamp:     time.Now().UTC().Format(time.RFC3339),
		TargetPath:    targetPath,
		EngineVersion: engineVersion,
		Findings:      make([]Finding, 0),
		Stats: ScanStats{
			EnginesRan: make([]string, 0),
		},
	}
}

// VerifiedFinding represents a finding enriched by Sentinel Cloud's Taint Graph & LLM Verifier.
type VerifiedFinding struct {
	Finding
	Verdict          string  `json:"verdict"`
	Confidence       float64 `json:"confidence"`
	LLMReasoning     string  `json:"llmReasoning"`
	RemediationPatch string  `json:"remediationPatch,omitempty"`
	VerifiedAt       string  `json:"verifiedAt,omitempty"`
}

// VerificationSummary aggregates verification counts from Sentinel Cloud.
type VerificationSummary struct {
	TotalCandidatePaths    int `json:"totalCandidatePaths"`
	ConfirmedTruePositives int `json:"confirmedTruePositives"`
	FilteredFalsePositives int `json:"filteredFalsePositives"`
	CriticalCount          int `json:"criticalCount"`
	HighCount              int `json:"highCount"`
	MediumCount            int `json:"mediumCount"`
	LowCount               int `json:"lowCount"`
}

// TaintGraphMetrics contains graph traversal telemetry from the cloud engine.
type TaintGraphMetrics struct {
	NodesEvaluated            int   `json:"nodesEvaluated"`
	EdgesTraversed            int   `json:"edgesTraversed"`
	TraversalDurationMs       int64 `json:"traversalDurationMs"`
	LLMVerificationDurationMs int64 `json:"llmVerificationDurationMs"`
}

// CloudScanResponse is the response received from Next.js Cloud Platform API route.
type CloudScanResponse struct {
	Success    bool                `json:"success"`
	ScanID     string              `json:"scanId"`
	Status     string              `json:"status"`
	VerifiedAt string              `json:"verifiedAt"`
	Summary    VerificationSummary `json:"summary"`
	TaintGraph TaintGraphMetrics   `json:"taintGraph"`
	Findings   []VerifiedFinding   `json:"findings"`
	Error      string              `json:"error,omitempty"`
}

func generateScanID() string {
	return "scn_" + time.Now().Format("20060102150405")
}

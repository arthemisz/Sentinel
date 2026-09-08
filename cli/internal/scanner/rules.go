package scanner

import (
	"regexp"

	"github.com/sentinel-sast/sentinel/cli/internal/model"
)

// TaintRule defines a deterministic security rule for AST/source code analysis.
type TaintRule struct {
	ID             string
	Category       string
	Title          string
	CWE            string
	Severity       model.Severity
	Language       string
	SourceRegex    *regexp.Regexp
	SinkRegex      *regexp.Regexp
	TaintSource    string
	TaintSink      string
	FileExtensions []string
}

// DefaultRules returns the standard set of Sentinel SAST rules.
func DefaultRules() []TaintRule {
	return []TaintRule{
		{
			ID:          "CWE-089-SQLI",
			Category:    "Injection",
			Title:       "SQL Injection via Unsanitized Input Concatenation",
			CWE:         "CWE-89",
			Severity:    model.SeverityCritical,
			Language:    "Universal",
			SourceRegex: regexp.MustCompile(`(?i)(req\.(query|body|params)|request\.(args|form|get_data)|r\.URL\.Query)`),
			SinkRegex:   regexp.MustCompile(`(?i)(db\.(query|raw|exec)|query\s*=|execute\s*\(|SELECT\s+.*WHERE.*(\+|\$|%s))`),
			TaintSource: "HTTP Request parameters",
			TaintSink:   "rawDatabaseQuery() / db.Exec()",
			FileExtensions: []string{".js", ".ts", ".tsx", ".py", ".go", ".java", ".php"},
		},
		{
			ID:          "CWE-502-DESERIALIZATION",
			Category:    "Remote Code Execution",
			Title:       "Unsafe Deserialization via Untrusted Object Loader",
			CWE:         "CWE-502",
			Severity:    model.SeverityCritical,
			Language:    "Python",
			SourceRegex: regexp.MustCompile(`(?i)(request\.(get_data|data|json)|payload|untrusted_data)`),
			SinkRegex:   regexp.MustCompile(`(?i)(yaml\.load\(.*Loader\s*=\s*yaml\.(Loader|FullLoader|UnsafeLoader)|pickle\.loads?\()`),
			TaintSource: "request.get_data() / untrusted stream",
			TaintSink:   "yaml.load(payload, Loader=yaml.Loader)",
			FileExtensions: []string{".py"},
		},
		{
			ID:          "CWE-918-SSRF",
			Category:    "Server-Side Request Forgery",
			Title:       "Blind SSRF via Unrestricted Destination Fetch",
			CWE:         "CWE-918",
			Severity:    model.SeverityCritical,
			Language:    "Universal",
			SourceRegex: regexp.MustCompile(`(?i)(callbackUrl|webhook_url|req\.body\.url|event\.metadata\.callbackUrl)`),
			SinkRegex:   regexp.MustCompile(`(?i)(fetch\(|http\.Get\(|requests\.get\(|urllib\.request\.urlopen\()`),
			TaintSource: "event.metadata.callbackUrl / user URL param",
			TaintSink:   "fetch(callbackUrl) / http.Get()",
			FileExtensions: []string{".js", ".ts", ".tsx", ".py", ".go"},
		},
		{
			ID:          "CWE-639-BOLA",
			Category:    "Broken Object Level Auth",
			Title:       "Direct Tenant Record Exposure in Fast-Path Route",
			CWE:         "CWE-639",
			Severity:    model.SeverityMedium,
			Language:    "Universal",
			SourceRegex: regexp.MustCompile(`(?i)(path_param:\s*(org_id|tenant_id|user_id)|params\.id|org_id)`),
			SinkRegex:   regexp.MustCompile(`(?i)(repo\.find_by_id|findUnique|findByPk|get_active_keys_for_org)`),
			TaintSource: "path_param: org_id / tenant_id",
			TaintSink:   "repo.find_by_id(org_id) without auth boundary check",
			FileExtensions: []string{".py", ".ts", ".js", ".go"},
		},
		{
			ID:          "CWE-328-WEAK-CRYPTO",
			Category:    "Cryptographic Weakness",
			Title:       "Use of Weak Hashing Algorithm (MD5/SHA1) for Credentials",
			CWE:         "CWE-328",
			Severity:    model.SeverityMedium,
			Language:    "Universal",
			SourceRegex: regexp.MustCompile(`(?i)(password|secret|token|cred)`),
			SinkRegex:   regexp.MustCompile(`(?i)(md5\.New\(\)|md5\.Sum|hashlib\.md5|crypto\.createHash\(['"]md5['"]\))`),
			TaintSource: "plainPassword / credential string",
			TaintSink:   "md5.Sum() / md5.New()",
			FileExtensions: []string{".go", ".py", ".js", ".ts"},
		},
		{
			ID:          "CWE-079-XSS",
			Category:    "Cross-Site Scripting",
			Title:       "Reflected Cross-Site Scripting via Dynamic HTML Injection",
			CWE:         "CWE-79",
			Severity:    model.SeverityMedium,
			Language:    "Universal",
			SourceRegex: regexp.MustCompile(`(?i)(req\.query|search_param|userInput)`),
			SinkRegex:   regexp.MustCompile(`(?i)(innerHTML\s*=|dangerouslySetInnerHTML|res\.send\(.*<)`),
			TaintSource: "req.query.search",
			TaintSink:   "innerHTML = userInput",
			FileExtensions: []string{".js", ".ts", ".tsx", ".jsx"},
		},
	}
}

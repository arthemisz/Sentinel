#[derive(Debug, Clone)]
pub struct TaintRule {
    pub name: String,
    pub cwe: String,
    pub severity: String,
    pub source_patterns: Vec<&'static str>,
    pub sink_patterns: Vec<&'static str>,
    pub sanitizer_patterns: Vec<&'static str>,
    pub remediation: &'static str,
}

pub struct RuleRegistry {
    pub rules: Vec<TaintRule>,
}

impl Default for RuleRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl RuleRegistry {
    pub fn new() -> Self {
        let rules = vec![
            TaintRule {
                name: "SQL Injection via Concatenated Taint Flow".to_string(),
                cwe: "CWE-89".to_string(),
                severity: "Critical".to_string(),
                source_patterns: vec![
                    "req.query",
                    "req.body",
                    "req.params",
                    "request.args",
                    "request.form",
                    "r.URL.Query",
                    "r.FormValue",
                    "userInput",
                    "userId",
                ],
                sink_patterns: vec![
                    "query",
                    "execute",
                    "db.query",
                    "client.query",
                    "db.Exec",
                    "cursor.execute",
                    "rawQuery",
                ],
                sanitizer_patterns: vec![
                    "preparedstatement",
                    "parameterized",
                    "sanitize",
                    "escape",
                    "$1",
                    "?",
                ],
                remediation: "Use parameterized queries or prepared statements instead of dynamic SQL string interpolation.",
            },
            TaintRule {
                name: "Command Injection via Child Process Execution".to_string(),
                cwe: "CWE-78".to_string(),
                severity: "Critical".to_string(),
                source_patterns: vec![
                    "req.query",
                    "req.body",
                    "req.params",
                    "sys.argv",
                    "os.Args",
                    "userInput",
                    "targetHost",
                ],
                sink_patterns: vec![
                    "exec",
                    "child_process.exec",
                    "execSync",
                    "os.system",
                    "subprocess.Popen",
                    "exec.Command",
                ],
                sanitizer_patterns: vec![
                    "execFile",
                    "spawn",
                    "shell: false",
                    "allowlist",
                    "validateCommand",
                ],
                remediation: "Avoid invoking shell interpreters. Pass arguments as a structured array using execFile() or spawn() with shell: false.",
            },
            TaintRule {
                name: "Path Traversal in File Access Routine".to_string(),
                cwe: "CWE-22".to_string(),
                severity: "High".to_string(),
                source_patterns: vec![
                    "req.query.file",
                    "req.params.path",
                    "userInput",
                    "filePath",
                    "filename",
                ],
                sink_patterns: vec![
                    "readFile",
                    "readFileSync",
                    "createReadStream",
                    "open",
                    "os.Open",
                    "ioutil.ReadFile",
                ],
                sanitizer_patterns: vec![
                    "path.resolve",
                    "startsWith",
                    "filepath.Clean",
                    "filepath.Rel",
                ],
                remediation: "Resolve paths against an absolute base directory with path.resolve() and verify path.startsWith(baseDir) before file system access.",
            },
            TaintRule {
                name: "Server-Side Request Forgery (SSRF) in Remote Fetch".to_string(),
                cwe: "CWE-918".to_string(),
                severity: "High".to_string(),
                source_patterns: vec![
                    "req.query.url",
                    "req.body.target",
                    "destinationUrl",
                    "targetUrl",
                ],
                sink_patterns: vec![
                    "fetch",
                    "axios.get",
                    "http.get",
                    "https.request",
                    "requests.get",
                    "http.Get",
                ],
                sanitizer_patterns: vec![
                    "isPrivateIP",
                    "allowedDomains",
                    "validateUrl",
                    "checkHostAllowlist",
                ],
                remediation: "Validate destination hosts against a strict domain allowlist and explicitly reject private IP ranges (127.0.0.1, 10.0.0.0/8, 169.254.169.254).",
            },
            TaintRule {
                name: "Insecure Deserialization of Untrusted Object".to_string(),
                cwe: "CWE-502".to_string(),
                severity: "High".to_string(),
                source_patterns: vec![
                    "req.body",
                    "payload",
                    "serializedData",
                ],
                sink_patterns: vec![
                    "yaml.load",
                    "pickle.loads",
                    "unserialize",
                    "eval",
                ],
                sanitizer_patterns: vec![
                    "safeLoad",
                    "yaml.safe_load",
                    "JSON.parse",
                    "schema.parse",
                ],
                remediation: "Use safe parser loaders (such as yaml.safeLoad() or JSON.parse()) and validate input schemas using zod or joi.",
            },
        ];

        Self { rules }
    }
}

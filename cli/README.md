# Sentinel SAST CLI

High-performance Static Application Security Testing (SAST) and interprocedural taint flow engine for DevSecOps pipelines and local developer workflows.

## Architecture

Sentinel CLI is built upon the **Cobra** command framework and structured strictly following modern Go project conventions:

```
cli/
├── cmd/
│   ├── sentinel/
│   │   └── main.go       # Compiled binary entrypoint (enforces non-zero exit codes)
│   ├── root.go           # Root command with persistent flags (--export=json, --log-file, --config, --api-url)
│   ├── root_test.go      # Root command and flag unit tests
│   ├── login.go          # Interactive developer credential authentication
│   ├── login_test.go     # Login unit tests
│   ├── scan.go           # Core scan orchestration and CI/CD security gate
│   └── scan_test.go      # Scan orchestration unit tests
└── internal/
    ├── config/           # Local credential persistence via Viper
    │   ├── config.go
    │   └── config_test.go
    ├── logger/           # Thread-safe execution file logger & output streaming
    │   ├── logger.go
    │   └── logger_test.go
    ├── model/            # Strictly typed SAST payloads and verification models
    │   └── payload.go
    ├── scanner/          # AST taint analysis & os/exec process orchestration
    │   ├── engine.go     # Deterministic external engine runner
    │   ├── rules.go      # Deterministic taint source-to-sink definitions
    │   ├── git.go        # VCS context extractor using os/exec
    │   ├── scanner.go    # Concurrent worker-pool file parser
    │   └── scanner_test.go
    ├── client/           # Authenticated HTTP client using native net/http
    │   ├── client.go
    │   └── client_test.go
    └── reporter/         # Terminal summary & JSON exporter
        ├── reporter.go
        └── reporter_test.go
```

## Features

- **Cobra Command Structure with `RunE`**: Every command returns explicit errors to the root command, ensuring non-zero exit codes for seamless CI/CD pipeline blocking.
- **File Logging (`--log-file`)**: Thread-safe execution logging with ISO 8601 timestamps, log levels (`[INFO]`, `[WARN]`, `[ERROR]`, `[DEBUG]`), and full terminal output mirroring to disk (`sentinel.log` or custom path).
- **Viper Credential Persistence**: `sentinel login` prompts developers for their API key and securely persists credentials in `~/.sentinel/config.yaml` (with strict 0600 permissions).
- **Process Orchestration (`os/exec`)**: Seamlessly invokes underlying deterministic security scanning engines and VCS tools (`git`).
- **Concurrent File Parsing**: Traverses target directories using worker goroutines and worker pools for sub-second analysis of large codebases.
- **Native `net/http` Cloud Client**: Transmits normalized SAST JSON payloads and local Viper credentials to the Next.js Sentinel Cloud Platform API (`/api/scan`).
- **`--export=json` Interception**: When `--export=json` is provided, the CLI intercepts the cloud transmission and immediately dumps the raw, normalized JSON vulnerability report into the developer's working directory.

## Installation & Build

```bash
# Inside the cli directory
go build -o sentinel.exe ./cmd/sentinel
```

## Usage

### 1. Developer Login
```bash
# Interactive prompt
sentinel login

# Non-interactive / CI/CD
sentinel login --key <your-api-key>
```

### 2. Run Scan with Cloud Verification
```bash
sentinel scan .
```

### 3. Local Export (Intercept Cloud API)
```bash
sentinel scan . --export=json
```

### 4. File Logging
```bash
# Generate execution log file (defaults to sentinel.log)
sentinel scan . --log-file

# Specify custom log file destination
sentinel scan . --log-file=audit.log
```

### 5. CI/CD Pipeline Security Gate
```bash
# Fail CI build if any High or Critical vulnerabilities are confirmed
sentinel scan . --fail-on=high
```

## Running Tests

```bash
go test -v ./...
```


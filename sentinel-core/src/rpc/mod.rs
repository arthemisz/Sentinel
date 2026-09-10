use crate::ast::language::SupportedLanguage;
use crate::engine::SentinelEngine;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::io::{self, BufRead, Write};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: serde_json::Value,
    pub method: String,
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcResponse<T> {
    pub jsonrpc: String,
    pub id: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
}

pub fn run_json_rpc_loop() -> Result<()> {
    let stdin = io::stdin();
    let mut stdout = io::stdout();

    for line in stdin.lock().lines() {
        let line_str = line?;
        if line_str.trim().is_empty() {
            continue;
        }

        let request: JsonRpcRequest = match serde_json::from_str(&line_str) {
            Ok(req) => req,
            Err(e) => {
                let err_resp = JsonRpcResponse::<serde_json::Value> {
                    jsonrpc: "2.0".to_string(),
                    id: serde_json::Value::Null,
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32700,
                        message: format!("Parse error: {}", e),
                    }),
                };
                writeln!(stdout, "{}", serde_json::to_string(&err_resp)?)?;
                stdout.flush()?;
                continue;
            }
        };

        match request.method.as_str() {
            "ping" => {
                let resp = JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id: request.id,
                    result: Some(serde_json::json!({
                        "status": "pong",
                        "engine": "sentinel-core",
                        "version": env!("CARGO_PKG_VERSION")
                    })),
                    error: None,
                };
                writeln!(stdout, "{}", serde_json::to_string(&resp)?)?;
            }
            "analyze" | "analyzePath" | "analyze_path" => {
                let params = request.params.unwrap_or_default();
                let path = params
                    .get("path")
                    .and_then(|p| p.as_str())
                    .unwrap_or(".");
                let repo_url = params
                    .get("repoUrl")
                    .and_then(|u| u.as_str())
                    .unwrap_or("https://github.com/sentinel/sentinel-project");

                let engine = SentinelEngine::new(repo_url, "HEAD");
                match engine.analyze_path(path) {
                    Ok(report) => {
                        let resp = JsonRpcResponse {
                            jsonrpc: "2.0".to_string(),
                            id: request.id,
                            result: Some(report),
                            error: None,
                        };
                        writeln!(stdout, "{}", serde_json::to_string(&resp)?)?;
                    }
                    Err(e) => {
                        let resp = JsonRpcResponse::<serde_json::Value> {
                            jsonrpc: "2.0".to_string(),
                            id: request.id,
                            result: None,
                            error: Some(JsonRpcError {
                                code: -32000,
                                message: e.to_string(),
                            }),
                        };
                        writeln!(stdout, "{}", serde_json::to_string(&resp)?)?;
                    }
                }
            }
            "analyzeSource" | "analyze_source" => {
                let params = request.params.unwrap_or_default();
                let source = params
                    .get("source")
                    .and_then(|s| s.as_str())
                    .unwrap_or("");
                let filename = params
                    .get("filename")
                    .and_then(|f| f.as_str())
                    .unwrap_or("index.js");
                let lang_str = params
                    .get("language")
                    .and_then(|l| l.as_str())
                    .unwrap_or("javascript");

                let lang = match lang_str.to_lowercase().as_str() {
                    "js" | "javascript" => SupportedLanguage::JavaScript,
                    "ts" | "typescript" => SupportedLanguage::TypeScript,
                    "py" | "python" => SupportedLanguage::Python,
                    "go" => SupportedLanguage::Go,
                    _ => SupportedLanguage::from_path(filename),
                };

                let engine = SentinelEngine::default();
                match engine.analyze_source(source, filename, lang) {
                    Ok(report) => {
                        let resp = JsonRpcResponse {
                            jsonrpc: "2.0".to_string(),
                            id: request.id,
                            result: Some(report),
                            error: None,
                        };
                        writeln!(stdout, "{}", serde_json::to_string(&resp)?)?;
                    }
                    Err(e) => {
                        let resp = JsonRpcResponse::<serde_json::Value> {
                            jsonrpc: "2.0".to_string(),
                            id: request.id,
                            result: None,
                            error: Some(JsonRpcError {
                                code: -32000,
                                message: e.to_string(),
                            }),
                        };
                        writeln!(stdout, "{}", serde_json::to_string(&resp)?)?;
                    }
                }
            }
            _ => {
                let resp = JsonRpcResponse::<serde_json::Value> {
                    jsonrpc: "2.0".to_string(),
                    id: request.id,
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32601,
                        message: format!("Method not found: {}", request.method),
                    }),
                };
                writeln!(stdout, "{}", serde_json::to_string(&resp)?)?;
            }
        }
        stdout.flush()?;
    }
    Ok(())
}

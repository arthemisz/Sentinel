use clap::{Parser, Subcommand};
use sentinel_core::engine::SentinelEngine;
use sentinel_core::rpc::run_json_rpc_loop;
use std::fs;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "sentinel-core")]
#[command(about = "Sentinel High-Throughput SAST Graph Engine (AST, CFG, CG, PDG, Taint)", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Analyze source code directory and generate all 5 mathematical directed graphs
    Analyze {
        /// Target file or directory path
        #[arg(short, long, default_value = ".")]
        path: PathBuf,

        /// Repository URL metadata
        #[arg(long, default_value = "https://github.com/sentinel/sentinel-project")]
        repo_url: String,

        /// Git commit hash
        #[arg(long, default_value = "HEAD")]
        commit: String,

        /// Output JSON report file path (defaults to stdout)
        #[arg(short, long)]
        out: Option<PathBuf>,

        /// Format JSON with indentation
        #[arg(long, default_value_t = true)]
        pretty: bool,
    },

    /// Start JSON-RPC 2.0 server loop over stdin/stdout for Go CLI and subprocess orchestration
    Jsonrpc,

    /// Execute graph generation against sample vulnerable patterns to verify all 5 layers
    Demo {
        /// Format JSON with indentation
        #[arg(long, default_value_t = true)]
        pretty: bool,
    },
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Analyze {
            path,
            repo_url,
            commit,
            out,
            pretty,
        } => {
            let engine = SentinelEngine::new(&repo_url, &commit);
            let report = engine.analyze_path(&path)?;

            let json = if pretty {
                serde_json::to_string_pretty(&report)?
            } else {
                serde_json::to_string(&report)?
            };

            if let Some(out_path) = out {
                fs::write(&out_path, &json)?;
                eprintln!("[+] Sentinel graph report written to {}", out_path.display());
            } else {
                println!("{}", json);
            }
        }
        Commands::Jsonrpc => {
            run_json_rpc_loop()?;
        }
        Commands::Demo { pretty } => {
            let sample_code = r#"
const express = require('express');
const db = require('./database');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();

function queryUserProfile(userId) {
    // Taint source: userId parameter
    const queryStr = "SELECT * FROM users WHERE id = '" + userId + "'";
    // Taint sink: raw SQL executor
    return db.query(queryStr);
}

function backupUserData(targetFolder) {
    // Command Injection sink
    exec("tar -czf backup.tar.gz " + targetFolder);
}

function readReportFile(filename) {
    // Sanitized Path Traversal
    const safePath = path.resolve("/var/reports", filename);
    if (!safePath.startsWith("/var/reports")) {
        throw new Error("Access Denied");
    }
    return fs.readFileSync(safePath, "utf-8");
}

app.get('/user', (req, res) => {
    const userId = req.query.id;
    const user = queryUserProfile(userId);
    res.json(user);
});
"#;
            let engine = SentinelEngine::default();
            let report = engine.analyze_source(sample_code, "server.js", sentinel_core::SupportedLanguage::JavaScript)?;

            let json = if pretty {
                serde_json::to_string_pretty(&report)?
            } else {
                serde_json::to_string(&report)?
            };

            println!("{}", json);
        }
    }

    Ok(())
}

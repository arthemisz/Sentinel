"use client";

import React, { useState } from "react";
import {
  Terminal as TerminalIcon,
  Play,
  RotateCcw,
  Copy,
  Check,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileCode2,
} from "lucide-react";

export default function InteractiveTerminal() {
  const [running, setRunning] = useState(false);
  const [activeCommand, setActiveCommand] = useState("sentinel scan --depth=full");
  const [copied, setCopied] = useState(false);

  const commandPresets = [
    { label: "Full Repo Scan", cmd: "sentinel scan --depth=full" },
    { label: "PR Diff Scan", cmd: "sentinel scan --diff-only --sarif" },
    { label: "LLM Auto-Remediate", cmd: "sentinel remediate --auto-apply" },
  ];

  const handleRun = (cmd: string) => {
    setActiveCommand(cmd);
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
    }, 600);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(activeCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="product-cli" className="py-20 lg:py-28 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
            <TerminalIcon className="w-3.5 h-3.5 text-slate-800" />
            <span>Developer-Centric CLI</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Sub-Second Scans. Zero Context Switching.
          </h2>
          <p className="text-slate-600 text-base sm:text-lg">
            Run Sentinel locally in your terminal or embedded into your CI/CD runner.
            Scan 500k lines of code in under 1.4 seconds with SARIF standard export.
          </p>
        </div>

        {/* Command Preset Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
          <span className="text-xs font-medium text-slate-500 mr-2">Try Command:</span>
          {commandPresets.map((preset) => (
            <button
              key={preset.cmd}
              onClick={() => handleRun(preset.cmd)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition border ${
                activeCommand === preset.cmd
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Live Terminal Window */}
        <div className="max-w-4xl mx-auto bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden font-mono text-xs sm:text-[13px]">
          {/* Terminal Title Bar */}
          <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-slate-400 text-xs">
                sentinel-cli — zsh (80x24)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleRun(activeCommand)}
                disabled={running}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans transition cursor-pointer"
              >
                <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                <span>{running ? "Scanning..." : "Run Command"}</span>
              </button>

              <button
                onClick={handleCopy}
                className="p-1 text-slate-400 hover:text-slate-200 transition"
                title="Copy command"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Terminal Output */}
          <div className="p-5 sm:p-6 space-y-3 leading-relaxed text-slate-300 min-h-[340px]">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">➜</span>
              <span className="text-blue-400 font-bold">~/sentinel-project</span>
              <span className="text-slate-500">git:(main)</span>
              <span className="text-slate-100 font-semibold">$ {activeCommand}</span>
            </div>

            {running ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Parsing AST graphs & validating taint paths...</span>
              </div>
            ) : (
              <div className="space-y-2 pt-1 animate-fadeIn">
                <div className="text-slate-400">
                  [+] Sentinel SAST Engine v2.4.0 (arm64-darwin) initialized
                </div>
                <div className="text-slate-400">
                  [+] Indexed 1,482 files (312,490 LOC) in 284ms
                </div>
                <div className="text-slate-400">
                  [+] Traversing interprocedural control flow & taint sinks...
                </div>
                <div className="text-slate-400">
                  [+] Passing 4 candidate paths to LLM Exploitability Verifier...
                </div>

                {/* Table of findings */}
                <div className="pt-2">
                  <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60 p-3">
                    <div className="text-slate-400 text-[11px] pb-2 border-b border-slate-800/80 flex items-center justify-between font-semibold">
                      <span>SEVERITY / RULE</span>
                      <span>LOCATION</span>
                      <span>LLM VERDICT</span>
                    </div>

                    <div className="divide-y divide-slate-900 text-xs">
                      <div className="py-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-700/50 text-[11px] font-bold">
                            CRITICAL
                          </span>
                          <span className="text-slate-200">CWE-89: SQL Injection</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">src/api/auth.ts:84</span>
                        <span className="text-emerald-400 text-[11px] font-bold">
                          ✓ Confirmed True Positive
                        </span>
                      </div>

                      <div className="py-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/50 text-[11px] font-bold">
                            MEDIUM
                          </span>
                          <span className="text-slate-200">CWE-639: BOLA Invariant</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">controllers/bill.py:128</span>
                        <span className="text-emerald-400 text-[11px] font-bold">
                          ✓ Confirmed True Positive
                        </span>
                      </div>

                      <div className="py-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50 text-[11px] font-bold">
                            LOW
                          </span>
                          <span className="text-slate-200">CWE-1275: SameSite Cookie</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">middleware/sess.go:61</span>
                        <span className="text-emerald-400 text-[11px] font-bold">
                          ✓ Confirmed True Positive
                        </span>
                      </div>

                      <div className="py-2 flex items-center justify-between gap-2 opacity-60">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px]">
                            FILTERED
                          </span>
                          <span className="text-slate-400">CWE-79: Reflected XSS</span>
                        </div>
                        <span className="text-slate-500 text-[11px]">routes/view.ts:12</span>
                        <span className="text-slate-400 text-[11px]">
                          ✗ Rejected (DOMPurify Sanitized)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Final summary badge */}
                <div className="pt-2 text-emerald-400 flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Scan complete: 3 verified findings in 1,180ms. 0 false positives reported.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

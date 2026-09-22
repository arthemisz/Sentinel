"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle,
  ArrowRight,
  Zap,
} from "lucide-react";

export default function ArchitecturePipeline() {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      id: 0,
      number: "01",
      title: "Interprocedural AST & Taint Flow",
      badge: "Syntax & Semantics",
      description:
        "Sentinel constructs high-fidelity control-flow graphs across files and microservices, mapping every untrusted input from HTTP parameters and message queues straight to sensitive database sinks.",
      details: [
        "Cross-file symbol resolution in 35+ languages",
        "Tracks complex pointer aliasing and asynchronous callbacks",
        "Deterministic graph traversal under 1.2 milliseconds per file",
      ],
      codeSnippet: `// Step 1: Interprocedural Call Graph Traversal
[Source: HTTP Request body]
       │
       ▼
[Transformer: parseQueryParams()]
       │
       ▼ (Taint flag propagated: IS_UNSANITIZED)
[Sink: rawDatabaseQuery()] ──► 🚨 CANDIDATE_VULNERABILITY_FOUND`,
    },
    {
      id: 1,
      number: "02",
      title: "Deterministic LLM Exploitability Verification",
      badge: "Zero False Positives",
      description:
        "Instead of spamming developers with generic pattern matches, Sentinel feeds candidate taint paths into a specialized reasoning model with full codebase context to mathematically verify if the path is exploitable.",
      details: [
        "Evaluates custom sanitizers, ORM invariants, and middleware guards",
        "Eliminates 99.8% of noise that plagues legacy SAST tools",
        "Generates human-readable exploitability proofs with zero hallucinations",
      ],
      codeSnippet: `// Step 2: LLM Exploitability Verification
Evaluating candidate path: CWE-89 (SQL Injection)
- Middleware auth check: VALIDATED (Bearer token required)
- Input encoding: ABSENT (Raw string concat in src/db.ts:84)
- Sink parameterization: FAILED (db.raw called directly)
- Verdict: CONFIRMED_TRUE_POSITIVE (Confidence: 99.8%)`,
    },
    {
      id: 2,
      number: "03",
      title: "In-line PR Comments & 1-Click Fixes",
      badge: "Developer Velocity",
      description:
        "Findings arrive directly in developer pull requests with ready-to-merge fixes. No external dashboards, no endless security tickets, and zero context switching.",
      details: [
        "GitHub Actions, GitLab CI, and Bitbucket native webhooks",
        "Safe, idiomatic patches customized for your exact framework version",
        "94% developer merge rate within 24 hours of opening PR",
      ],
      codeSnippet: `// Step 3: Automated In-Line Pull Request Fix
- const query = \`SELECT * FROM users WHERE id = '\${userId}'\`;
+ const user = await prisma.user.findUnique({
+   where: { id: userId },
+   select: { id: true, email: true, role: true }
+ });
// Fix applied cleanly with 0 breaking schema changes.`,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-white dark:bg-black relative border-b border-slate-200 dark:border-white/10 transition-colors duration-200 overflow-hidden">
      {/* Ambient Gradients */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-purple-200/30 dark:bg-purple-900/15 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-amber-200/25 dark:bg-yellow-700/10 blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-gray-300 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-yellow-400" />
            <span>The Sentinel Engine</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How Sentinel Eliminates False Positives
          </h2>
          <p className="text-slate-600 dark:text-gray-400 font-mono text-sm sm:text-base">
            Traditional SAST relies on brittle regex patterns. Sentinel combines semantic graph
            theory with local LLM reasoning to ensure only verified, actionable vulnerabilities reach your team.
          </p>
        </div>

        {/* 3 Steps Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={`p-6 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                activeStep === idx
                  ? "bg-amber-500/10 dark:bg-white/10 border-amber-500/50 dark:border-yellow-500/50 shadow-md scale-[1.01]"
                  : "bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 hover:bg-slate-100/80 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/20"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-slate-400 dark:text-gray-400">
                    {step.number}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      idx === 1
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
                        : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-white/10"
                    }`}
                  >
                    {step.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed line-clamp-3 font-mono">
                  {step.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-yellow-400">
                <span>View Engine Stage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>

        {/* Interactive Step Detail Card */}
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left Detail Panel */}
            <div className="lg:col-span-5 p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>PHASE {steps[activeStep].number} OF 03</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {steps[activeStep].title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {steps[activeStep].description}
                </p>

                <div className="space-y-2.5 pt-4">
                  {steps[activeStep].details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 mt-6 border-t border-slate-100 dark:border-[#1e2330] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono">Execution time: &lt; 850ms</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">100% Deterministic</span>
              </div>
            </div>

            {/* Right Terminal / Flow Visualization */}
            <div className="lg:col-span-7 bg-slate-900 dark:bg-[#0a0c10] p-6 lg:p-8 font-mono text-xs sm:text-[13px] text-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 dark:border-[#1e2330] text-slate-400 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 text-slate-400">sentinel-core // engine.log</span>
                  </div>
                  <span className="text-[11px] text-slate-500">AST_RESOLVER_V2</span>
                </div>

                <pre className="overflow-x-auto whitespace-pre leading-relaxed text-slate-300">
                  <code>{steps[activeStep].codeSnippet}</code>
                </pre>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 dark:border-[#1e2330] flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zero code leaves customer perimeter</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">SOC2 Type II compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

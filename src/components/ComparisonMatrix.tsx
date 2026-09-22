"use client";

import React from "react";
import { Check, X, Shield } from "lucide-react";

export default function ComparisonMatrix() {
  const comparisonRows = [
    {
      feature: "False Positive Rate",
      sentinel: "< 0.2% (Eliminated by LLM verification)",
      legacy: "45% – 70% (Generic regex rules)",
      advantage: true,
    },
    {
      feature: "PR Scan Latency",
      sentinel: "Sub-second (< 1.5s median)",
      legacy: "35 – 90+ minutes (Build blocker)",
      advantage: true,
    },
    {
      feature: "Developer Remediation Rate",
      sentinel: "94% accepted in 24 hours",
      legacy: "12% (Ignored backlog in Jira)",
      advantage: true,
    },
    {
      feature: "Code Privacy & Retention",
      sentinel: "Zero retention; runs in customer perimeter",
      legacy: "Requires full repository upload to cloud",
      advantage: true,
    },
    {
      feature: "Fix Delivery Mechanism",
      sentinel: "Automated, idiomatic PR patches",
      legacy: "Static PDF reports & wiki hyperlinks",
      advantage: true,
    },
    {
      feature: "Configuration Overhead",
      sentinel: "Zero-config (auto-detects stack & routes)",
      legacy: "Weeks of tuning & custom rule writing",
      advantage: true,
    },
    {
      feature: "Taint Analysis Scope",
      sentinel: "Interprocedural cross-file & cross-service",
      legacy: "Single-file syntactic matching only",
      advantage: true,
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-white dark:bg-black relative border-b border-slate-200 dark:border-white/10 transition-colors duration-200 overflow-hidden">
      {/* Ambient Gradients from proj */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-purple-200/30 dark:bg-purple-900/15 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-amber-200/25 dark:bg-yellow-700/10 blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-gray-300">
            <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-yellow-400" />
            <span>Architectural Comparison</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Why Modern Engineering Teams Ditch Legacy SAST
          </h2>
          <p className="text-slate-600 dark:text-gray-400 font-mono text-sm sm:text-base">
            Legacy static analysis was designed 15 years ago for monolithic water-fall releases. Sentinel was architected from day one for continuous git-push velocity.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="max-w-5xl mx-auto bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40">
                  <th className="py-4 px-6 text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-gray-400 font-semibold w-1/3">
                    Capability / Metric
                  </th>
                  <th className="py-4 px-6 text-sm font-bold text-slate-900 dark:text-white bg-amber-500/10 dark:bg-yellow-500/5 border-x border-slate-200 dark:border-white/10 w-1/3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Sentinel SAST</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-yellow-500/10 text-amber-800 dark:text-yellow-400 font-semibold border border-amber-300 dark:border-yellow-500/20">
                        Next-Gen
                      </span>
                    </div>
                  </th>
                  <th className="py-4 px-6 text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-gray-500 font-semibold w-1/3">
                    Legacy Scanners (Checkmarx, Fortify)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#1e2330] text-sm">
                {comparisonRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50 dark:hover:bg-[#1a1f2e]/40 transition-colors"
                  >
                    <td className="py-4 px-6 font-medium text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                      {row.feature}
                    </td>
                    <td className="py-4 px-6 bg-amber-50/50 dark:bg-[#1a1f2e]/30 border-x border-slate-200 dark:border-[#252b3b] font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{row.sentinel}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                      <div className="flex items-start gap-2">
                        <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <span>{row.legacy}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#11141c] border-t border-slate-200 dark:border-[#1e2330] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono">
            <span>Independent benchmark tested across 1,000+ open-source and enterprise repositories</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">100% SARIF 2.1.0 Compliant</span>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import React, { useState } from "react";
import {
  Briefcase,
  ShieldAlert,
  Code2,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

interface SolutionsSectionProps {
  onOpenDemo?: () => void;
}

export default function SolutionsSection({ onOpenDemo }: SolutionsSectionProps) {
  const [activeTab, setActiveTab] = useState<"leaders" | "prodsec" | "engineering">(
    "leaders"
  );

  const tabs = [
    {
      id: "leaders" as const,
      label: "Security Leaders",
      icon: Briefcase,
      headline: "Strategic Code Governance Without Slowing Engineering Down",
      description:
        "Give your executive team full visibility into your enterprise security posture, track MTTD/MTTR reductions, and provide board-ready SOC 2 & ISO 27001 audit trails.",
      stats: [
        { value: "88%", label: "Reduction in AppSec triage backlog" },
        { value: "3.2x", label: "Faster vulnerability remediation velocity" },
        { value: "100%", label: "Code confidentiality with zero cloud retention" },
      ],
      features: [
        "Automated compliance mapping (OWASP Top 10, CWE Top 25, PCI-DSS 4.0)",
        "Enterprise-wide repository risk heatmaps and SLA enforcement",
        "Comprehensive executive PDF reports for board and auditor reviews",
        "SSO, RBAC, and granular audit log export via SIEM webhooks",
      ],
    },
    {
      id: "prodsec" as const,
      label: "Product Security",
      icon: ShieldAlert,
      headline: "Eliminate False Positive Fatigue & Triage Real Exploitable Bugs",
      description:
        "Stop wasting hundreds of engineering hours sorting through false alarms. Sentinel’s deep taint analysis and LLM verification ensure your AppSec team only evaluates verified exploitable paths.",
      stats: [
        { value: "0.2%", label: "Measured false positive rate across 50M LOC" },
        { value: "100%", label: "Interprocedural source-to-sink graph tracking" },
        { value: "< 2s", label: "Per-PR verification latency" },
      ],
      features: [
        "Interprocedural taint propagation across complex microservices",
        "Deterministic LLM reasoning engine validates custom sanitizers",
        "Declarative Rules-as-Code with backward-compatible Semgrep syntax",
        "Unified vulnerability triage dashboard with one-click Jira & Linear sync",
      ],
    },
    {
      id: "engineering" as const,
      label: "Software Engineering",
      icon: Code2,
      headline: "Security Built for Developer Joy, Not Friction",
      description:
        "No clunky external portals or 45-minute build delays. Sentinel delivers actionable, context-aware pull request comments with ready-to-merge patches right in your Git workflow.",
      stats: [
        { value: "< 1.5s", label: "Median scan latency in GitHub Actions" },
        { value: "94%", label: "PR fix acceptance rate by developers" },
        { value: "0", label: "Disruptive pipeline blockers for false positives" },
      ],
      features: [
        "Local terminal CLI and pre-commit hooks for instant author feedback",
        "Idiomatic inline PR suggestions with verified regression safety",
        "Zero IDE configuration required; runs seamlessly on Mac, Linux, and Windows",
        "Full support for TypeScript, Python, Go, Rust, Java, and C#",
      ],
    },
  ];

  const current = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <section id="solutions-leaders" className="py-20 lg:py-28 bg-slate-50 dark:bg-[#0c0e12] border-b border-slate-200/80 dark:border-[#1e2330] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-[#151820] border border-slate-200 dark:border-[#252b3b] text-xs font-mono text-slate-700 dark:text-slate-300 shadow-sm">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-800 dark:text-slate-300" />
            <span>Tailored Solutions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Security That Unites Engineering & Security Teams
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">
            Whether you are reporting to the board, triaging zero-days, or shipping features at breakneck velocity, Sentinel adapts to your role.
          </p>
        </div>

        {/* Role Selector Pills */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 rounded-xl bg-white dark:bg-[#151820] border border-slate-200/80 dark:border-[#252b3b] shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                    isActive
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#1a1f2e]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Box */}
        <div className="bg-white dark:bg-[#151820] border border-slate-200 dark:border-[#252b3b] rounded-2xl shadow-xl p-8 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Description & Features */}
            <div className="lg:col-span-7 space-y-6">
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-snug">
                {current.headline}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                {current.description}
              </p>

              <div className="space-y-3 pt-2">
                {current.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  onClick={onOpenDemo}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 text-sm font-medium transition shadow-sm cursor-pointer"
                >
                  <span>Learn how Sentinel helps {current.label}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Metric Highlights */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-[#11141c] border border-slate-200 dark:border-[#252b3b] rounded-xl p-6 lg:p-8 space-y-6">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Performance Impact
              </div>

              <div className="space-y-6">
                {current.stats.map((st, sIdx) => (
                  <div key={sIdx} className="space-y-1">
                    <div className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-sans">
                      {st.value}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {st.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-[#1e2330] text-xs text-slate-500 dark:text-slate-400 font-mono">
                Verified across production enterprise benchmarks
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

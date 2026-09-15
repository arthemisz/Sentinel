/**
 * =============================================================================
 * Sentinel SAST — Secure Developer Sign In Portal (/login)
 * =============================================================================
 *
 * Pure React Server Component rendering the GitHub OAuth pipeline.
 * Incorporates pure React Server Component GitHubSignInButton with native form
 * Server Actions, bypassing client event listeners entirely.
 */

import React from "react";
import Link from "next/link";
import { Shield, Key, Terminal, ArrowLeft, CheckCircle2 } from "lucide-react";
import GitHubSignInButton from "@/components/GitHubSignInButton";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = {
  title: "Sign In | Sentinel SAST Cloud Security",
  description: "Authenticate with GitHub to provision your Sentinel API key.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-[#0c0e12] px-4 py-12 selection:bg-slate-900 dark:selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Background radial highlight */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-slate-200/50 via-blue-100/30 to-indigo-100/20 dark:from-emerald-950/20 dark:via-blue-950/10 dark:to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Return to Home link & Theme Toggle */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sentinel SAST Platform</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Authentication Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#151820] rounded-2xl shadow-xl border border-slate-200/90 dark:border-[#252b3b] overflow-hidden z-10 transition-colors">
        {/* Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />

        <div className="p-8 space-y-6">
          {/* Header & Identity */}
          <div className="text-center space-y-2.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 dark:bg-[#0c0e12] border dark:border-[#252b3b] text-white shadow-md mx-auto">
              <Shield className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Sign in to Sentinel
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              Connect your GitHub account to automatically provision a secure Sentinel SAST API key for CLI scans.
            </p>
          </div>

          {/* GitHub OAuth Server Action Form */}
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <GitHubSignInButton buttonText="Sign In with GitHub" />
              <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
                Redirects securely to GitHub authorization endpoint
              </p>
            </div>

            {/* Architecture Highlights */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0c0e12] border border-slate-200 dark:border-[#1e2330] space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>Automated DevSecOps Provisioning</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 list-none pl-0">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>Unique <code className="font-mono text-slate-700 dark:text-emerald-400 bg-slate-200/60 dark:bg-[#151820] border border-slate-300/50 dark:border-[#252b3b] px-1 py-0.5 rounded font-medium">snt_live_...</code> API key injected on first sign-in</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>Permanent linkage with your GitHub developer identity</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>Zero code retention; read-only scope for authentication</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Terminal Hint */}
          <div className="pt-2 border-t border-slate-100 dark:border-[#1e2330] flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              sentinel login
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-sans font-medium">Auth.js v5 Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

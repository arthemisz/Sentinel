"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import VulnerabilityExplorer from "@/components/VulnerabilityExplorer";
import ArchitecturePipeline from "@/components/ArchitecturePipeline";
import DeepTaintGraphSection from "@/components/DeepTaintGraphSection";
import InteractiveTerminal from "@/components/InteractiveTerminal";
import SolutionsSection from "@/components/SolutionsSection";
import ComparisonMatrix from "@/components/ComparisonMatrix";
import Footer from "@/components/Footer";
import DemoModal from "@/components/DemoModal";
import SignInModal from "@/components/SignInModal";
import { ArrowRight, Sparkles, Check } from "lucide-react";

interface HomeClientWrapperProps {
  gitHubSignInSlot?: React.ReactNode;
}

export default function HomeClientWrapper({ gitHubSignInSlot }: HomeClientWrapperProps) {
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);

  const handleOpenDemo = () => {
    setDemoModalOpen(true);
  };

  const handleCloseDemo = () => {
    setDemoModalOpen(false);
  };

  const handleOpenSignIn = () => {
    setSignInModalOpen(true);
  };

  const handleCloseSignIn = () => {
    setSignInModalOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 dark:bg-black dark:text-gray-100 selection:bg-yellow-500/30 selection:text-slate-900 dark:selection:text-white font-sans relative">
      {/* Pinned Sticky Glassmorphic Navigation */}
      <Navbar onOpenDemo={handleOpenDemo} onOpenSignIn={handleOpenSignIn} />

      {/* Main Page Canvas */}
      <main className="flex-1">
        {/* Two-Column Hero Section */}
        <Hero onOpenDemo={handleOpenDemo} />

        {/* Interactive Vulnerability & LLM Verification Explorer */}
        <VulnerabilityExplorer />

        {/* 3-Stage Sentinel Engine Architecture */}
        <ArchitecturePipeline />

        {/* Deep Taint Graph Engine — 5-Layer Interactive Visualization */}
        <DeepTaintGraphSection />

        {/* Live Interactive CLI Sandbox */}
        <InteractiveTerminal />

        {/* Solutions for Security Leaders, Product Sec & Engineering */}
        <SolutionsSection onOpenDemo={handleOpenDemo} />

        {/* Sentinel vs Legacy SAST Comparison Matrix */}
        <ComparisonMatrix />

        {/* High-Impact Pre-Footer Conversion Banner with proj theme accents */}
        <section className="py-24 lg:py-28 bg-white dark:bg-black relative border-y border-slate-200 dark:border-white/10 overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full bg-purple-200/40 dark:bg-purple-900/30 blur-[140px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] rounded-full bg-amber-200/30 dark:bg-yellow-700/15 blur-[150px] pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-gray-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-yellow-400" />
              <span>Deploy in 3 minutes</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight max-w-3xl mx-auto">
              Ready to eliminate false positives from your security pipeline?
            </h2>

            <p className="text-base sm:text-lg text-slate-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed font-mono">
              Join engineering teams who have replaced noisy alerts with
              deterministic, developer-first code fixes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={handleOpenDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 text-black font-bold font-sans text-sm tracking-wider uppercase hover:opacity-95 shadow-[0_0_25px_rgba(234,179,8,0.3)] transition-all active:scale-95 cursor-pointer"
              >
                <span>Book a Technical Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleOpenSignIn}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full border border-slate-300 dark:border-white/20 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-white font-sans text-sm tracking-widest uppercase transition-colors active:scale-95 cursor-pointer"
              >
                <span>Sign In with GitHub</span>
              </button>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 dark:text-gray-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" />
                Zero code retention
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" />
                Works with existing GitHub/GitLab CI
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Interactive Booking Modal */}
      <DemoModal isOpen={demoModalOpen} onClose={handleCloseDemo} />

      {/* Developer Authentication Modal wired to pure React Server Component slot */}
      <SignInModal
        isOpen={signInModalOpen}
        onClose={handleCloseSignIn}
        gitHubSignInSlot={gitHubSignInSlot}
      />
    </div>
  );
}

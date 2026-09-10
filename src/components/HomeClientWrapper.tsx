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
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-slate-900 selection:text-white font-sans text-slate-900">
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

        {/* High-Impact Pre-Footer Conversion Banner */}
        <section className="py-20 lg:py-24 bg-white border-b border-slate-200/80 relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-slate-700" />
              <span>Deploy in 3 minutes</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight max-w-3xl mx-auto">
              Ready to eliminate false positives from your security pipeline?
            </h2>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Join hypergrowth engineering teams who have replaced noisy alerts with
              deterministic, developer-first code fixes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={handleOpenDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 shadow-md hover:shadow-lg transition-all active:scale-95 border border-slate-900 cursor-pointer"
              >
                <span>Book a Technical Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleOpenSignIn}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-slate-800 font-medium text-sm hover:bg-slate-50 border border-slate-300 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span>Sign In with GitHub</span>
              </button>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Zero code retention
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
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

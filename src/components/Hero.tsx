"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Terminal,
  Check,
  Copy,
  Sparkles,
  Zap,
  Lock,
  GitPullRequest,
  Play,
} from "lucide-react";
import SplineScene from "./SplineScene";
import VulnerabilityCard from "./VulnerabilityCard";

interface HeroProps {
  onOpenDemo?: () => void;
}

export default function Hero({ onOpenDemo }: HeroProps) {
  const [copiedCli, setCopiedCli] = useState(false);
  const cliCommand = "curl -fsSL https://sentinel.dev/install.sh | sh && sentinel scan";

  const handleCopyCli = () => {
    navigator.clipboard?.writeText(cliCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  // Staggered motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.05,
      },
    },
  };

  const itemSlideUp = {
    hidden: { opacity: 0, y: 28 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: "easeOut" as const },
    },
  };

  const cardEntrance = {
    hidden: { opacity: 0, y: 36, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.7, ease: "easeOut" as const, delay: 0.2 },
    },
  };

  const splineEntrance = {
    hidden: { opacity: 0, scale: 0.92 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.8, ease: "easeOut" as const, delay: 0.35 },
    },
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-20 lg:pt-14 lg:pb-32 bg-slate-50 bg-grid-subtle">
      {/* Subtle glowing ambient lighting in the background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-slate-200/40 via-blue-100/30 to-indigo-100/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center"
        >
          {/* LEFT COLUMN: Primary Typographic Messaging */}
          <div className="lg:col-span-6 space-y-7 text-left z-10">
            {/* Top Pill / Badge */}
            <motion.div variants={itemSlideUp} className="inline-flex">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-sm text-xs font-medium text-slate-700">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-semibold text-slate-900">Sentinel SAST 2.0</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-normal">
                  Zero False Positives by Design
                </span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.div variants={itemSlideUp}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08] font-sans">
                Redefining code security.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 block sm:inline">
                  Verified with zero noise.
                </span>
              </h1>
            </motion.div>

            {/* Dense, Technical Explanatory Copy */}
            <motion.div variants={itemSlideUp}>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl font-normal">
                Sentinel replaces brittle legacy scanners with deep, interprocedural taint
                analysis verified by deterministic reasoning engines. Integrate seamlessly
                into your GitHub or GitLab CI/CD pipeline in under three minutes, delivering
                automated zero-regression fixes that developers actually want to merge.
              </p>
            </motion.div>

            {/* Conversion CTA Action Buttons */}
            <motion.div
              variants={itemSlideUp}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1"
            >
              <button
                type="button"
                onClick={onOpenDemo}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 shadow-md hover:shadow-lg transition-all active:scale-95 group border border-slate-900"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={onOpenDemo}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-slate-800 font-medium text-sm hover:bg-slate-50 border border-slate-300/80 shadow-sm hover:border-slate-400 transition active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-slate-700 text-slate-700" />
                <span>Book a Technical Demo</span>
              </button>
            </motion.div>

            {/* CLI Quickstart Strip */}
            <motion.div variants={itemSlideUp} className="pt-2">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm max-w-lg">
                <div className="flex items-center justify-between gap-2 px-2 text-xs font-mono text-slate-600">
                  <div className="flex items-center gap-2 overflow-x-auto select-all">
                    <span className="text-slate-400 select-none">$</span>
                    <span className="text-slate-800 font-medium truncate">
                      {cliCommand}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCli}
                    className="shrink-0 p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition flex items-center gap-1 text-[11px]"
                    title="Copy command"
                  >
                    {copiedCli ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-sans">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline font-sans">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Trust Metrics & Social Proof */}
            <motion.div
              variants={itemSlideUp}
              className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-500"
            >
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>SOC 2 Type II Certified</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Sub-second Scan Latency</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>Zero Code Telemetry Retained</span>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Interactive 3D Canvas + Layered Bearer-style Vulnerability Card */}
          <div className="lg:col-span-6 relative flex flex-col items-center lg:items-end justify-center min-h-[500px]">
            {/* Background 3D Spline Asset Container */}
            <motion.div
              variants={splineEntrance}
              className="w-full h-full max-w-lg lg:max-w-none rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden"
            >
              <SplineScene />
            </motion.div>

            {/* Layered Bearer Signature UI Vulnerability Card */}
            <motion.div
              variants={cardEntrance}
              className="w-full max-w-xl lg:w-[108%] lg:-mt-36 lg:-mr-4 xl:-mr-8 z-20 drop-shadow-2xl"
            >
              <VulnerabilityCard interactive={true} />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

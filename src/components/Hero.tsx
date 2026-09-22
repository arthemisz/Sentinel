"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Check,
  Copy,
  Zap,
  Lock,
  Play,
  Sparkles,
} from "lucide-react";
import HeroLock3D from "./HeroLock3D";
import VulnerabilityCard from "./VulnerabilityCard";

interface HeroProps {
  onOpenDemo?: () => void;
}

export default function Hero({ onOpenDemo }: HeroProps) {
  const [copiedCli, setCopiedCli] = useState(false);
  const [showLiveCard, setShowLiveCard] = useState(false);
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
        staggerChildren: 0.12,
        delayChildren: 0.05,
      },
    },
  };

  const itemSlideUp = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: "easeOut" as const },
    },
  };

  const rightEntrance = {
    hidden: { opacity: 0, scale: 0.94 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.7, ease: "easeOut" as const, delay: 0.2 },
    },
  };

  return (
    <section className="relative overflow-hidden pt-6 pb-16 lg:pt-10 lg:pb-24 bg-white dark:bg-black text-slate-700 dark:text-gray-300 transition-colors duration-200">
      {/* 1. Ambient Atmospheric Radial Gradients (Purple & Yellow from proj theme) */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full bg-purple-200/40 dark:bg-purple-900/35 blur-[140px] -translate-y-1/4 translate-x-1/4 pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] rounded-full bg-amber-200/30 dark:bg-yellow-700/20 blur-[150px] translate-y-1/3 -translate-x-1/4 pointer-events-none z-0" />

      {/* 2. Massive Typographic Watermark (Giant SENTINEL in background) */}
      <h1 className="absolute z-0 text-[14vw] leading-none font-sans font-black text-slate-900/[0.03] dark:text-white/[0.04] tracking-tight w-full text-center select-none uppercase pointer-events-none top-1/2 -translate-y-1/2">
        SENTINEL
      </h1>

      {/* 3. Floating Top Accent Telemetry Bar from proj */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 text-xs font-mono tracking-widest text-slate-500 dark:text-gray-400">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Safeguarding Sentinel AST .
        </span>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-amber-600 dark:text-yellow-400/90">
          <Sparkles className="w-3.5 h-3.5" /> Zero Noise Architecture
        </span>
      </div>

      {/* 4. Main Hero Section Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center"
        >
          {/* LEFT COLUMN: Primary Typographic Messaging & Proj CTA Buttons */}
          <div className="lg:col-span-6 space-y-6 text-left z-10">
            {/* Status Pill Badge */}
            <motion.div variants={itemSlideUp} className="inline-flex">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm text-xs font-mono text-slate-700 dark:text-gray-300">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">Sentinel SAST 2.0</span>
                <span className="text-slate-300 dark:text-gray-600">|</span>
                <span className="text-slate-500 dark:text-gray-400 font-normal">
                  Zero False Positives by Design
                </span>
                <ArrowRight className="w-3 h-3 text-amber-600 dark:text-yellow-400" />
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.div variants={itemSlideUp}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.08] font-sans">
                Redefining code security.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 dark:from-yellow-400 dark:via-amber-300 dark:to-yellow-500 block sm:inline">
                  Verified with zero noise.
                </span>
              </h1>
            </motion.div>

            {/* Dense, Technical Explanatory Copy */}
            <motion.div variants={itemSlideUp}>
              <p className="text-sm sm:text-base text-slate-600 dark:text-gray-400 font-mono leading-relaxed max-w-xl">
                Sentinel replaces brittle legacy scanners with deep, interprocedural taint
                analysis verified by deterministic reasoning engines. Integrate into your GitHub or GitLab CI/CD pipeline in under three minutes, delivering
                automated zero-regression fixes that developers actually want to merge.
              </p>
            </motion.div>

            {/* Conversion CTA Action Buttons (Styled directly in the proj theme) */}
            <motion.div
              variants={itemSlideUp}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-1"
            >
              <button
                type="button"
                onClick={onOpenDemo}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 text-black font-bold font-sans text-sm tracking-wider uppercase hover:opacity-95 shadow-[0_0_25px_rgba(234,179,8,0.35)] transition-all active:scale-95 cursor-pointer group"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={onOpenDemo}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full border border-slate-300 dark:border-white/20 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-white font-sans text-sm tracking-widest uppercase transition-colors backdrop-blur-sm active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-amber-500 text-amber-500 dark:fill-yellow-400 dark:text-yellow-400" />
                <span>Request Info</span>
              </button>
            </motion.div>

            {/* CLI Quickstart Strip */}
            <motion.div variants={itemSlideUp} className="pt-2">
              <div className="p-2.5 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm max-w-lg">
                <div className="flex items-center justify-between gap-2 px-2 text-xs font-mono text-slate-600 dark:text-gray-400">
                  <div className="flex items-center gap-2 overflow-x-auto select-all">
                    <span className="text-amber-600 dark:text-yellow-400 select-none font-bold">$</span>
                    <span className="text-slate-800 dark:text-gray-200 font-medium truncate">
                      {cliCommand}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCli}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1 text-[11px] cursor-pointer"
                    title="Copy command"
                  >
                    {copiedCli ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-sans">Copied!</span>
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
              className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-500 dark:text-gray-400 font-mono"
            >
              <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-gray-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>SOC 2 Type II</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-gray-300">
                <Zap className="w-4 h-4 text-amber-600 dark:text-yellow-400" />
                <span>Sub-second Scan Latency</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-gray-300">
                <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Zero Code Telemetry Retained</span>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: 3D Security Lock from proj + Interactive Layer */}
          <div className="lg:col-span-6 relative flex flex-col items-center justify-center min-h-[460px] lg:min-h-[520px]">
            <motion.div variants={rightEntrance} className="w-full relative flex items-center justify-center">
              <AnimatePresence mode="wait">
                {!showLiveCard ? (
                  <motion.div
                    key="lock-3d"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.35 }}
                    className="w-full"
                  >
                    <HeroLock3D
                      onToggleCard={() => setShowLiveCard(true)}
                      isCardVisible={showLiveCard}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="vuln-card"
                    initial={{ opacity: 0, y: 20, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.96 }}
                    transition={{ duration: 0.35 }}
                    className="w-full max-w-xl z-20 space-y-3"
                  >
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowLiveCard(false)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200 dark:border-white/20 text-xs font-mono text-slate-700 dark:text-gray-300 cursor-pointer transition"
                      >
                        <Lock className="w-3 h-3 text-amber-600 dark:text-yellow-400" />
                        <span>Return to 3D Lock View</span>
                      </button>
                    </div>
                    <div className="drop-shadow-2xl">
                      <VulnerabilityCard interactive={true} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>

        {/* 5. Footer Stats & Client Logos from proj (Atmospheric Bottom Bar) */}
        <motion.div
          variants={itemSlideUp}
          className="mt-16 pt-10 border-t border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-start md:items-end justify-between gap-8 text-sm font-mono"
        >
          {/* Key Metric Numbers */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-10">
            <div>
              <div className="text-3xl font-sans font-bold text-slate-900 dark:text-white mb-0.5 tracking-tight">818+</div>
              <div className="tracking-widest text-xs uppercase text-slate-500 dark:text-gray-400">Clients Protected</div>
            </div>
            <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-white/15" />
            <div>
              <div className="text-3xl font-sans font-bold text-slate-900 dark:text-white mb-0.5 tracking-tight">70+</div>
              <div className="tracking-widest text-xs uppercase text-slate-500 dark:text-gray-400">Countries</div>
            </div>
            <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-white/15" />
            <div>
              <div className="text-3xl font-sans font-bold text-emerald-600 dark:text-emerald-400 mb-0.5 tracking-tight">0%</div>
              <div className="tracking-widest text-xs uppercase text-slate-500 dark:text-gray-400">False Positives</div>
            </div>
            <div className="hidden lg:block w-px h-10 bg-slate-200 dark:bg-white/15" />
            <div className="hidden lg:block text-xs text-slate-500 dark:text-gray-400 max-w-[210px] leading-relaxed tracking-wide">
              Dedicated to safeguarding enterprise codebases & cloud infrastructure.
            </div>
          </div>

          {/* Client & Partner Logos in proj Aesthetic */}
          <div className="flex items-center gap-6 opacity-75 hover:opacity-100 transition-opacity">
            <div className="font-bold font-sans flex items-center gap-1.5 text-sm text-slate-700 dark:text-gray-300">
              Sentinel <span className="text-base text-amber-500 dark:text-yellow-400">✿</span>
            </div>
            <div className="font-bold font-sans italic tracking-tighter text-purple-600 dark:text-purple-400 text-sm">
              excubitor
            </div>
            <div className="font-bold font-sans flex items-center gap-1.5 text-sm text-slate-700 dark:text-gray-300">
              <span className="text-sm text-amber-500 dark:text-yellow-400">❖</span> Sentinel SAST
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShieldCheck, Cpu, Zap, Activity, Layers, Sparkles } from "lucide-react";

interface HeroLock3DProps {
  onToggleCard?: () => void;
  isCardVisible?: boolean;
}

export default function HeroLock3D({ onToggleCard, isCardVisible = false }: HeroLock3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Mouse move handler for realistic 3D perspective rotation
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full min-h-[440px] sm:min-h-[500px] flex items-center justify-center select-none"
    >
      {/* 1. Atmospheric Ambient Radial Halos behind the Lock */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-purple-600/25 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-yellow-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* 2. Floating 3D Lock Container with Interactive Perspective Tilt */}
      <motion.div
        className="relative z-10 w-[360px] h-[360px] sm:w-[480px] sm:h-[440px] lg:w-[520px] lg:h-[460px] flex items-center justify-center cursor-grab active:cursor-grabbing"
        animate={{
          y: [-8, 8, -8],
          rotateZ: mousePos.x * 3,
        }}
        transition={{
          y: {
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
          },
          rotateZ: {
            duration: 0.2,
            ease: "easeOut",
          },
        }}
        style={{
          perspective: 1200,
          transform: `rotateY(${mousePos.x * 22}deg) rotateX(${-mousePos.y * 22}deg) scale3d(${
            isHovered ? 1.04 : 1
          }, ${isHovered ? 1.04 : 1}, 1)`,
          transition: "transform 0.15s ease-out",
        }}
      >
        {/* The 3D Security Lock Image */}
        <div className="relative w-full h-full drop-shadow-[0_20px_50px_rgba(168,85,247,0.3)] drop-shadow-[0_10px_35px_rgba(234,179,8,0.2)] filter">
          <Image
            src="/lock-opt.png"
            alt="Sentinel SAST 3D Security Lock"
            fill
            sizes="(max-width: 768px) 360px, 520px"
            className="object-contain pointer-events-none"
            priority
          />
        </div>

        {/* 3. Orbiting Cyber Telemetry Micro-Badges */}
        {/* Top-Left: AST Node Integrity */}
        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          className="absolute -top-2 -left-2 sm:top-4 sm:-left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/85 dark:bg-black/70 backdrop-blur-md border border-slate-200 dark:border-white/15 text-[11px] font-mono text-slate-800 dark:text-gray-200 shadow-xl"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-amber-600 dark:text-yellow-400 font-bold">AST_NODE:</span>
          <span>0x9F • VERIFIED</span>
        </motion.div>

        {/* Top-Right: Zero False Positives */}
        <motion.div
          animate={{ y: [4, -4, 4] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute -top-3 -right-2 sm:top-6 sm:-right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/85 dark:bg-black/70 backdrop-blur-md border border-amber-300/60 dark:border-yellow-500/30 text-[11px] font-mono text-slate-800 dark:text-gray-200 shadow-xl"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-500 dark:text-yellow-400" />
          <span className="text-amber-600 dark:text-yellow-400 font-bold">AI TRIAGE:</span>
          <span>0 FALSE POSITIVES</span>
        </motion.div>

        {/* Bottom-Left: Sub-second Taint Scan */}
        <motion.div
          animate={{ y: [-3, 3, -3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          className="absolute -bottom-2 -left-2 sm:bottom-4 sm:-left-2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/85 dark:bg-black/70 backdrop-blur-md border border-purple-300/60 dark:border-purple-500/30 text-[11px] font-mono text-slate-800 dark:text-gray-200 shadow-xl"
        >
          <Cpu className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span className="text-purple-600 dark:text-purple-400 font-bold">TAINT ENGINE:</span>
          <span>ACTIVE</span>
        </motion.div>

        {/* Bottom-Right: Latency Benchmark */}
        <motion.div
          animate={{ y: [3, -3, 3] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          className="absolute -bottom-3 -right-2 sm:bottom-6 sm:-right-2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/85 dark:bg-black/70 backdrop-blur-md border border-slate-200 dark:border-white/15 text-[11px] font-mono text-slate-800 dark:text-gray-200 shadow-xl"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span className="text-amber-600 dark:text-amber-400 font-bold">SCAN:</span>
          <span>42ms LATENCY</span>
        </motion.div>
      </motion.div>

      {/* 4. Interactive Mode Switch Pill */}
      {onToggleCard && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={onToggleCard}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-md border border-slate-200 dark:border-white/20 text-xs font-mono text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:border-amber-500/50 dark:hover:border-yellow-500/50 transition-all cursor-pointer shadow-lg"
          >
            <Layers className="w-3.5 h-3.5 text-amber-500 dark:text-yellow-400" />
            <span>{isCardVisible ? "Hide Live Triage Card" : "View Live Triage Card"}</span>
            <span className="text-[10px] text-slate-400 dark:text-gray-500 font-sans">| Interactive</span>
          </button>
        </div>
      )}
    </div>
  );
}

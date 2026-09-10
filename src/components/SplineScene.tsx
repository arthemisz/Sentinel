"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Lock, Cpu, Server, Wifi, Activity } from "lucide-react";

// Dynamically import Spline to prevent SSR issues
const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => null,
});

interface SplineSceneProps {
  sceneUrl?: string;
  className?: string;
}

export default function SplineScene({
  sceneUrl = "https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode",
  className = "",
}: SplineSceneProps) {
  const [splineLoaded, setSplineLoaded] = useState<boolean>(false);
  const [splineError, setSplineError] = useState<boolean>(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse move handler for interactive parallax fallback
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  // Timer to fallback cleanly if Spline CDN takes more than 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!splineLoaded) {
        setSplineError(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [splineLoaded]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative w-full h-full min-h-[420px] lg:min-h-[520px] rounded-2xl overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      {/* Background radial gradients for cyber node ambiance */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-100/80 via-slate-50 to-indigo-50/40 pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-80 h-80 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-slate-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Primary Spline 3D Scene Layer */}
      {!splineError && (
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            splineLoaded ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Spline
            scene={sceneUrl}
            onLoad={() => setSplineLoaded(true)}
            onError={() => setSplineError(true)}
          />
        </div>
      )}

      {/* Interactive High-Precision 3D Cyber Server & Lock Node (Active when loading or as backup) */}
      {(!splineLoaded || splineError) && (
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-8 transition-opacity duration-700">
          {/* Animated 3D Ring Structure */}
          <div
            className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center transition-transform duration-300 ease-out"
            style={{
              transform: `perspective(1000px) rotateY(${mousePos.x * 24}deg) rotateX(${-mousePos.y * 24}deg)`,
            }}
          >
            {/* Outer Orbit Ring with Cyber Dashes */}
            <div className="absolute inset-0 rounded-full border border-dashed border-slate-300/80 animate-[spin_20s_linear_infinite]" />
            <div className="absolute -inset-4 rounded-full border border-slate-200/60 animate-[spin_35s_linear_infinite_reverse]" />

            {/* Orbiting Security Node Indicators */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 shadow-sm rounded-full text-[10px] font-mono font-medium text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AST_NODE: 0x9F
            </div>

            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 shadow-sm rounded-full text-[10px] font-mono font-medium text-slate-600">
              <Activity className="w-2.5 h-2.5 text-blue-600" />
              TAINT_SCAN: PASS
            </div>

            <div className="absolute -left-4 top-1/2 -translate-y-1/2 p-2 bg-white border border-slate-200 shadow-sm rounded-lg text-slate-700">
              <Cpu className="w-4 h-4 text-slate-600" />
            </div>

            <div className="absolute -right-4 top-1/2 -translate-y-1/2 p-2 bg-white border border-slate-200 shadow-sm rounded-lg text-slate-700">
              <Server className="w-4 h-4 text-slate-600" />
            </div>

            {/* Middle Glowing Ring */}
            <div className="absolute inset-6 rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-200 shadow-[0_12px_36px_rgba(15,23,42,0.08)] border border-slate-200 flex items-center justify-center">
              {/* Internal Core Node */}
              <div className="relative w-36 h-36 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 p-6 flex flex-col items-center justify-center shadow-2xl border border-slate-700/50 group">
                {/* Glowing Core Pulse */}
                <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-xl group-hover:bg-blue-500/20 transition-all" />

                {/* Central Lock / Shield Emblem */}
                <div className="relative z-10 w-14 h-14 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center shadow-inner mb-2">
                  <Lock className="w-7 h-7 text-white animate-pulse" />
                </div>

                <div className="relative z-10 text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  SENTINEL_CORE
                </div>

                <div className="relative z-10 text-[9px] font-mono text-slate-400">
                  AST Graph Engine
                </div>
              </div>
            </div>

            {/* Floating Connection Lines */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent pointer-events-none" />
          </div>

          {/* Interactive Micro-badge */}
          <div className="mt-8 inline-flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-full text-xs font-mono text-slate-600">
            <Wifi className="w-3.5 h-3.5 text-slate-500" />
            <span>Interactive 3D Secure Node</span>
            <span className="text-[10px] text-slate-400">| Move cursor to rotate</span>
          </div>
        </div>
      )}
    </div>
  );
}

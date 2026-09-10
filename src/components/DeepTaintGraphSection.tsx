"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Shield,
  GitBranch,
  Network,
  Workflow,
  Bug,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Zap,
  FileCode,
  ChevronRight,
  Lock,
  Database,
  Terminal,
  ExternalLink,
  Activity,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TaintFlowNode {
  id: string;
  label: string;
  sublabel: string;
  role: "source" | "propagator" | "sanitizer" | "sink";
  line: number;
  file: string;
  cwe?: string;
  x: number;
  y: number;
}

interface TaintFlowEdge {
  id: string;
  source: string;
  target: string;
  kind: "direct" | "call_arg" | "return" | "sanitized";
  animated: boolean;
}

interface GraphLayerInfo {
  key: string;
  name: string;
  abbr: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  nodeCount: number;
  edgeCount: number;
}

interface FindingCard {
  id: string;
  rule: string;
  severity: "Critical" | "High" | "Medium";
  cwe: string;
  source: string;
  sink: string;
  file: string;
  line: number;
  isSanitized: boolean;
  confidence: string;
}

// ---------------------------------------------------------------------------
// Demo Data — Realistic SQL Injection taint path
// ---------------------------------------------------------------------------
const DEMO_NODES: TaintFlowNode[] = [
  {
    id: "src_1",
    label: "req.query.id",
    sublabel: "HTTP Query Parameter",
    role: "source",
    line: 12,
    file: "routes/user.js",
    cwe: "CWE-89",
    x: 60,
    y: 60,
  },
  {
    id: "prop_1",
    label: "userId",
    sublabel: "const userId = req.query.id",
    role: "propagator",
    line: 13,
    file: "routes/user.js",
    x: 60,
    y: 190,
  },
  {
    id: "prop_2",
    label: "queryUserProfile(userId)",
    sublabel: "Cross-function call boundary",
    role: "propagator",
    line: 14,
    file: "routes/user.js",
    x: 60,
    y: 320,
  },
  {
    id: "prop_3",
    label: "userId → param",
    sublabel: "function queryUserProfile(userId)",
    role: "propagator",
    line: 4,
    file: "db/queries.js",
    x: 340,
    y: 320,
  },
  {
    id: "prop_4",
    label: 'queryStr',
    sublabel: '"SELECT * FROM users WHERE id = \'" + userId + "\'"',
    role: "propagator",
    line: 5,
    file: "db/queries.js",
    cwe: "CWE-89",
    x: 340,
    y: 190,
  },
  {
    id: "sink_1",
    label: "db.query(queryStr)",
    sublabel: "Raw SQL Execution Sink",
    role: "sink",
    line: 6,
    file: "db/queries.js",
    cwe: "CWE-89",
    x: 340,
    y: 60,
  },
];

const DEMO_EDGES: TaintFlowEdge[] = [
  { id: "e1", source: "src_1", target: "prop_1", kind: "direct", animated: true },
  { id: "e2", source: "prop_1", target: "prop_2", kind: "direct", animated: true },
  { id: "e3", source: "prop_2", target: "prop_3", kind: "call_arg", animated: true },
  { id: "e4", source: "prop_3", target: "prop_4", kind: "direct", animated: true },
  { id: "e5", source: "prop_4", target: "sink_1", kind: "direct", animated: true },
];

const DEMO_FINDING: FindingCard = {
  id: "FINDING-CWE-89-1",
  rule: "SQL Injection via Concatenated Taint Flow",
  severity: "Critical",
  cwe: "CWE-89",
  source: "req.query.id",
  sink: "db.query(queryStr)",
  file: "routes/user.js → db/queries.js",
  line: 12,
  isSanitized: false,
  confidence: "HIGH",
};

const GRAPH_LAYERS: GraphLayerInfo[] = [
  {
    key: "ast",
    name: "Abstract Syntax Tree",
    abbr: "AST",
    icon: <FileCode className="w-4 h-4" />,
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    description: "Tree-sitter CST parsed into arena-allocated AST with source spans and lexical scopes",
    nodeCount: 1847,
    edgeCount: 1846,
  },
  {
    key: "cfg",
    name: "Control Flow Graph",
    abbr: "CFG",
    icon: <GitBranch className="w-4 h-4" />,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "Basic blocks with branch/jump/return terminators and conditional edges",
    nodeCount: 24,
    edgeCount: 31,
  },
  {
    key: "cg",
    name: "Call Graph",
    abbr: "CG",
    icon: <Network className="w-4 h-4" />,
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    description: "Interprocedural caller→callee resolution with Arg→Param position mapping",
    nodeCount: 8,
    edgeCount: 11,
  },
  {
    key: "pdg",
    name: "Program Dependence Graph",
    abbr: "PDG",
    icon: <Workflow className="w-4 h-4" />,
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    description: "Data dependence via reaching definitions + control dependence from post-dominator tree",
    nodeCount: 18,
    edgeCount: 27,
  },
  {
    key: "taint",
    name: "Taint Flow Graph",
    abbr: "VFG",
    icon: <Bug className="w-4 h-4" />,
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    description: "Source→Propagator→Sink value flow with sanitizer-aware path pruning",
    nodeCount: 6,
    edgeCount: 5,
  },
];

// ---------------------------------------------------------------------------
// Utility: Role styling
// ---------------------------------------------------------------------------
function roleStyle(role: TaintFlowNode["role"]) {
  switch (role) {
    case "source":
      return {
        border: "border-rose-400",
        bg: "bg-rose-50",
        ring: "ring-rose-400/30",
        text: "text-rose-800",
        badge: "bg-rose-600",
        badgeText: "text-white",
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        label: "SOURCE",
        glow: "shadow-rose-200/60",
      };
    case "propagator":
      return {
        border: "border-amber-300",
        bg: "bg-amber-50/70",
        ring: "ring-amber-300/20",
        text: "text-amber-800",
        badge: "bg-amber-500",
        badgeText: "text-white",
        icon: <ArrowRight className="w-3.5 h-3.5" />,
        label: "PROPAGATOR",
        glow: "shadow-amber-100/40",
      };
    case "sanitizer":
      return {
        border: "border-emerald-400",
        bg: "bg-emerald-50",
        ring: "ring-emerald-400/30",
        text: "text-emerald-800",
        badge: "bg-emerald-600",
        badgeText: "text-white",
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
        label: "SANITIZER",
        glow: "shadow-emerald-200/60",
      };
    case "sink":
      return {
        border: "border-red-500",
        bg: "bg-red-50",
        ring: "ring-red-500/30",
        text: "text-red-900",
        badge: "bg-red-700",
        badgeText: "text-white",
        icon: <Database className="w-3.5 h-3.5" />,
        label: "SINK",
        glow: "shadow-red-300/60",
      };
  }
}

// ---------------------------------------------------------------------------
// SVG Taint Flow Canvas — Custom renderer (no React Flow dependency)
// ---------------------------------------------------------------------------
function TaintFlowCanvas({
  nodes,
  edges,
  hoveredNode,
  setHoveredNode,
}: {
  nodes: TaintFlowNode[];
  edges: TaintFlowEdge[];
  hoveredNode: string | null;
  setHoveredNode: (id: string | null) => void;
}) {
  const NODE_W = 200;
  const NODE_H = 80;

  // Compute positions for centering
  const getNodeCenter = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 };
  };

  return (
    <svg
      viewBox="-10 -10 580 440"
      className="w-full h-full"
      style={{ minHeight: 380 }}
    >
      <defs>
        {/* Animated flow gradient */}
        <linearGradient id="taintFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="callFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.7" />
        </linearGradient>
        <marker
          id="arrowRed"
          viewBox="0 0 10 7"
          refX="9"
          refY="3.5"
          markerWidth="8"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 3.5 L 0 7 z" fill="#ef4444" />
        </marker>
        <marker
          id="arrowBlue"
          viewBox="0 0 10 7"
          refX="9"
          refY="3.5"
          markerWidth="8"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 3.5 L 0 7 z" fill="#6366f1" />
        </marker>
        {/* Animated dash */}
        <filter id="edgeGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Edges */}
      {edges.map((edge) => {
        const from = getNodeCenter(edge.source);
        const to = getNodeCenter(edge.target);
        const isCall = edge.kind === "call_arg";
        const isHighlighted =
          hoveredNode === edge.source || hoveredNode === edge.target;

        // Calculate control points for curved edges
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const offset = isCall ? 40 : 0;
        const cx = midX + offset;
        const cy = midY;

        return (
          <g key={edge.id}>
            {/* Background glow */}
            {isHighlighted && (
              <path
                d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
                fill="none"
                stroke={isCall ? "#818cf8" : "#f87171"}
                strokeWidth="6"
                strokeOpacity="0.2"
                filter="url(#edgeGlow)"
              />
            )}
            {/* Edge path */}
            <path
              d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
              fill="none"
              stroke={isCall ? "url(#callFlowGrad)" : "url(#taintFlowGrad)"}
              strokeWidth={isHighlighted ? 2.5 : 1.8}
              strokeDasharray={edge.animated ? "6 4" : "none"}
              markerEnd={isCall ? "url(#arrowBlue)" : "url(#arrowRed)"}
              className="transition-all duration-300"
              style={{
                animation: edge.animated
                  ? "dashFlow 1.2s linear infinite"
                  : "none",
              }}
            />
            {/* Edge label */}
            {isCall && (
              <text
                x={cx + 8}
                y={cy - 6}
                className="text-[9px] fill-indigo-500 font-mono font-medium select-none"
              >
                call_arg
              </text>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const style = roleStyle(node.role);
        const isHovered = hoveredNode === node.id;

        return (
          <g
            key={node.id}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
            className="cursor-pointer"
          >
            {/* Shadow/glow */}
            <rect
              x={node.x - 2}
              y={node.y - 2}
              width={NODE_W + 4}
              height={NODE_H + 4}
              rx="10"
              fill="none"
              stroke={
                node.role === "source"
                  ? "#fca5a5"
                  : node.role === "sink"
                  ? "#fca5a5"
                  : node.role === "sanitizer"
                  ? "#6ee7b7"
                  : "#fcd34d"
              }
              strokeWidth={isHovered ? "2" : "0"}
              strokeOpacity="0.5"
              className="transition-all duration-200"
            />
            {/* Card background */}
            <rect
              x={node.x}
              y={node.y}
              width={NODE_W}
              height={NODE_H}
              rx="8"
              fill="white"
              stroke={
                node.role === "source"
                  ? "#f87171"
                  : node.role === "sink"
                  ? "#dc2626"
                  : node.role === "sanitizer"
                  ? "#34d399"
                  : "#fbbf24"
              }
              strokeWidth="1.5"
              className="transition-all duration-200"
            />
            {/* Role badge */}
            <rect
              x={node.x + 6}
              y={node.y + 6}
              width={
                node.role === "propagator"
                  ? 78
                  : node.role === "sanitizer"
                  ? 68
                  : node.role === "source"
                  ? 54
                  : 38
              }
              height="16"
              rx="3"
              fill={
                node.role === "source"
                  ? "#dc2626"
                  : node.role === "sink"
                  ? "#991b1b"
                  : node.role === "sanitizer"
                  ? "#059669"
                  : "#d97706"
              }
            />
            <text
              x={node.x + 10}
              y={node.y + 18}
              className="text-[8px] fill-white font-mono font-bold tracking-wider select-none"
            >
              {style.label}
            </text>
            {/* Variable name */}
            <text
              x={node.x + 10}
              y={node.y + 38}
              className="text-[11px] fill-slate-900 font-mono font-semibold select-none"
            >
              {node.label.length > 24
                ? node.label.substring(0, 24) + "…"
                : node.label}
            </text>
            {/* File/line */}
            <text
              x={node.x + 10}
              y={node.y + 54}
              className="text-[9px] fill-slate-400 font-mono select-none"
            >
              {node.file}:{node.line}
            </text>
            {/* CWE badge if present */}
            {node.cwe && (
              <>
                <rect
                  x={node.x + NODE_W - 52}
                  y={node.y + 6}
                  width="46"
                  height="16"
                  rx="3"
                  fill="#fef2f2"
                  stroke="#fecaca"
                  strokeWidth="0.5"
                />
                <text
                  x={node.x + NODE_W - 48}
                  y={node.y + 18}
                  className="text-[8px] fill-red-700 font-mono font-bold select-none"
                >
                  {node.cwe}
                </text>
              </>
            )}
          </g>
        );
      })}

      <style>{`
        @keyframes dashFlow {
          from { stroke-dashoffset: 20; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Finding Detail Card
// ---------------------------------------------------------------------------
function FindingDetailCard({ finding }: { finding: FindingCard }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2 h-2 rounded-full ${
              finding.severity === "Critical"
                ? "bg-red-500"
                : finding.severity === "High"
                ? "bg-amber-500"
                : "bg-yellow-500"
            }`}
          />
          <span className="text-xs font-bold text-slate-900 font-mono">
            {finding.id}
          </span>
        </div>
        <div
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
            finding.severity === "Critical"
              ? "bg-red-100 text-red-800 border border-red-200"
              : finding.severity === "High"
              ? "bg-amber-100 text-amber-800 border border-amber-200"
              : "bg-yellow-100 text-yellow-800 border border-yellow-200"
          }`}
        >
          {finding.severity.toUpperCase()}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-3.5">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            {finding.rule}
          </h4>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
              {finding.cwe}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Confidence: {finding.confidence}
            </span>
          </div>
        </div>

        {/* Flow path mini diagram */}
        <div className="flex items-center gap-2 text-[11px] font-mono py-2">
          <span className="flex items-center gap-1 px-2 py-1 rounded bg-rose-50 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3" />
            {finding.source}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-400">…</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-900 border border-red-200">
            <Database className="w-3 h-3" />
            {finding.sink}
          </span>
        </div>

        {/* File reference */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
          <FileCode className="w-3 h-3" />
          <span>{finding.file}</span>
          <span className="text-slate-300">·</span>
          <span>Line {finding.line}</span>
        </div>

        {/* Sanitized badge */}
        <div className="flex items-center gap-2">
          {finding.isSanitized ? (
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
              <ShieldCheck className="w-3 h-3" />
              Sanitizer detected — suppressed
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-mono text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5">
              <Bug className="w-3 h-3" />
              No sanitizer on path — exploitable
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layer Selector Tabs
// ---------------------------------------------------------------------------
function LayerSelector({
  layers,
  activeLayer,
  setActiveLayer,
}: {
  layers: GraphLayerInfo[];
  activeLayer: string;
  setActiveLayer: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {layers.map((layer) => {
        const isActive = activeLayer === layer.key;
        return (
          <button
            type="button"
            key={layer.key}
            onClick={() => setActiveLayer(layer.key)}
            className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border cursor-pointer ${
              isActive
                ? `${layer.bgColor} ${layer.borderColor} ${layer.color} shadow-sm`
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <span className={isActive ? layer.color : "text-slate-400"}>
              {layer.icon}
            </span>
            <span className="font-semibold">{layer.abbr}</span>
            <span className="hidden sm:inline text-[10px] font-mono opacity-70">
              {layer.nodeCount}n / {layer.edgeCount}e
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layer Detail Panel
// ---------------------------------------------------------------------------
function LayerDetail({ layer }: { layer: GraphLayerInfo }) {
  const density =
    layer.nodeCount > 1
      ? (layer.edgeCount / (layer.nodeCount * (layer.nodeCount - 1))).toFixed(4)
      : "0.0000";

  return (
    <motion.div
      key={layer.key}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl border ${layer.borderColor} ${layer.bgColor} p-4 space-y-3`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-md bg-white ${layer.color} shadow-sm border ${layer.borderColor}`}>
          {layer.icon}
        </div>
        <div>
          <h4 className={`text-sm font-bold ${layer.color}`}>
            {layer.name}
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            {layer.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: "Nodes", value: layer.nodeCount.toLocaleString() },
          { label: "Edges", value: layer.edgeCount.toLocaleString() },
          { label: "Density", value: density },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg border border-slate-200/80 px-3 py-2 text-center"
          >
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-semibold">
              {stat.label}
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Architecture Pipeline Mini-Diagram
// ---------------------------------------------------------------------------
function PipelineFlow() {
  const stages = [
    { label: "Tree-sitter\nParse", icon: <FileCode className="w-3.5 h-3.5" />, color: "text-violet-700 bg-violet-50 border-violet-200" },
    { label: "CFG\nConstruct", icon: <GitBranch className="w-3.5 h-3.5" />, color: "text-blue-700 bg-blue-50 border-blue-200" },
    { label: "Call Graph\nResolve", icon: <Network className="w-3.5 h-3.5" />, color: "text-amber-700 bg-amber-50 border-amber-200" },
    { label: "PDG\nSynthesize", icon: <Workflow className="w-3.5 h-3.5" />, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    { label: "Taint\nPropagate", icon: <Bug className="w-3.5 h-3.5" />, color: "text-rose-700 bg-rose-50 border-rose-200" },
  ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {stages.map((stage, i) => (
        <React.Fragment key={stage.label}>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-semibold whitespace-nowrap ${stage.color}`}
          >
            {stage.icon}
            <span>{stage.label.split("\n")[0]}</span>
          </div>
          {i < stages.length - 1 && (
            <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Counter with animation
// ---------------------------------------------------------------------------
function AnimatedStat({
  value,
  label,
  suffix = "",
}: {
  value: number;
  label: string;
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
        {displayValue.toLocaleString()}
        {suffix && <span className="text-lg text-slate-400">{suffix}</span>}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-1">
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN SECTION COMPONENT
// ---------------------------------------------------------------------------
export default function DeepTaintGraphSection() {
  const [activeLayer, setActiveLayer] = useState("taint");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const currentLayer = useMemo(
    () => GRAPH_LAYERS.find((l) => l.key === activeLayer) || GRAPH_LAYERS[4],
    [activeLayer]
  );

  return (
    <section
      id="product-ast"
      className="relative py-20 lg:py-28 bg-white border-b border-slate-200/80 overflow-hidden"
    >
      {/* Subtle grid background pattern */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #1e293b 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-14 lg:mb-18">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono font-semibold text-slate-700">
            <Cpu className="w-3.5 h-3.5 text-slate-700" />
            <span>Deep Taint Graph Engine</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">Rust + petgraph</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Five mathematical graph layers.{" "}
            <span className="bg-gradient-to-r from-rose-600 via-amber-500 to-emerald-600 bg-clip-text text-transparent">
              Zero false positives.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Sentinel decomposes every function into compiler-grade intermediate
            representations — then tracks tainted values from untrusted sources
            to critical sinks across file and module boundaries.
          </p>
        </div>

        {/* Engine Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-12 max-w-3xl mx-auto">
          <AnimatedStat value={1847} label="AST Nodes Parsed" />
          <AnimatedStat value={5} label="Graph Layers" />
          <AnimatedStat value={12} label="Avg Latency" suffix="ms" />
          <AnimatedStat value={0} label="Memory Leaks" />
        </div>

        {/* Pipeline Flow */}
        <div className="flex justify-center mb-10">
          <PipelineFlow />
        </div>

        {/* Main Content: Two-Column */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Left Column: Graph Visualization (3/5) */}
          <div className="lg:col-span-3 space-y-5">
            {/* Layer Tabs */}
            <LayerSelector
              layers={GRAPH_LAYERS}
              activeLayer={activeLayer}
              setActiveLayer={setActiveLayer}
            />

            {/* Interactive Canvas */}
            <div className="relative rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden shadow-sm">
              {/* Canvas Header */}
              <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-500 ml-2">
                    sentinel-core::taint_graph — Interactive Value Flow Graph
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  <Activity className="w-3 h-3 text-emerald-500" />
                  <span>Live</span>
                </div>
              </div>

              {/* SVG Canvas */}
              <div className="p-4 bg-gradient-to-br from-slate-50 via-white to-slate-50">
                <AnimatePresence mode="wait">
                  {activeLayer === "taint" ? (
                    <motion.div
                      key="taint-canvas"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <TaintFlowCanvas
                        nodes={DEMO_NODES}
                        edges={DEMO_EDGES}
                        hoveredNode={hoveredNode}
                        setHoveredNode={setHoveredNode}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`layer-${activeLayer}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center justify-center py-16"
                    >
                      <div className="text-center space-y-4">
                        <div
                          className={`inline-flex p-4 rounded-2xl ${currentLayer.bgColor} border ${currentLayer.borderColor}`}
                        >
                          <div className={`${currentLayer.color} scale-150`}>
                            {currentLayer.icon}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">
                            {currentLayer.name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                            {currentLayer.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-4 text-xs font-mono text-slate-600">
                          <span>
                            <strong>{currentLayer.nodeCount}</strong> nodes
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>
                            <strong>{currentLayer.edgeCount}</strong> edges
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Legend */}
              <div className="px-4 py-2.5 bg-white border-t border-slate-200 flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-500">
                {(
                  [
                    { color: "bg-rose-500", label: "Source" },
                    { color: "bg-amber-500", label: "Propagator" },
                    { color: "bg-emerald-500", label: "Sanitizer" },
                    { color: "bg-red-800", label: "Sink" },
                  ] as const
                ).map(({ color, label }) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${color}`} />
                    {label}
                  </span>
                ))}
                <span className="ml-auto text-slate-400">
                  Hover nodes to trace flow path
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Finding + Layer Detail (2/5) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Active Layer Detail */}
            <AnimatePresence mode="wait">
              <LayerDetail layer={currentLayer} />
            </AnimatePresence>

            {/* Finding Card */}
            <FindingDetailCard finding={DEMO_FINDING} />

            {/* Technical Highlights */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Engine Internals
              </h4>
              <div className="space-y-2.5">
                {[
                  {
                    icon: <Shield className="w-3.5 h-3.5 text-slate-500" />,
                    title: "Arena-Allocated AST",
                    desc: "Zero-copy node lookups via contiguous Vec<AstNode> with O(1) indexed access",
                  },
                  {
                    icon: <GitBranch className="w-3.5 h-3.5 text-slate-500" />,
                    title: "SSA-based Reaching Definitions",
                    desc: "Gen/Kill fixed-point iteration to compute Def→Use chains across basic blocks",
                  },
                  {
                    icon: <Network className="w-3.5 h-3.5 text-slate-500" />,
                    title: "Worklist Forward Propagation",
                    desc: "BFS-based taint spread over PDG data edges + call graph boundaries",
                  },
                  {
                    icon: <Lock className="w-3.5 h-3.5 text-slate-500" />,
                    title: "Sanitizer-Aware Path Pruning",
                    desc: "Recognized sanitizers intercept taint and suppress false-positive findings",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 transition"
                  >
                    <div className="p-1.5 rounded-md bg-slate-100 border border-slate-200 mt-0.5">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-xl border border-slate-900 bg-slate-900 p-5 text-center space-y-3">
              <h4 className="text-sm font-bold text-white">
                Try the Graph Engine
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Install Sentinel CLI and generate all 5 graph layers for any
                repository in sub-second latency.
              </p>
              <div className="bg-slate-800 rounded-lg px-3 py-2 font-mono text-[11px] text-emerald-400 text-left border border-slate-700">
                <span className="text-slate-500 select-none">$ </span>
                sentinel scan --deep-graph ./src
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-white text-slate-900 text-xs font-semibold hover:bg-slate-100 transition active:scale-95 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>View CLI Docs</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom: Supported Rules Summary */}
        <div className="mt-14 pt-10 border-t border-slate-200/80">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              Built-in Taint Rules
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configurable Source → Sink patterns with sanitizer-aware
              interception
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
            {[
              {
                cwe: "CWE-89",
                name: "SQL Injection",
                severity: "Critical",
                color: "border-red-200 bg-red-50/50",
              },
              {
                cwe: "CWE-78",
                name: "Command Injection",
                severity: "Critical",
                color: "border-red-200 bg-red-50/50",
              },
              {
                cwe: "CWE-22",
                name: "Path Traversal",
                severity: "High",
                color: "border-amber-200 bg-amber-50/50",
              },
              {
                cwe: "CWE-918",
                name: "SSRF",
                severity: "High",
                color: "border-amber-200 bg-amber-50/50",
              },
              {
                cwe: "CWE-502",
                name: "Insecure Deserialization",
                severity: "High",
                color: "border-amber-200 bg-amber-50/50",
              },
            ].map((rule) => (
              <div
                key={rule.cwe}
                className={`rounded-lg border px-3.5 py-3 ${rule.color} flex flex-col gap-1.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-700">
                    {rule.cwe}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      rule.severity === "Critical"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {rule.severity}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-800">
                  {rule.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

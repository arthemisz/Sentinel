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
  ChevronDown,
  HelpCircle,
  Info,
  Lock,
  Database,
  Terminal,
  ExternalLink,
  Activity,
} from "lucide-react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Position,
  Handle,
  BackgroundVariant,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SentinelNodeData {
  [key: string]: unknown;
  label: string;
  sublabel?: string;
  role: "source" | "propagator" | "sanitizer" | "sink";
  roleLabel?: string;
  file?: string;
  line?: number;
  cwe?: string;
  typeTag?: string;
}

export type SentinelFlowNode = Node<SentinelNodeData, "sentinelNode">;

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
  plainEnglish: string;
  explanation: string;
  falsePositiveRole: string;
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
    plainEnglish: "The structural grammar of your code.",
    explanation: "Breaks down raw source code into structured tokens, functions, and variables—turning text into a format the analysis engine can read and query.",
    falsePositiveRole: "Eliminates false alarms caused by regex or pattern-matching scanners. By understanding AST syntax trees and lexical scope boundaries, comments, string literals, and variable names that merely match keywords are never mistakenly flagged as vulnerabilities.",
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
    plainEnglish: "The code execution map.",
    explanation: "Traces every possible path your code can execute, detailing decision branches (if/else, loops, errors) to prove which code actually runs and eliminate dead paths.",
    falsePositiveRole: "Eliminates alerts on unreachable dead code. By analyzing basic blocks, branch conditions, and return terminators, Sentinel mathematically verifies that an execution path is actually feasible before raising a finding.",
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
    plainEnglish: "The function and file connection map.",
    explanation: "Maps how different functions call each other across files, connecting caller arguments to function parameters so the analyzer does not lose context across module boundaries.",
    falsePositiveRole: "Eliminates cross-file blind spots and over-tainting. By resolving caller arguments to exact callee parameter positions across module boundaries, Sentinel tracks tainted arguments accurately without guessing.",
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
    plainEnglish: "The data and variable trail.",
    explanation: "Tracks where variables are defined, altered, concatenated, and reused across the program, combined with the conditions that decide whether that code executes.",
    falsePositiveRole: "Eliminates false alarms from coincidentally shared variable names. Combining reaching data definitions with post-dominator control dependence ensures only variables that genuinely influence sink operations are tracked.",
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
    plainEnglish: "The verified vulnerability path.",
    explanation: "Strips away all safe, irrelevant code and highlights only the dangerous journey: where untrusted user input enters the system (Source) and flows un-sanitized directly into a sensitive operation (Sink).",
    falsePositiveRole: "Eliminates false positives when input is sanitized. If an active validation routine, type coercion, or cryptographic sanitizer intercepts the flow, Sentinel mathematically proves the path is neutralized and suppresses the alert.",
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
// Role Styling & React Flow Node Component
// ---------------------------------------------------------------------------
function getNodeRoleStyle(role: SentinelNodeData["role"]) {
  switch (role) {
    case "source":
      return {
        badgeBg: "bg-cyan-500 text-white",
        border: "border-cyan-400 hover:border-cyan-500",
        label: "SOURCE",
      };
    case "propagator":
      return {
        badgeBg: "bg-slate-700 text-white",
        border: "border-slate-300 hover:border-slate-400",
        label: "PROPAGATOR",
      };
    case "sanitizer":
      return {
        badgeBg: "bg-emerald-600 text-white",
        border: "border-emerald-400 hover:border-emerald-500",
        label: "SANITIZER",
      };
    case "sink":
      return {
        badgeBg: "bg-rose-600 text-white",
        border: "border-rose-500 hover:border-rose-600",
        label: "SINK",
      };
  }
}

function SentinelNodeCard({ data }: { data: SentinelNodeData }) {
  const style = getNodeRoleStyle(data.role);

  return (
    <div
      className={`relative w-[230px] rounded-lg border bg-white p-3 shadow-xs transition-all duration-200 hover:shadow-md ${style.border}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-slate-400 !border !border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2 !h-2 !bg-slate-400 !border !border-white"
      />

      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <span
          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${style.badgeBg}`}
        >
          {data.roleLabel || style.label}
        </span>
        {data.cwe && (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
            {data.cwe}
          </span>
        )}
        {data.typeTag && (
          <span className="text-[9px] font-mono text-slate-400 font-medium truncate max-w-[90px]">
            {data.typeTag}
          </span>
        )}
      </div>

      <div
        className="text-xs font-mono font-bold text-slate-900 truncate"
        title={data.label}
      >
        {data.label}
      </div>

      {data.sublabel && (
        <div
          className="text-[10px] text-slate-500 leading-tight mt-1 truncate"
          title={data.sublabel}
        >
          {data.sublabel}
        </div>
      )}

      {data.file && (
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400 mt-2 pt-1.5 border-t border-slate-100">
          <FileCode className="w-2.5 h-2.5 text-slate-400 shrink-0" />
          <span className="truncate">
            {data.file}:{data.line}
          </span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-slate-400 !border !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2 !h-2 !bg-slate-400 !border !border-white"
      />
    </div>
  );
}

const nodeTypes = {
  sentinelNode: SentinelNodeCard,
};

// ---------------------------------------------------------------------------
// Active Datasets for all 5 Compiler Layers
// ---------------------------------------------------------------------------
export const LAYER_GRAPH_DATA: Record<
  string,
  { nodes: SentinelFlowNode[]; edges: Edge[] }
> = {
  ast: {
    nodes: [
      {
        id: "ast_src",
        type: "sentinelNode",
        position: { x: 30, y: 120 },
        data: {
          label: "MemberExpression: req.query.id",
          sublabel: "Source: HTTP GET parameter token",
          role: "source",
          roleLabel: "SOURCE",
          typeTag: "AST Expr",
          file: "routes/user.js",
          line: 12,
        },
      },
      {
        id: "ast_decl",
        type: "sentinelNode",
        position: { x: 320, y: 40 },
        data: {
          label: "VariableDeclarator: userId",
          sublabel: "Lexical AST declaration identifier",
          role: "propagator",
          roleLabel: "PROPAGATOR",
          typeTag: "AST Decl",
          file: "routes/user.js",
          line: 13,
        },
      },
      {
        id: "ast_call",
        type: "sentinelNode",
        position: { x: 320, y: 220 },
        data: {
          label: "CallExpression: queryUserProfile",
          sublabel: "Interprocedural function call boundary",
          role: "propagator",
          roleLabel: "PROPAGATOR",
          typeTag: "AST Call",
          file: "routes/user.js",
          line: 14,
        },
      },
      {
        id: "ast_san",
        type: "sentinelNode",
        position: { x: 610, y: 40 },
        data: {
          label: "UnaryExpression: +userId",
          sublabel: "Explicit AST number coercion guard",
          role: "sanitizer",
          roleLabel: "SANITIZER",
          typeTag: "AST Cast",
          file: "routes/user.js",
          line: 15,
        },
      },
      {
        id: "ast_concat",
        type: "sentinelNode",
        position: { x: 610, y: 220 },
        data: {
          label: "BinaryExpression: '+' (SQL concat)",
          sublabel: "Unescaped string concatenation",
          role: "propagator",
          roleLabel: "PROPAGATOR",
          typeTag: "AST Binary",
          file: "db/queries.js",
          line: 5,
        },
      },
      {
        id: "ast_sink",
        type: "sentinelNode",
        position: { x: 900, y: 130 },
        data: {
          label: "CallExpression: db.query(queryStr)",
          sublabel: "Execution of raw query string",
          role: "sink",
          roleLabel: "SINK",
          typeTag: "AST Sink",
          file: "db/queries.js",
          line: 6,
          cwe: "CWE-89",
        },
      },
    ],
    edges: [
      {
        id: "e_ast_1",
        source: "ast_src",
        target: "ast_decl",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
        style: { stroke: "#8b5cf6", strokeWidth: 2 },
        label: "init_value",
      },
      {
        id: "e_ast_2",
        source: "ast_decl",
        target: "ast_call",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
        style: { stroke: "#8b5cf6", strokeWidth: 2 },
        label: "arg_ref",
      },
      {
        id: "e_ast_3",
        source: "ast_call",
        target: "ast_concat",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
        style: { stroke: "#8b5cf6", strokeWidth: 2 },
        label: "callee_param",
      },
      {
        id: "e_ast_4",
        source: "ast_concat",
        target: "ast_sink",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
        style: { stroke: "#8b5cf6", strokeWidth: 2 },
        label: "sink_arg",
      },
      {
        id: "e_ast_san",
        source: "ast_decl",
        target: "ast_san",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
        style: { stroke: "#10b981", strokeWidth: 1.5, strokeDasharray: "4 4" },
        label: "safe_cast",
      },
    ],
  },
  cfg: {
    nodes: [
      {
        id: "cfg_b0",
        type: "sentinelNode",
        position: { x: 30, y: 130 },
        data: {
          label: "BB0: Entry Block (GET /user)",
          sublabel: "Branch test: if (req.query.id)",
          role: "source",
          roleLabel: "SOURCE",
          file: "routes/user.js",
          line: 11,
        },
      },
      {
        id: "cfg_b1",
        type: "sentinelNode",
        position: { x: 320, y: 50 },
        data: {
          label: "BB1: True Branch (Active)",
          sublabel: "const userId = req.query.id",
          role: "propagator",
          roleLabel: "PROPAGATOR",
          file: "routes/user.js",
          line: 13,
        },
      },
      {
        id: "cfg_err",
        type: "sentinelNode",
        position: { x: 320, y: 230 },
        data: {
          label: "BB_Err: False Branch (400)",
          sublabel: "res.status(400) [Pruned dead path]",
          role: "sanitizer",
          roleLabel: "SANITIZER",
          file: "routes/user.js",
          line: 18,
        },
      },
      {
        id: "cfg_b2",
        type: "sentinelNode",
        position: { x: 610, y: 50 },
        data: {
          label: "BB2: Callee Dispatch",
          sublabel: "queryUserProfile(userId)",
          role: "propagator",
          roleLabel: "PROPAGATOR",
          file: "routes/user.js",
          line: 14,
        },
      },
      {
        id: "cfg_b3",
        type: "sentinelNode",
        position: { x: 610, y: 200 },
        data: {
          label: "BB3: SQL Query Assembly",
          sublabel: 'queryStr = "SELECT..." + userId',
          role: "propagator",
          roleLabel: "PROPAGATOR",
          file: "db/queries.js",
          line: 5,
        },
      },
      {
        id: "cfg_b4",
        type: "sentinelNode",
        position: { x: 900, y: 130 },
        data: {
          label: "BB4: Database Execution Sink",
          sublabel: "await db.query(queryStr)",
          role: "sink",
          roleLabel: "SINK",
          file: "db/queries.js",
          line: 6,
          cwe: "CWE-89",
        },
      },
    ],
    edges: [
      {
        id: "e_cfg_1",
        source: "cfg_b0",
        target: "cfg_b1",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
        style: { stroke: "#3b82f6", strokeWidth: 2 },
        label: "cond == true",
      },
      {
        id: "e_cfg_err",
        source: "cfg_b0",
        target: "cfg_err",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
        style: { stroke: "#94a3b8", strokeWidth: 1.5, strokeDasharray: "4 4" },
        label: "cond == false (abort)",
      },
      {
        id: "e_cfg_2",
        source: "cfg_b1",
        target: "cfg_b2",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
        style: { stroke: "#3b82f6", strokeWidth: 2 },
        label: "jump",
      },
      {
        id: "e_cfg_3",
        source: "cfg_b2",
        target: "cfg_b3",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
        style: { stroke: "#3b82f6", strokeWidth: 2 },
        label: "interproc_flow",
      },
      {
        id: "e_cfg_4",
        source: "cfg_b3",
        target: "cfg_b4",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
        style: { stroke: "#3b82f6", strokeWidth: 2 },
        label: "execute",
      },
    ],
  },
  cg: {
    nodes: [
      {
        id: "cg_src",
        type: "sentinelNode",
        position: { x: 30, y: 130 },
        data: {
          label: "routes/user.js::handleUser()",
          sublabel: "HTTP Request Controller Entry",
          role: "source",
          roleLabel: "SOURCE",
          file: "routes/user.js",
          line: 10,
        },
      },
      {
        id: "cg_mw",
        type: "sentinelNode",
        position: { x: 320, y: 40 },
        data: {
          label: "middleware/auth.js::verifyJWT()",
          sublabel: "Authentication Token Validator",
          role: "sanitizer",
          roleLabel: "SANITIZER",
          file: "middleware/auth.js",
          line: 22,
        },
      },
      {
        id: "cg_ctrl",
        type: "sentinelNode",
        position: { x: 320, y: 220 },
        data: {
          label: "controllers/user.js::getUser()",
          sublabel: "Passes raw parameters to db layer",
          role: "propagator",
          roleLabel: "PROPAGATOR",
          file: "controllers/user.js",
          line: 15,
        },
      },
      {
        id: "cg_db",
        type: "sentinelNode",
        position: { x: 610, y: 130 },
        data: {
          label: "db/queries.js::queryUserProfile()",
          sublabel: "Concatenates input into SQL string",
          role: "propagator",
          roleLabel: "PROPAGATOR",
          file: "db/queries.js",
          line: 4,
        },
      },
      {
        id: "cg_sink",
        type: "sentinelNode",
        position: { x: 900, y: 130 },
        data: {
          label: "pg::Client.query()",
          sublabel: "PostgreSQL native socket execution",
          role: "sink",
          roleLabel: "SINK",
          file: "node_modules/pg",
          line: 98,
          cwe: "CWE-89",
        },
      },
    ],
    edges: [
      {
        id: "e_cg_1",
        source: "cg_src",
        target: "cg_mw",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#d97706" },
        style: { stroke: "#d97706", strokeWidth: 2 },
        label: "pre_hook",
      },
      {
        id: "e_cg_2",
        source: "cg_src",
        target: "cg_ctrl",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#d97706" },
        style: { stroke: "#d97706", strokeWidth: 2 },
        label: "invokes(req)",
      },
      {
        id: "e_cg_3",
        source: "cg_ctrl",
        target: "cg_db",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#d97706" },
        style: { stroke: "#d97706", strokeWidth: 2 },
        label: "calls(userId)",
      },
      {
        id: "e_cg_4",
        source: "cg_db",
        target: "cg_sink",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#d97706" },
        style: { stroke: "#d97706", strokeWidth: 2 },
        label: "executes(queryStr)",
      },
    ],
  },
  pdg: {
    nodes: [
      {
        id: "pdg_d1",
        type: "sentinelNode",
        position: { x: 30, y: 60 },
        data: {
          label: "Def[1]: req.query.id",
          sublabel: "Reaching definition (Untrusted input)",
          role: "source",
          roleLabel: "SOURCE",
          file: "routes/user.js",
          line: 12,
        },
      },
      {
        id: "pdg_c1",
        type: "sentinelNode",
        position: { x: 30, y: 240 },
        data: {
          label: "Ctrl[1]: if (req.query.id)",
          sublabel: "Post-dominator control condition",
          role: "sanitizer",
          roleLabel: "SANITIZER",
          file: "routes/user.js",
          line: 11,
        },
      },
      {
        id: "pdg_d2",
        type: "sentinelNode",
        position: { x: 320, y: 150 },
        data: {
          label: "Def[2]: userId = req.query.id",
          sublabel: "Data Dep: D1 | Control Dep: C1",
          role: "propagator",
          roleLabel: "PROPAGATOR",
          file: "routes/user.js",
          line: 13,
        },
      },
      {
        id: "pdg_d3",
        type: "sentinelNode",
        position: { x: 610, y: 150 },
        data: {
          label: 'Def[3]: queryStr = "..." + userId',
          sublabel: "Data Dep: Def[2] (Reaching definition)",
          role: "propagator",
          roleLabel: "PROPAGATOR",
          file: "db/queries.js",
          line: 5,
        },
      },
      {
        id: "pdg_use",
        type: "sentinelNode",
        position: { x: 900, y: 150 },
        data: {
          label: "Use[1]: db.query(queryStr)",
          sublabel: "Data Dep: Def[3] reaches SQL execution",
          role: "sink",
          roleLabel: "SINK",
          file: "db/queries.js",
          line: 6,
          cwe: "CWE-89",
        },
      },
    ],
    edges: [
      {
        id: "e_pdg_c1",
        source: "pdg_c1",
        target: "pdg_d2",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
        style: { stroke: "#64748b", strokeWidth: 1.8, strokeDasharray: "4 4" },
        label: "ctrl_dep",
      },
      {
        id: "e_pdg_d1",
        source: "pdg_d1",
        target: "pdg_d2",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#059669" },
        style: { stroke: "#059669", strokeWidth: 2 },
        label: "data_dep: d1",
      },
      {
        id: "e_pdg_d2",
        source: "pdg_d2",
        target: "pdg_d3",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#059669" },
        style: { stroke: "#059669", strokeWidth: 2 },
        label: "data_dep: userId",
      },
      {
        id: "e_pdg_d3",
        source: "pdg_d3",
        target: "pdg_use",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#059669" },
        style: { stroke: "#059669", strokeWidth: 2 },
        label: "data_dep: queryStr",
      },
    ],
  },
  taint: {
    nodes: [
      {
        id: "vfg_src",
        type: "sentinelNode",
        position: { x: 30, y: 60 },
        data: {
          label: "req.query.id",
          sublabel: "HTTP Query Parameter (Untrusted Input)",
          role: "source",
          roleLabel: "SOURCE",
          file: "routes/user.js",
          line: 12,
          cwe: "CWE-89",
        },
      },
      {
        id: "vfg_p1",
        type: "sentinelNode",
        position: { x: 320, y: 60 },
        data: {
          label: "const userId = req.query.id",
          sublabel: "Direct Variable Assignment",
          role: "propagator",
          roleLabel: "PROPAGATOR",
          file: "routes/user.js",
          line: 13,
        },
      },
      {
        id: "vfg_p2",
        type: "sentinelNode",
        position: { x: 610, y: 60 },
        data: {
          label: "queryUserProfile(userId)",
          sublabel: "Cross-function Call Boundary Argument",
          role: "propagator",
          roleLabel: "PROPAGATOR",
          file: "routes/user.js",
          line: 14,
        },
      },
      {
        id: "vfg_p3",
        type: "sentinelNode",
        position: { x: 610, y: 230 },
        data: {
          label: "param: userId",
          sublabel: "function queryUserProfile(userId)",
          role: "propagator",
          roleLabel: "PROPAGATOR",
          file: "db/queries.js",
          line: 4,
        },
      },
      {
        id: "vfg_p4",
        type: "sentinelNode",
        position: { x: 320, y: 230 },
        data: {
          label: 'queryStr = "SELECT..." + userId',
          sublabel: "Unescaped String Concatenation",
          role: "propagator",
          roleLabel: "PROPAGATOR",
          file: "db/queries.js",
          line: 5,
          cwe: "CWE-89",
        },
      },
      {
        id: "vfg_sink",
        type: "sentinelNode",
        position: { x: 30, y: 230 },
        data: {
          label: "await db.query(queryStr)",
          sublabel: "Raw SQL Execution Sink",
          role: "sink",
          roleLabel: "SINK",
          file: "db/queries.js",
          line: 6,
          cwe: "CWE-89",
        },
      },
      {
        id: "vfg_san",
        type: "sentinelNode",
        position: { x: 320, y: 390 },
        data: {
          label: "validateUUID(userId)",
          sublabel: "Bypassed: Sanitizer omitted on exploit path",
          role: "sanitizer",
          roleLabel: "SANITIZER",
          file: "utils/validation.js",
          line: 28,
        },
      },
    ],
    edges: [
      {
        id: "e_vfg_1",
        source: "vfg_src",
        target: "vfg_p1",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#f43f5e" },
        style: { stroke: "#f43f5e", strokeWidth: 2.5, strokeDasharray: "6 4" },
        label: "taint_source",
      },
      {
        id: "e_vfg_2",
        source: "vfg_p1",
        target: "vfg_p2",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#f43f5e" },
        style: { stroke: "#f43f5e", strokeWidth: 2.5, strokeDasharray: "6 4" },
        label: "flow",
      },
      {
        id: "e_vfg_3",
        source: "vfg_p2",
        target: "vfg_p3",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#f43f5e" },
        style: { stroke: "#f43f5e", strokeWidth: 2.5, strokeDasharray: "6 4" },
        label: "call_arg",
      },
      {
        id: "e_vfg_4",
        source: "vfg_p3",
        target: "vfg_p4",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#f43f5e" },
        style: { stroke: "#f43f5e", strokeWidth: 2.5, strokeDasharray: "6 4" },
        label: "string_concat",
      },
      {
        id: "e_vfg_5",
        source: "vfg_p4",
        target: "vfg_sink",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#f43f5e" },
        style: { stroke: "#f43f5e", strokeWidth: 2.5, strokeDasharray: "6 4" },
        label: "vulnerable_sink",
      },
      {
        id: "e_vfg_san",
        source: "vfg_p1",
        target: "vfg_san",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
        style: { stroke: "#10b981", strokeWidth: 1.5, strokeDasharray: "4 4" },
        label: "omitted_guard",
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Definition Banner & Collapsible Explainer Card
// ---------------------------------------------------------------------------
function LayerDefinitionBanner({ layer }: { layer: GraphLayerInfo }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-xs p-4 shadow-xs transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${layer.bgColor} ${layer.color} border ${layer.borderColor}`}
            >
              {layer.abbr}
            </span>
            <span className="text-xs font-bold text-slate-900">
              {layer.plainEnglish}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
            {layer.explanation}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition-colors shrink-0 self-start sm:self-center cursor-pointer"
          aria-expanded={isExpanded}
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>What is this graph?</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Expandable "Learn More" Drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3.5 pt-3.5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Role in Eliminating False Positives</span>
                </div>
                <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                  {layer.falsePositiveRole}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[11px]">
                  <Workflow className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>Compiler Engine Representation</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {layer.description}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

  const currentLayer = useMemo(
    () => GRAPH_LAYERS.find((l) => l.key === activeLayer) || GRAPH_LAYERS[4],
    [activeLayer]
  );

  const activeGraphData = useMemo(
    () => LAYER_GRAPH_DATA[activeLayer] || LAYER_GRAPH_DATA.taint,
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

            {/* Plain-English Definition Banner & Collapsible Explainer */}
            <LayerDefinitionBanner layer={currentLayer} />

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
                    sentinel-core::{currentLayer.key === "taint" ? "taint_graph" : `${currentLayer.key}_graph`} — Interactive {currentLayer.abbr} Canvas
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  <Activity className="w-3 h-3 text-emerald-500" />
                  <span>Live Canvas</span>
                </div>
              </div>

              {/* Interactive Graph Canvas (Explicit 520px height) */}
              <div className="h-[520px] w-full relative bg-gradient-to-br from-slate-50 via-white to-slate-50">
                <ReactFlow
                  key={activeLayer}
                  nodes={activeGraphData.nodes}
                  edges={activeGraphData.edges}
                  nodeTypes={nodeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.18 }}
                  minZoom={0.2}
                  maxZoom={1.5}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background
                    variant={BackgroundVariant.Dots}
                    gap={16}
                    size={1}
                    color="#cbd5e1"
                  />
                  <Controls className="!bg-white !border-slate-200 !shadow-sm !rounded-lg" />
                </ReactFlow>
              </div>

              {/* Legend */}
              <div className="px-4 py-2.5 bg-white border-t border-slate-200 flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-500">
                {[
                  { color: "bg-cyan-500", label: "Source" },
                  { color: "bg-slate-700", label: "Propagator" },
                  { color: "bg-emerald-600", label: "Sanitizer" },
                  { color: "bg-rose-600", label: "Sink" },
                ].map(({ color, label }) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${color}`} />
                    {label}
                  </span>
                ))}
                <span className="ml-auto text-slate-400 hidden sm:inline">
                  Drag nodes • Scroll to zoom • fitView auto-centered
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

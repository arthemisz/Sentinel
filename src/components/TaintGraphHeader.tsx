import React from "react";

export interface GraphProvenanceMeta {
  scanId: string;
  target: string;
  branch?: string;
  commit?: string;
  nodesCount?: number;
  edgesCount?: number;
}

export function TaintGraphHeader({ meta }: { meta: GraphProvenanceMeta }) {
  // Extract a clean display name (e.g., "juice-shop" from "https://github.com/juice-shop/juice-shop")
  const repoName = meta.target
    ? meta.target.split("/").filter(Boolean).pop()?.replace(/\.git$/, "") || meta.target
    : "Unknown Target";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-2.5 text-xs backdrop-blur font-mono">
      {/* Left: Engine identity + Bound Target Repository */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
          <span>Deep Taint Graph Engine</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400 font-normal">Rust + petgraph</span>
        </div>

        <span className="text-zinc-700 hidden sm:inline">|</span>

        {/* Bound Repository Target */}
        <div className="flex items-center gap-1.5 rounded bg-zinc-900 px-2 py-0.5 border border-zinc-800 text-zinc-300">
          <span className="text-zinc-500">repo:</span>
          <span className="font-semibold text-emerald-300">{repoName}</span>
          {meta.branch && (
            <span className="text-zinc-500">({meta.branch})</span>
          )}
        </div>
      </div>

      {/* Right: Explicit Scan ID & Proof of Work stats */}
      <div className="flex items-center gap-3 text-zinc-400 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-zinc-500">Scan ID:</span>
          <span className="text-zinc-200 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 select-all font-mono text-[11px]">
            {meta.scanId.length > 18 ? `${meta.scanId.slice(0, 10)}...${meta.scanId.slice(-4)}` : meta.scanId}
          </span>
        </div>

        {meta.commit && (
          <div className="hidden md:flex items-center gap-1 text-zinc-400">
            <span className="text-zinc-500">commit:</span>
            <span className="text-zinc-300">{meta.commit.slice(0, 7)}</span>
          </div>
        )}

        {(meta.nodesCount !== undefined || meta.edgesCount !== undefined) && (
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-zinc-500 border-l border-zinc-800 pl-3">
            <span>{meta.nodesCount?.toLocaleString()} nodes</span>
            <span>·</span>
            <span>{meta.edgesCount?.toLocaleString()} edges</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaintGraphHeader;

import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export default async function EnterpriseHubPage() {
  // ── Data fetching with graceful fallbacks ──────────────────────────────────

  let activePoliciesCount = 0;
  let reposCoveredCount = 0;
  let totalScans = 0;
  let auditEventsCount = 0;

  let policies: AnyRecord[] = [];
  let auditLogs: AnyRecord[] = [];
  let memberships: AnyRecord[] = [];

  try {
    const [
      policiesCountRes,
      reposCountRes,
      scansCountRes,
      auditCountRes,
      policiesRes,
      auditLogsRes,
      membershipsRes,
    ] = await Promise.all([
      prisma.policy.count({ where: { isEnforced: true } }),
      prisma.project.count({ where: { organizationId: { not: null } } }),
      prisma.scan.count(),
      prisma.auditLog.count(),
      prisma.policy.findMany({
        where: { isEnforced: true },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { organization: true },
      }),
      prisma.membership.findMany({
        take: 10,
        include: { user: true, organization: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    activePoliciesCount = policiesCountRes;
    reposCoveredCount = reposCountRes;
    totalScans = scansCountRes;
    auditEventsCount = auditCountRes;

    policies = policiesRes;
    auditLogs = auditLogsRes;
    memberships = membershipsRes;
  } catch (error) {
    console.error("[Enterprise Hub] Error fetching data:", error);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getActionColor = (action: string) => {
    if (action.includes("FAILED")) return "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50";
    switch (action) {
      case "SCAN_INGESTED":
        return "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40";
      case "SECURITY_GATE_FAILED":
        return "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50";
      case "VULN_SUPPRESSED":
        return "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50";
      case "POLICY_UPDATED":
        return "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50";
      case "TOKEN_GENERATED":
        return "text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50";
      default:
        return "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40";
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── 1. Top Bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-[#1e2330] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-slate-900 dark:text-slate-100">
            $ enterprise<span className="animate-pulse text-emerald-500">_</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Organization Governance &amp; Compliance // SOC 2 Type II Ready
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-2 border border-emerald-200 dark:border-emerald-800/40 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 shadow-sm">
          <span className="text-emerald-600 dark:text-emerald-400">⬡</span>
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">
            SOC 2 TYPE II READY
          </span>
        </div>
      </div>

      {/* ── 2. Metrics Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "ACTIVE_POLICIES", value: activePoliciesCount, icon: "◈" },
          { label: "REPOS_COVERED", value: reposCoveredCount, icon: "◆" },
          { label: "TOTAL_SCANS", value: totalScans, icon: "▲" },
          { label: "AUDIT_EVENTS", value: auditEventsCount, icon: "◉" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-slate-200 dark:border-[#252b3b] rounded-xl p-4 bg-white dark:bg-[#151820] shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">
                {stat.label}
              </span>
              <span className="text-lg text-emerald-600 dark:text-emerald-400">{stat.icon}</span>
            </div>
            <div className="text-3xl font-bold mt-2 text-slate-900 dark:text-slate-100 font-mono">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── 3 & 4. Quality Gates + Audit Trail ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Active Quality Gates Panel ─────────────────────────────────── */}
        <div className="border border-slate-200 dark:border-[#252b3b] rounded-xl bg-white dark:bg-[#151820] shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 dark:border-[#1e2330] px-4 py-3 bg-slate-50/80 dark:bg-[#11141c]/80 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wider">
              ACTIVE_QUALITY_GATES
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-[#1e2330] text-slate-600 dark:text-slate-400">
              {policies.length} Active
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-[#1e2330]">
            {policies.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                No quality gate policies configured. Create your first policy to
                enforce security standards across CI/CD pipelines.
              </div>
            ) : (
              policies.map((policy) => (
                <div
                  key={policy.id}
                  className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#1a1f2e]/40 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-slate-900 dark:text-slate-100 text-sm font-bold">
                        {policy.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Updated{" "}
                        {new Date(policy.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {policy.failOnCritical && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 font-semibold">
                          BLOCKS CRITICAL
                        </span>
                      )}
                      {policy.failOnHigh && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 font-semibold">
                          BLOCKS HIGH
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                        policy.isEnforced
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
                          : "bg-slate-100 dark:bg-[#1e2330] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#252b3b]"
                      }`}>
                        {policy.isEnforced ? "ENFORCED" : "DISABLED"}
                      </span>
                    </div>
                  </div>
                  {policy.blockOnCWEs && policy.blockOnCWEs.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                        Blocked CWEs:{" "}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {policy.blockOnCWEs.map((cwe: string) => (
                          <span
                            key={cwe}
                            className="text-xs bg-slate-100 dark:bg-[#0c0e12] px-1.5 py-0.5 border border-slate-200 dark:border-[#252b3b] text-emerald-700 dark:text-emerald-400 rounded"
                          >
                            {cwe}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Compliance Audit Trail Stream ───────────────────────────────── */}
        <div className="border border-slate-200 dark:border-[#252b3b] rounded-xl bg-white dark:bg-[#151820] shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 dark:border-[#1e2330] px-4 py-3 bg-slate-50/80 dark:bg-[#11141c]/80 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wider">
              COMPLIANCE_AUDIT_TRAIL
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-[#1e2330] text-slate-600 dark:text-slate-400">
              Live Feed
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-[#1e2330]">
            {auditLogs.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                No audit events recorded. Actions will appear here as your team
                uses the platform.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#1a1f2e]/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${getActionColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                      {log.organization && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          @ {log.organization.name}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 ml-2">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 mt-1 truncate">
                    <span className="opacity-70">{log.actorEmail}</span>
                    {log.targetEntity && (
                      <>
                        <span className="mx-2 text-slate-400 dark:text-slate-600">→</span>
                        <span className="text-slate-900 dark:text-slate-100 font-semibold">{log.targetEntity}</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── 5. Organization Members ──────────────────────────────────────── */}
      <div className="border border-slate-200 dark:border-[#252b3b] rounded-xl bg-white dark:bg-[#151820] shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 dark:border-[#1e2330] px-4 py-3 bg-slate-50/80 dark:bg-[#11141c]/80 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wider">
            ORGANIZATION_MEMBERS
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-[#1e2330] text-slate-600 dark:text-slate-400">
            {memberships.length} Users
          </span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-[#1e2330]">
          {memberships.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              No organization memberships found. Set up your first organization
              to get started.
            </div>
          ) : (
            memberships.map((membership) => (
              <div
                key={membership.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#1a1f2e]/40 transition-colors"
              >
                <div>
                  <div className="text-slate-900 dark:text-slate-100 text-sm font-semibold">
                    {membership.user?.name || "Unknown User"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {membership.user?.email} •{" "}
                    {membership.organization?.name}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#0c0e12] border border-slate-200 dark:border-[#252b3b] text-emerald-700 dark:text-emerald-400 font-semibold">
                    {membership.role}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(membership.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

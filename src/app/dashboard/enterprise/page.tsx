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
    if (action.includes("FAILED")) return "text-red-400 bg-red-900/30";
    switch (action) {
      case "SCAN_INGESTED":
        return "text-green-400 bg-green-900/30";
      case "SECURITY_GATE_FAILED":
        return "text-red-400 bg-red-900/30";
      case "VULN_SUPPRESSED":
        return "text-yellow-400 bg-yellow-900/30";
      case "POLICY_UPDATED":
        return "text-blue-400 bg-blue-900/30";
      case "TOKEN_GENERATED":
        return "text-purple-400 bg-purple-900/30";
      default:
        return "text-green-400 bg-green-900/30";
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── 1. Top Bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-green-900/50 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wider">
            $ enterprise<span className="animate-pulse">_</span>
          </h1>
          <p className="text-green-600 text-sm mt-1">
            Organization Governance &amp; Compliance // SOC 2 Type II Ready
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-2 border border-green-900/50 rounded-lg bg-black/50 px-3 py-1.5">
          <span className="text-green-400">⬡</span>
          <span className="text-xs font-bold text-green-400 tracking-wider">
            SOC 2 TYPE II READY
          </span>
        </div>
      </div>

      {/* ── 2. Metrics Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "ACTIVE_POLICIES", value: activePoliciesCount, icon: "◈", color: "green" },
          { label: "REPOS_COVERED", value: reposCoveredCount, icon: "◆", color: "green" },
          { label: "TOTAL_SCANS", value: totalScans, icon: "▲", color: "green" },
          { label: "AUDIT_EVENTS", value: auditEventsCount, icon: "◉", color: "green" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-green-900/50 rounded-lg p-4 bg-black/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-600 uppercase tracking-widest">
                {stat.label}
              </span>
              <span className="text-lg text-green-500">{stat.icon}</span>
            </div>
            <div className="text-3xl font-bold mt-2 text-green-400">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── 3 & 4. Quality Gates + Audit Trail ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Active Quality Gates Panel ─────────────────────────────────── */}
        <div className="border border-green-900/50 rounded-lg bg-black/50 overflow-hidden">
          <div className="border-b border-green-900/50 px-4 py-3">
            <h2 className="text-sm font-bold text-green-400 tracking-wider">
              ACTIVE_QUALITY_GATES
            </h2>
          </div>
          <div className="divide-y divide-green-900/30">
            {policies.length === 0 ? (
              <div className="px-4 py-8 text-center text-green-600 text-sm">
                No quality gate policies configured. Create your first policy to
                enforce security standards across CI/CD pipelines.
              </div>
            ) : (
              policies.map((policy) => (
                <div
                  key={policy.id}
                  className="px-4 py-3 hover:bg-green-900/10 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-green-400 text-sm font-bold">
                        {policy.name}
                      </div>
                      <div className="text-xs text-green-700 mt-1">
                        Updated{" "}
                        {new Date(policy.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {policy.failOnCritical && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-900/50">
                          BLOCKS CRITICAL
                        </span>
                      )}
                      {policy.failOnHigh && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-400 border border-orange-900/50">
                          BLOCKS HIGH
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-900/50">
                        {policy.isEnforced ? "ENFORCED" : "DISABLED"}
                      </span>
                    </div>
                  </div>
                  {policy.blockOnCWEs && policy.blockOnCWEs.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] text-green-700 uppercase">
                        Blocked CWEs:{" "}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {policy.blockOnCWEs.map((cwe: string) => (
                          <span
                            key={cwe}
                            className="text-xs bg-black px-1.5 py-0.5 border border-green-900/50 text-green-500 rounded"
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
        <div className="border border-green-900/50 rounded-lg bg-black/50 overflow-hidden">
          <div className="border-b border-green-900/50 px-4 py-3">
            <h2 className="text-sm font-bold text-green-400 tracking-wider">
              COMPLIANCE_AUDIT_TRAIL
            </h2>
          </div>
          <div className="divide-y divide-green-900/30">
            {auditLogs.length === 0 ? (
              <div className="px-4 py-8 text-center text-green-600 text-sm">
                No audit events recorded. Actions will appear here as your team
                uses the platform.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="px-4 py-3 hover:bg-green-900/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${getActionColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                      {log.organization && (
                        <span className="text-xs text-green-600 truncate">
                          @ {log.organization.name}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-green-700 shrink-0 ml-2">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-green-400 mt-1 truncate">
                    <span className="opacity-70">{log.actorEmail}</span>
                    {log.targetEntity && (
                      <>
                        <span className="mx-2 text-green-800">→</span>
                        <span>{log.targetEntity}</span>
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
      <div className="border border-green-900/50 rounded-lg bg-black/50 overflow-hidden">
        <div className="border-b border-green-900/50 px-4 py-3">
          <h2 className="text-sm font-bold text-green-400 tracking-wider">
            ORGANIZATION_MEMBERS
          </h2>
        </div>
        <div className="divide-y divide-green-900/30">
          {memberships.length === 0 ? (
            <div className="px-4 py-8 text-center text-green-600 text-sm">
              No organization memberships found. Set up your first organization
              to get started.
            </div>
          ) : (
            memberships.map((membership) => (
              <div
                key={membership.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-green-900/10 transition-colors"
              >
                <div>
                  <div className="text-green-400 text-sm">
                    {membership.user?.name || "Unknown User"}
                  </div>
                  <div className="text-xs text-green-700">
                    {membership.user?.email} •{" "}
                    {membership.organization?.name}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black border border-green-900/50 text-green-400">
                    {membership.role}
                  </span>
                  <span className="text-xs text-green-700">
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

import { prisma } from "@/lib/prisma";

/**
 * Records a compliance audit event for SOC 2 Type II readiness.
 * Call this whenever a security-relevant action occurs within an organization.
 */
export async function logAuditEvent({
  organizationId,
  actorEmail,
  action,
  targetEntity,
  metadata,
}: {
  organizationId: string;
  actorEmail: string;
  action: string;
  targetEntity?: string;
  metadata?: Record<string, any>;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        organizationId,
        actorEmail,
        action,
        targetEntity,
        metadata: metadata ?? {},
      },
    });
  } catch (error) {
    console.error("[AUDIT ERROR] Could not persist log:", error);
    return null;
  }
}

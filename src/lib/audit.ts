import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { clientIp } from "./auth/session";

type AuditInput = {
  actorId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
};

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/** Appends an audit record. The audit log is never edited from the UI. */
export async function audit(input: AuditInput) {
  let ip: string | null = null;
  try {
    ip = await clientIp();
  } catch {
    // Called outside a request (scripts).
  }
  await db.auditEvent.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: toJson(input.before),
      after: toJson(input.after),
      ip,
    },
  });
}

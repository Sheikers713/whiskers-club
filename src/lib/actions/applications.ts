"use server";

import { z } from "zod";
import type { ApplicationType } from "@prisma/client";
import { db } from "../db";
import { isLocale } from "../i18n/config";
import { t } from "../i18n/localized";
import { clientIp } from "../auth/session";
import { notifyAdmins } from "../notify";
import { appUrl } from "../mailer";
import { contactMethods, extraFields } from "../forms/fields";

export type FormState = { status: "idle" | "ok" | "error" | "rate"; errors?: string[] };

// Simple per-IP limit; the site runs as a single process.
const recent = new Map<string, number[]>();
function rateLimited(ip: string | null): boolean {
  if (!ip) return false;
  const now = Date.now();
  const list = (recent.get(ip) ?? []).filter((ts) => now - ts < 10 * 60 * 1000);
  list.push(now);
  recent.set(ip, list);
  return list.length > 5;
}

const typeLabels: Record<ApplicationType, string> = {
  ADOPTION: "усыновление",
  VOLUNTEER: "волонтёрство",
  FOSTER: "передержка",
  PARTNERSHIP: "партнёрство",
};

const text = (max: number) => z.string().trim().max(max);

export async function submitApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const type = String(formData.get("type")) as ApplicationType;
  const locale = String(formData.get("locale"));
  if (!(type in extraFields) || !isLocale(locale)) return { status: "error" };

  // Spam protection: hidden honeypot field and a minimum fill time.
  const startedAt = Number(formData.get("startedAt"));
  if (formData.get("website") || !startedAt || Date.now() - startedAt < 3000) {
    return { status: "ok" };
  }
  if (rateLimited(await clientIp())) return { status: "rate" };

  const base = z
    .object({
      name: text(120).min(1),
      contactMethod: z.enum(contactMethods),
      contact: text(200).min(3),
      city: text(120).optional(),
      consent: z.literal("on"),
      catId: z.string().uuid().optional(),
    })
    .safeParse({
      name: formData.get("name"),
      contactMethod: formData.get("contactMethod"),
      contact: formData.get("contact"),
      city: formData.get("city") || undefined,
      consent: formData.get("consent"),
      catId: formData.get("catId") || undefined,
    });

  const errors: string[] = base.success ? [] : base.error.issues.map((i) => String(i.path[0]));
  const answers: Record<string, string> = {};
  for (const f of extraFields[type]) {
    const value = String(formData.get(f.name) ?? "").trim().slice(0, 4000);
    if (f.required && !value) errors.push(f.name);
    if (value) answers[f.name] = value;
  }
  if (!base.success || errors.length) return { status: "error", errors };

  const data = base.data;
  let catName: string | null = null;
  if (type === "ADOPTION") {
    if (!data.catId) return { status: "error", errors: ["catId"] };
    const cat = await db.cat.findFirst({
      where: { id: data.catId, state: "PUBLISHED" },
      select: { name: true, curators: { select: { userId: true } } },
    });
    if (!cat) return { status: "error", errors: ["catId"] };
    catName = t(cat.name, "ru");
  }

  const app = await db.application.create({
    data: {
      type,
      catId: type === "ADOPTION" ? data.catId : null,
      name: data.name,
      contactMethod: data.contactMethod,
      contact: data.contact,
      city: data.city,
      answers,
      locale,
      consentAt: new Date(),
    },
  });

  const curatorIds = data.catId
    ? (await db.catCurator.findMany({ where: { catId: data.catId }, select: { userId: true } })).map((c) => c.userId)
    : [];
  await notifyAdmins(
    ["EDITOR"],
    `Новая заявка: ${typeLabels[type]}${catName ? ` — ${catName}` : ""}\n${data.name}\n${appUrl(`/admin/applications/${app.id}`)}`,
    curatorIds,
  );
  return { status: "ok" };
}

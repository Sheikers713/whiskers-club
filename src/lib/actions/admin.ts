"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ApplicationStatus, Role, StatusGroup } from "@prisma/client";
import { db } from "../db";
import { audit } from "../audit";
import { requireUser } from "../auth/session";
import { hashToken, newToken } from "../auth/tokens";
import { createResetLink } from "../auth/reset";
import { appUrl, sendMail } from "../mailer";
import { setSetting, type SiteSettings } from "../settings";
import { bool, int, localized, optStr, str } from "../admin/form";

const roles: Role[] = ["SUPERADMIN", "EDITOR", "FINANCE"];

function pickRoles(fd: FormData): Role[] {
  return fd.getAll("roles").map(String).filter((r): r is Role => (roles as string[]).includes(r));
}

// ---------------------------------------------------------------------------
// Applications

const appStatuses: ApplicationStatus[] = ["NEW", "INTERVIEW", "MEETING", "APPROVED", "REJECTED"];

export async function updateApplication(fd: FormData) {
  const user = await requireUser(["EDITOR"]);
  const id = str(fd, "id");
  const before = await db.application.findUnique({ where: { id } });
  if (!before) redirect("/admin/applications");
  const statusRaw = str(fd, "status");
  const data = {
    status: (appStatuses as string[]).includes(statusRaw) ? (statusRaw as ApplicationStatus) : before!.status,
    internalNotes: optStr(fd, "internalNotes", 10_000),
    rejectReason: optStr(fd, "rejectReason", 2000),
    assignedToId: optStr(fd, "assignedToId"),
  };
  await db.application.update({ where: { id }, data });
  await audit({ actorId: user.id, action: "application.update", entityType: "Application", entityId: id, before: { status: before!.status }, after: { status: data.status } });
  redirect(`/admin/applications/${id}?saved=1`);
}

/** Removes personal data from a closed application (retention, decision 4.2). */
export async function anonymizeApplication(fd: FormData) {
  const user = await requireUser(["EDITOR"]);
  const id = str(fd, "id");
  await db.application.update({
    where: { id },
    data: { name: "—", contact: "—", city: null, answers: {}, internalNotes: null, anonymizedAt: new Date() },
  });
  await audit({ actorId: user.id, action: "application.anonymize", entityType: "Application", entityId: id });
  redirect(`/admin/applications/${id}?saved=1`);
}

// ---------------------------------------------------------------------------
// Users and invitations (superadmin)

export async function createInvitation(fd: FormData) {
  const user = await requireUser(["SUPERADMIN"]);
  const email = str(fd, "email", 200).toLowerCase();
  const name = str(fd, "name", 120);
  const r = pickRoles(fd);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name || !r.length) {
    redirect(`/admin/users?error=${encodeURIComponent("Укажите email, имя и хотя бы одну роль.")}`);
  }
  if (await db.user.findUnique({ where: { email } })) {
    redirect(`/admin/users?error=${encodeURIComponent("Пользователь с этим email уже есть.")}`);
  }
  const token = newToken();
  const invite = await db.invitation.create({
    data: { email, name, roles: r, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000), createdById: user.id },
  });
  const link = appUrl(`/admin/invite/${token}`);
  const sent = await sendMail(email, "Приглашение в админку Whiskers Club", `${user.name} приглашает вас в админку Whiskers Club.\nСсылка действует 7 дней:\n${link}`);
  await audit({ actorId: user.id, action: "user.invite", entityType: "Invitation", entityId: invite.id, after: { email, roles: r } });
  // The link is shown once so it can be sent by hand when email is not configured.
  redirect(`/admin/users?link=${encodeURIComponent(link)}&sent=${sent ? 1 : 0}`);
}

export async function revokeInvitation(fd: FormData) {
  const user = await requireUser(["SUPERADMIN"]);
  const id = str(fd, "id");
  await db.invitation.update({ where: { id }, data: { revokedAt: new Date() } });
  await audit({ actorId: user.id, action: "user.invite_revoked", entityType: "Invitation", entityId: id });
  redirect("/admin/users?saved=1");
}

export async function updateUser(fd: FormData) {
  const me = await requireUser(["SUPERADMIN"]);
  const id = str(fd, "id");
  const before = await db.user.findUnique({ where: { id } });
  if (!before) redirect("/admin/users");
  const r = pickRoles(fd);
  const isActive = bool(fd, "isActive");
  if (id === me.id && (!r.includes("SUPERADMIN") || !isActive)) {
    redirect(`/admin/users?error=${encodeURIComponent("Нельзя снять с себя роль суперадмина или отключить себя.")}`);
  }
  await db.user.update({ where: { id }, data: { roles: r, isActive } });
  if (!isActive) await db.session.deleteMany({ where: { userId: id } });
  await audit({ actorId: me.id, action: "user.update", entityType: "User", entityId: id, before: { roles: before!.roles, isActive: before!.isActive }, after: { roles: r, isActive } });
  redirect("/admin/users?saved=1");
}

export async function makeResetLink(fd: FormData) {
  const me = await requireUser(["SUPERADMIN"]);
  const id = str(fd, "id");
  const link = await createResetLink(id);
  await audit({ actorId: me.id, action: "user.reset_link", entityType: "User", entityId: id });
  redirect(`/admin/users?link=${encodeURIComponent(link)}&sent=0`);
}

// ---------------------------------------------------------------------------
// Own profile

export async function updateProfile(fd: FormData) {
  const me = await requireUser();
  const data = {
    name: str(fd, "name", 120) || me.name,
    contactTelegram: optStr(fd, "contactTelegram", 100),
    contactPhone: optStr(fd, "contactPhone", 50),
    contactWhatsapp: optStr(fd, "contactWhatsapp", 50),
    contactViber: optStr(fd, "contactViber", 50),
    contactInstagram: optStr(fd, "contactInstagram", 100),
    telegramChatId: optStr(fd, "telegramChatId", 50),
  };
  await db.user.update({ where: { id: me.id }, data });
  await audit({ actorId: me.id, action: "user.profile", entityType: "User", entityId: me.id, after: data });
  revalidatePath("/", "layout");
  redirect("/admin/profile?saved=1");
}

// ---------------------------------------------------------------------------
// Dictionaries (superadmin)

const groups: StatusGroup[] = ["ACTIVE", "ADOPTED", "ARCHIVE"];

function keyOf(fd: FormData): string {
  return str(fd, "key", 40).toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

export async function saveStatus(fd: FormData) {
  const me = await requireUser(["SUPERADMIN"]);
  const id = optStr(fd, "id");
  const groupRaw = str(fd, "group");
  const data = {
    label: localized(fd, "label", 80),
    color: /^#[0-9a-f]{6}$/i.test(str(fd, "color")) ? str(fd, "color") : "#888888",
    sortOrder: int(fd, "sortOrder") ?? 0,
    priority: int(fd, "priority") ?? 50,
    isPublic: bool(fd, "isPublic"),
    group: (groups as string[]).includes(groupRaw) ? (groupRaw as StatusGroup) : "ACTIVE",
  };
  const saved = id ? await db.catStatus.update({ where: { id }, data }) : await db.catStatus.create({ data: { ...data, key: keyOf(fd) } });
  await audit({ actorId: me.id, action: "taxonomy.status", entityType: "CatStatus", entityId: saved.id, after: data });
  revalidatePath("/", "layout");
  redirect("/admin/taxonomies?saved=1");
}

export async function saveFlag(fd: FormData) {
  const me = await requireUser(["SUPERADMIN"]);
  const id = optStr(fd, "id");
  const data = { label: localized(fd, "label", 80), sortOrder: int(fd, "sortOrder") ?? 0, isPublic: bool(fd, "isPublic") };
  const saved = id ? await db.catFlag.update({ where: { id }, data }) : await db.catFlag.create({ data: { ...data, key: keyOf(fd) } });
  await audit({ actorId: me.id, action: "taxonomy.flag", entityType: "CatFlag", entityId: saved.id, after: data });
  revalidatePath("/", "layout");
  redirect("/admin/taxonomies?saved=1");
}

export async function saveFilter(fd: FormData) {
  const me = await requireUser(["SUPERADMIN"]);
  const id = optStr(fd, "id");
  const data = {
    label: localized(fd, "label", 80),
    sortOrder: int(fd, "sortOrder") ?? 0,
    isEnabled: bool(fd, "isEnabled"),
    statusGroups: fd.getAll("statusGroups").map(String).filter((g): g is StatusGroup => (groups as string[]).includes(g)),
    statusKeys: fd.getAll("statusKeys").map(String),
    flagKeys: fd.getAll("flagKeys").map(String),
    requireActiveCampaign: bool(fd, "requireActiveCampaign"),
  };
  if (!data.statusGroups.length) data.statusGroups = ["ACTIVE"];
  const saved = id ? await db.catalogFilter.update({ where: { id }, data }) : await db.catalogFilter.create({ data: { ...data, key: keyOf(fd) } });
  await audit({ actorId: me.id, action: "taxonomy.filter", entityType: "CatalogFilter", entityId: saved.id, after: data });
  revalidatePath("/", "layout");
  redirect("/admin/taxonomies?saved=1");
}

export async function saveCategory(fd: FormData) {
  const me = await requireUser(["SUPERADMIN"]);
  const id = optStr(fd, "id");
  const data = { label: localized(fd, "label", 80), sortOrder: int(fd, "sortOrder") ?? 0, isActive: bool(fd, "isActive") };
  const saved = id ? await db.expenseCategory.update({ where: { id }, data }) : await db.expenseCategory.create({ data: { ...data, key: keyOf(fd) } });
  await audit({ actorId: me.id, action: "taxonomy.category", entityType: "ExpenseCategory", entityId: saved.id, after: data });
  revalidatePath("/", "layout");
  redirect("/admin/taxonomies?saved=1");
}

// ---------------------------------------------------------------------------
// Site settings (superadmin)

export async function saveSettings(fd: FormData) {
  const me = await requireUser(["SUPERADMIN"]);
  const rate = Number(str(fd, "eurRate").replace(",", "."));
  const values: Partial<SiteSettings> = {
    eurRate: Number.isFinite(rate) && rate > 0 ? rate : 117,
    counterOffsets: {
      rescued: int(fd, "offsetRescued") ?? 0,
      adopted: int(fd, "offsetAdopted") ?? 0,
      sterilized: int(fd, "offsetSterilized") ?? 0,
    },
    showStats: bool(fd, "showStats"),
    heroText: localized(fd, "heroText"),
    aboutText: localized(fd, "aboutText"),
    malaStory: localized(fd, "malaStory"),
    privacyText: localized(fd, "privacyText", 50_000),
    contactText: localized(fd, "contactText"),
    instagramUrl: str(fd, "instagramUrl", 300),
    facebookUrl: str(fd, "facebookUrl", 300),
    youtubeUrl: str(fd, "youtubeUrl", 300),
    tiktokUrl: str(fd, "tiktokUrl", 300),
    telegramUrl: str(fd, "telegramUrl", 300),
    paypalUrl: str(fd, "paypalUrl", 300),
    reportsUrl: str(fd, "reportsUrl", 500),
    contactEmail: str(fd, "contactEmail", 200),
  };
  for (const [k, v] of Object.entries(values)) await setSetting(k as keyof SiteSettings, v as never);
  await audit({ actorId: me.id, action: "settings.update", entityType: "SiteSetting", after: values });
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

export async function savePartner(fd: FormData) {
  const me = await requireUser(["SUPERADMIN"]);
  const id = optStr(fd, "id");
  const url = optStr(fd, "url", 300);
  const data = {
    name: str(fd, "name", 120),
    url: url && /^https?:\/\//.test(url) ? url : null,
    description: localized(fd, "description", 500),
    sortOrder: int(fd, "sortOrder") ?? 0,
    isActive: bool(fd, "isActive"),
  };
  if (!data.name) redirect(`/admin/settings?error=${encodeURIComponent("Укажите название партнёра.")}#partners`);
  const saved = id ? await db.partner.update({ where: { id }, data }) : await db.partner.create({ data });
  await audit({ actorId: me.id, action: "partner.save", entityType: "Partner", entityId: saved.id, after: data });
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1#partners");
}

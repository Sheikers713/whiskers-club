import type { Role } from "@prisma/client";

export const roleLabels: Record<Role, string> = {
  SUPERADMIN: "Суперадмин",
  EDITOR: "Редактор",
  FINANCE: "Финансы",
};

/** Superadmin can do everything; otherwise the user needs one of `allowed`. */
export function hasRole(userRoles: Role[], allowed: Role[]): boolean {
  if (userRoles.includes("SUPERADMIN")) return true;
  return allowed.some((r) => userRoles.includes(r));
}

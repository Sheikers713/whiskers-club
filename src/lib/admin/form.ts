import { locales } from "../i18n/config";
import type { LocalizedText } from "../i18n/localized";

export function str(fd: FormData, key: string, max = 10_000): string {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}

export function optStr(fd: FormData, key: string, max = 10_000): string | null {
  const v = str(fd, key, max);
  return v === "" ? null : v;
}

export function int(fd: FormData, key: string): number | null {
  const raw = str(fd, key).replace(/[\s ]/g, "").replace(",", ".");
  if (raw === "") return null;
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? n : null;
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function date(fd: FormData, key: string): Date | null {
  const v = str(fd, key);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Reads fields named `<key>.en`, `<key>.ru`, `<key>.sr`. */
export function localized(fd: FormData, key: string, max = 20_000): LocalizedText {
  const out: LocalizedText = {};
  for (const l of locales) {
    const v = str(fd, `${key}.${l}`, max);
    if (v) out[l] = v;
  }
  return out;
}

export function ids(fd: FormData, key: string): string[] {
  return fd
    .getAll(key)
    .map(String)
    .filter((v) => /^[0-9a-f-]{36}$/.test(v));
}

export function toDateInput(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

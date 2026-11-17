"use client";

import { useState } from "react";

type Labels = { amount: string; other: string; alt: string; save: string };

/**
 * Amount buttons and the QR code that follows them (drawn by /api/ips-qr).
 * `compact` (the cat page) leaves out the custom amount field.
 */
export function IpsQrPicker({ slug, amounts, labels, locale, compact = false }: { slug: string | null; amounts: number[]; labels: Labels; locale: string; compact?: boolean }) {
  const [amount, setAmount] = useState(amounts[1] ?? amounts[0]);
  const [custom, setCustom] = useState("");
  const query = new URLSearchParams({ ...(slug ? { cat: slug } : {}), amount: String(amount) }).toString();
  const rsd = (n: number) => `${n.toLocaleString(locale === "sr" ? "sr-Latn-RS" : locale === "ru" ? "ru-RU" : "en-GB")} RSD`;
  const chip = (active: boolean) =>
    `rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-semibold ring-1 ${active ? "bg-ink text-milk ring-ink" : "bg-paper ring-line hover:bg-milk"}`;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {/* eslint-disable-next-line @next/next/no-img-element -- a dynamic SVG from our own route */}
      <img
        src={`/api/ips-qr?${query}`}
        alt={labels.alt.replace("{amount}", rsd(amount))}
        width={200}
        height={200}
        className="h-[200px] w-[200px] shrink-0 self-center rounded-lg bg-white p-1 ring-1 ring-line [image-rendering:pixelated] sm:self-start"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{labels.amount}</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={labels.amount}>
          {amounts.map((a) => (
            <button key={a} type="button" aria-pressed={amount === a && !custom} onClick={() => { setAmount(a); setCustom(""); }} className={chip(amount === a && !custom)}>
              {rsd(a)}
            </button>
          ))}
        </div>
        {!compact && (
          <label className="mt-3 block text-sm">
            <span className="text-ink-soft">{labels.other}</span>
            <input
              type="number"
              inputMode="numeric"
              min={50}
              max={1000000}
              step={50}
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                const n = Math.round(Number(e.target.value));
                if (n >= 50 && n <= 1_000_000) setAmount(n);
              }}
              className="mt-1 block w-40 rounded-[var(--radius-control)] border border-ink/15 bg-paper px-3 py-1.5"
            />
          </label>
        )}
        <a href={`/api/ips-qr?${query}&download=1`} download className="mt-3 inline-block text-sm font-semibold text-brick underline underline-offset-2">
          {labels.save} ↓
        </a>
      </div>
    </div>
  );
}

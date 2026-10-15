"use client";

import { useState } from "react";

export function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked: the value is visible and selectable anyway.
        }
      }}
      className="rounded-[var(--radius-control)] border border-ink/15 px-3 py-1.5 text-sm font-medium hover:bg-milk"
      aria-live="polite"
    >
      {copied ? `✓ ${copiedLabel}` : label}
    </button>
  );
}

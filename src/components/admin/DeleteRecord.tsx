"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** «Удалить запись» on a full form: asks first, then goes back to the list. */
export function DeleteRecord({ what, action, back }: { what: string; action: () => Promise<{ error: string } | { ok: true }>; back: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          window.confirm(`Удалить ${what}? Это нельзя отменить.`) &&
          start(async () => {
            const r = await action();
            if ("error" in r) setError(r.error);
            else router.push(back);
          })
        }
        className="rounded-lg px-4 py-2 text-sm font-semibold text-brick ring-1 ring-brick/40 hover:bg-brick hover:text-milk disabled:opacity-50"
      >
        {pending ? "Удаляю…" : "Удалить запись"}
      </button>
      {error && <p className="mt-1 text-sm text-brick">{error}</p>}
    </div>
  );
}

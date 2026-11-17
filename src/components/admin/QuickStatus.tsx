"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Sex } from "@prisma/client";
import { setCatStatus } from "@/lib/actions/cats";
import { StatusPill, type PillStatus } from "./StatusPill";

/** Status pill in the cat list; a click opens the other statuses to switch to. */
export function QuickStatus({ catId, sex, current, statuses }: { catId: string; sex: Sex; current: string; statuses: PillStatus[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const status = statuses.find((s) => s.id === current);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={pending}
        aria-expanded={open}
        title="Сменить статус"
        className="flex items-center gap-1 rounded-md disabled:opacity-50"
      >
        {status && <StatusPill status={status} sex={sex} />}
        <span aria-hidden className="text-xs text-ink-soft">▾</span>
      </button>
      {open && (
        <ul className="absolute right-0 z-20 mt-1 w-max space-y-1 rounded-[var(--radius-card)] bg-paper p-2 shadow-lg ring-1 ring-line">
          {statuses.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={`w-full rounded-md p-1 text-left hover:bg-milk ${s.id === current ? "bg-milk" : ""}`}
                onClick={() => {
                  setOpen(false);
                  if (s.id === current) return;
                  start(async () => {
                    const fd = new FormData();
                    fd.set("id", catId);
                    fd.set("statusId", s.id);
                    await setCatStatus(fd);
                  });
                }}
              >
                <StatusPill status={s} sex={sex} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

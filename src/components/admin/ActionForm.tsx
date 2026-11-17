"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { actionFailed, isNextControlFlow } from "@/lib/action-error";
import { reportClientError, shrinkFormFiles } from "@/lib/upload-shrink";

export type ActionResult = { error?: string } | void;

/**
 * Submits a server action without React's automatic form reset, so a
 * validation error never wipes what the admin typed (receipts are often
 * entered on a phone). On success the action redirects.
 */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      className={className}
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => {
          const fd = await shrinkFormFiles(form);
          let res: ActionResult;
          try {
            res = await action(fd);
          } catch (e) {
            if (isNextControlFlow(e)) throw e;
            console.error(e);
            reportClientError("action-form", e, fd);
            res = { error: actionFailed(e) };
          }
          if (res && res.error) {
            setError(res.error);
            ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      }}
    >
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-brick-soft px-4 py-3 font-medium text-brick-dark">
          {error}
        </p>
      )}
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { submitApplication, type FormState } from "@/lib/actions/applications";

type Field = { name: string; label: string; multiline?: boolean; required?: boolean };

export type FormLabels = {
  name: string;
  contactMethod: string;
  contact: string;
  city: string;
  consent: string;
  privacyLink: string;
  required: string;
  submit: string;
  sending: string;
  thanksTitle: string;
  thanksText: string;
  error: string;
  tooMany: string;
  messengers: Record<string, string>;
};

const input =
  "mt-1 block w-full rounded-[var(--radius-card)] border border-line bg-paper px-4 py-3 text-base focus:border-ink focus:outline-none";

export function ApplicationForm({
  type,
  locale,
  catId,
  fields,
  labels,
}: {
  type: string;
  locale: string;
  catId?: string;
  fields: Field[];
  labels: FormLabels;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitApplication, { status: "idle" });
  const [startedAt] = useState(() => Date.now());
  const bad = new Set(state.errors ?? []);

  if (state.status === "ok") {
    return (
      <div role="status" className="rounded-[var(--radius-card)] bg-sage-soft p-6">
        <h2 className="text-2xl font-bold">{labels.thanksTitle}</h2>
        <p className="mt-2">{labels.thanksText}</p>
      </div>
    );
  }

  const label = (text: string, required?: boolean) => (
    <span className="font-medium">
      {text}
      {required && <span className="text-brick" aria-label={labels.required}> *</span>}
    </span>
  );

  return (
    <form action={action} className="space-y-5" noValidate={false}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="startedAt" value={startedAt} />
      {catId && <input type="hidden" name="catId" value={catId} />}
      <div aria-hidden className="absolute -left-[9999px]">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {(state.status === "error" || state.status === "rate") && (
        <p role="alert" className="rounded-[var(--radius-card)] bg-brick-soft px-4 py-3 font-medium text-brick-dark">
          {state.status === "rate" ? labels.tooMany : labels.error}
        </p>
      )}

      <label className="block">
        {label(labels.name, true)}
        <input name="name" required maxLength={120} autoComplete="name" className={input} aria-invalid={bad.has("name")} />
      </label>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,12rem)_1fr]">
        <label className="block">
          {label(labels.contactMethod, true)}
          <select name="contactMethod" required className={input} defaultValue="telegram">
            {Object.entries(labels.messengers).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          {label(labels.contact, true)}
          <input name="contact" required maxLength={200} className={input} aria-invalid={bad.has("contact")} />
        </label>
      </div>
      <label className="block">
        {label(labels.city)}
        <input name="city" maxLength={120} autoComplete="address-level2" className={input} />
      </label>

      {fields.map((f) => (
        <label key={f.name} className="block">
          {label(f.label, f.required)}
          {f.multiline ? (
            <textarea name={f.name} required={f.required} rows={4} maxLength={4000} className={input} aria-invalid={bad.has(f.name)} />
          ) : (
            <input name={f.name} required={f.required} maxLength={4000} className={input} aria-invalid={bad.has(f.name)} />
          )}
        </label>
      ))}

      <label className="flex items-start gap-3">
        <input type="checkbox" name="consent" required className="mt-1 h-5 w-5 shrink-0" aria-invalid={bad.has("consent")} />
        <span className="text-sm">
          {labels.consent}{" "}
          <a href={`/${locale}/privacy`} target="_blank" className="underline">
            {labels.privacyLink}
          </a>
        </span>
      </label>

      <button type="submit" disabled={pending} className="w-full rounded-[var(--radius-control)] bg-brick px-6 py-3.5 text-lg font-semibold text-white hover:bg-brick-dark disabled:opacity-60 sm:w-auto">
        {pending ? labels.sending : labels.submit}
      </button>
    </form>
  );
}

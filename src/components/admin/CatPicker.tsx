"use client";

import { useState } from "react";

export type PickerCat = { id: string; name: string; active: boolean };

/**
 * Who the money is for: «Общий фонд» or one or more cats. The general fund is
 * exclusive (it is never split with a cat). Only cats in our care right now are
 * offered; «показать всех» also lists adopted and archived ones. Cats already
 * chosen are always shown.
 *
 * Sends the choice as hidden inputs named `name` (empty value = general fund).
 * `variant="cell"` is a compact dropdown for the money table; `onClose` fires
 * when its list is closed with a changed choice.
 */
export function CatPicker({
  cats,
  name,
  defaultValue,
  multiple = true,
  form,
  variant = "inline",
  onClose,
}: {
  cats: PickerCat[];
  name?: string;
  defaultValue: string[];
  multiple?: boolean;
  form?: string;
  variant?: "inline" | "cell";
  onClose?: (ids: string[]) => void;
}) {
  const [sel, setSel] = useState(defaultValue);
  const [all, setAll] = useState(false);
  const [last, setLast] = useState(defaultValue.join());
  // A server refresh replaces the choice.
  if (defaultValue.join() !== last) {
    setLast(defaultValue.join());
    setSel(defaultValue);
  }
  const shown = cats.filter((c) => all || c.active || sel.includes(c.id));
  const hiddenCount = cats.length - shown.length;
  const toggle = (id: string) =>
    setSel(multiple ? (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]) : sel.includes(id) ? [] : [id]);
  const label = sel.length ? cats.filter((c) => sel.includes(c.id)).map((c) => c.name).join(", ") : "Общий фонд";

  const hidden = name ? (
    sel.length ? sel.map((id) => <input key={id} type="hidden" name={name} value={id} form={form} />) : <input type="hidden" name={name} value="" form={form} />
  ) : null;

  const chip = (active: boolean) =>
    `flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 ${active ? "bg-ink text-milk" : "bg-milk hover:bg-line"}`;
  const options = (
    <>
      <label className={chip(sel.length === 0)}>
        <input type="checkbox" className="sr-only" checked={sel.length === 0} onChange={() => setSel([])} />
        Общий фонд
      </label>
      {shown.map((c) => (
        <label key={c.id} className={chip(sel.includes(c.id))}>
          <input type="checkbox" className="sr-only" checked={sel.includes(c.id)} onChange={() => toggle(c.id)} />
          {c.name}
        </label>
      ))}
      {(hiddenCount > 0 || all) && (
        <label className="flex items-center gap-2 px-2 py-1.5 text-sm text-ink-soft">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> показать всех котов
        </label>
      )}
    </>
  );

  if (variant === "inline") {
    return (
      <div>
        {hidden}
        <div className="mt-2 flex flex-wrap gap-2">{options}</div>
        {multiple && sel.length > 1 && <p className="mt-1 text-xs text-ink-soft">Сумма делится поровну между выбранными котами.</p>}
      </div>
    );
  }
  return (
    <details
      className="relative"
      onToggle={(e) => {
        if (!(e.currentTarget as HTMLDetailsElement).open && onClose && sel.join() !== defaultValue.join()) onClose(sel);
      }}
    >
      {hidden}
      <summary className={`block cursor-pointer list-none px-2 py-1.5 ${sel.length ? "" : "text-ink-soft"}`}>{label}</summary>
      <div className="absolute z-20 mt-1 flex w-60 flex-col gap-1 rounded-lg bg-paper p-2 shadow-lg ring-1 ring-line">
        {options}
        {onClose && <p className="px-2 pt-1 text-xs text-ink-soft">Сохранится, когда закроете список.</p>}
      </div>
    </details>
  );
}

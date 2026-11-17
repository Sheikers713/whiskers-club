"use client";

import { useState } from "react";
import type { PickerCat } from "./CatPicker";

/**
 * «Пристраивается вместе с»: only cats in our care right now are listed;
 * «показать всех» adds adopted and archived ones. Cats already linked are
 * always shown so a link is never dropped by accident.
 */
export function BondedPicker({ cats, defaultValue }: { cats: PickerCat[]; defaultValue: string[] }) {
  const [all, setAll] = useState(false);
  const chosen = new Set(defaultValue);
  const visible = cats.filter((c) => all || c.active || chosen.has(c.id));
  const hiddenCount = cats.length - visible.length;
  return (
    <>
      <div className="mt-2 flex max-h-48 flex-wrap gap-3 overflow-y-auto">
        {cats.map((c) => (
          // Hidden cats stay in the DOM so their checkbox state survives toggling.
          <label key={c.id} className={`items-center gap-2 rounded-md bg-milk px-3 py-1.5 ${visible.includes(c) ? "flex" : "hidden"} ${c.active ? "" : "text-ink-soft"}`}>
            <input type="checkbox" name="bonded" value={c.id} defaultChecked={chosen.has(c.id)} />
            {c.name}
          </label>
        ))}
      </div>
      {(hiddenCount > 0 || all) && (
        <button type="button" onClick={() => setAll(!all)} className="mt-2 text-sm text-ink-soft underline hover:text-ink">
          {all ? "Только активные" : `Показать всех (+${hiddenCount})`}
        </button>
      )}
    </>
  );
}

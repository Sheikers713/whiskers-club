"use client";

import { useState } from "react";
import { inputCls } from "./ui";

/**
 * Age as "X years Y months" by default; the checkbox switches to an exact
 * birth date. The server turns years + months into an approximate date.
 */
export function AgeField({ birthDate, exact }: { birthDate: string; exact: boolean }) {
  const [isExact, setExact] = useState(exact);
  let years = "";
  let months = "";
  if (birthDate) {
    const b = new Date(`${birthDate}T00:00:00Z`);
    const now = new Date();
    let total = (now.getUTCFullYear() - b.getUTCFullYear()) * 12 + (now.getUTCMonth() - b.getUTCMonth());
    if (now.getUTCDate() < b.getUTCDate()) total -= 1;
    total = Math.max(0, total);
    years = String(Math.floor(total / 12));
    months = String(total % 12);
  }
  return (
    <div className="col-span-2 block">
      <span className="text-sm font-medium">Возраст</span>
      {isExact ? (
        <input type="date" name="birthDate" defaultValue={birthDate} className={inputCls} />
      ) : (
        <div className="mt-1 flex gap-2">
          <select name="ageYears" defaultValue={years} className={inputCls + " mt-0"} aria-label="Лет">
            <option value="">— лет</option>
            {Array.from({ length: 26 }, (_, i) => (
              <option key={i} value={i}>
                {i} {i % 10 === 1 && i !== 11 ? "год" : [2, 3, 4].includes(i % 10) && ![12, 13, 14].includes(i) ? "года" : "лет"}
              </option>
            ))}
          </select>
          <select name="ageMonths" defaultValue={months} className={inputCls + " mt-0"} aria-label="Месяцев">
            <option value="">— мес.</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {i} мес.
              </option>
            ))}
          </select>
        </div>
      )}
      <label className="mt-1.5 flex items-center gap-2 text-sm">
        <input type="checkbox" name="birthDateExact" checked={isExact} onChange={(e) => setExact(e.target.checked)} /> Точная дата рождения
      </label>
    </div>
  );
}

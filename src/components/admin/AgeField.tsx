"use client";

import { useState } from "react";
import { inputCls } from "./ui";

function ageParts(birthDate: string): { years: string; months: string } {
  if (!birthDate) return { years: "", months: "" };
  const b = new Date(`${birthDate}T00:00:00Z`);
  const now = new Date();
  let total = (now.getUTCFullYear() - b.getUTCFullYear()) * 12 + (now.getUTCMonth() - b.getUTCMonth());
  if (now.getUTCDate() < b.getUTCDate()) total -= 1;
  total = Math.max(0, total);
  return { years: String(Math.floor(total / 12)), months: String(total % 12) };
}

/** Today minus the age, as YYYY-MM-DD (day clamped to the target month's length). */
function dateFromAge(years: number, months: number): string {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth() - months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(now.getUTCDate(), lastDay));
  return first.toISOString().slice(0, 10);
}

const yearWord = (i: number) => (i % 10 === 1 && i !== 11 ? "год" : [2, 3, 4].includes(i % 10) && ![12, 13, 14].includes(i) ? "года" : "лет");

/**
 * Every cat has a birth date, and the age on the site is counted from it, so
 * it grows by itself. When only the age is known, pick years and months: the
 * date is set to today minus that age and can be corrected by hand.
 */
export function AgeField({ birthDate }: { birthDate: string }) {
  const [date, setDate] = useState(birthDate);
  const { years, months } = ageParts(date);
  const fromAge = (y: string, m: string) => setDate(dateFromAge(Number(y || 0), Number(m || 0)));
  return (
    <div className="col-span-2 block">
      <span className="text-sm font-medium">Дата рождения</span>
      <div className="mt-1 grid grid-cols-[1.3fr_1fr_1fr] gap-2">
        <input type="date" name="birthDate" required value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className={inputCls + " mt-0"} />
        <select value={years} onChange={(e) => fromAge(e.target.value, months)} className={inputCls + " mt-0"} aria-label="Лет">
          <option value="">— лет</option>
          {Array.from({ length: 26 }, (_, i) => (
            <option key={i} value={i}>
              {i} {yearWord(i)}
            </option>
          ))}
        </select>
        <select value={months} onChange={(e) => fromAge(years, e.target.value)} className={inputCls + " mt-0"} aria-label="Месяцев">
          <option value="">— мес.</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>
              {i} мес.
            </option>
          ))}
        </select>
      </div>
      <p className="mt-1 text-xs text-ink-soft">Если точной даты нет, выберите возраст: дата встанет сама, возраст на сайте дальше растёт автоматически.</p>
    </div>
  );
}

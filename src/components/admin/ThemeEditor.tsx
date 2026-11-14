"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { saveTheme } from "@/lib/actions/admin";
import {
  colorLabels,
  defaultTheme,
  fonts,
  normalizeTheme,
  themePresets,
  themeCss,
  themeVars,
  type ColorKey,
  type FontKey,
  type Theme,
} from "@/lib/theme";
import { btnCls, btnSecondaryCls } from "./ui";

const pages = [
  { path: "/ru", label: "Главная" },
  { path: "/ru/cats", label: "Коты" },
  { path: "/ru/help", label: "Как помочь" },
  { path: "/ru/transparency", label: "Отчётность" },
  { path: "/ru/about", label: "О нас" },
];

const groups: { title: string; keys: ColorKey[] }[] = [
  { title: "Фон и поверхности", keys: ["milk", "paper", "creamDeep", "line"] },
  { title: "Текст", keys: ["ink", "inkSoft"] },
  { title: "Акценты", keys: ["brick", "orange", "sage"] },
  { title: "Герой на главной", keys: ["olive", "sun"] },
];

const HEX = /^#[0-9a-f]{6}$/i;

function ColorField({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  // The hex box keeps half-typed text; a new value from outside (picker, preset) replaces it.
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setText(value);
  }
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-line bg-paper p-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-tight">{label}</div>
        {hint && <div className="truncate text-xs text-ink-soft">{hint}</div>}
      </div>
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const v = e.target.value.trim();
          if (HEX.test(v)) onChange(v.toLowerCase());
        }}
        spellCheck={false}
        className="w-[5.5rem] rounded-md border border-line bg-paper px-2 py-1.5 font-mono text-sm"
      />
    </div>
  );
}

function Range({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm font-medium">
        {label}
        <span className="font-mono text-ink-soft">
          {value}
          {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[var(--color-ink)]" />
    </label>
  );
}

function FontSelect({ label, value, onChange }: { label: string; value: FontKey; onChange: (v: FontKey) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FontKey)}
        className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-base"
        style={{ fontFamily: fonts[value].family }}
      >
        {(Object.keys(fonts) as FontKey[]).map((k) => (
          <option key={k} value={k} style={{ fontFamily: fonts[k].family }}>
            {fonts[k].label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-line pt-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">{title}</h2>
      {children}
    </section>
  );
}

function Swatches({ theme }: { theme: Theme }) {
  const t = theme;
  return (
    <span className="flex overflow-hidden rounded-md ring-1 ring-line">
      {[t.colors.milk, t.colors.paper, t.colors.ink, t.colors.brick, t.colors.orange, t.colors.sage, t.colors.sun].map((c, i) => (
        <span key={i} className="h-5 w-4" style={{ background: c }} />
      ))}
    </span>
  );
}

/** Live theme editor: every change is applied to the site in the preview frame at once; «Сохранить» publishes it. */
export function ThemeEditor({ saved }: { saved: Theme }) {
  const [theme, setTheme] = useState<Theme>(saved);
  const [published, setPublished] = useState<Theme>(saved);
  const [page, setPage] = useState(pages[0].path);
  const [mobile, setMobile] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const frame = useRef<HTMLIFrameElement>(null);

  const apply = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.head) return;
    // A stronger selector than the saved theme's <style>, so the frame shows the draft.
    // A separate <style> rather than inline styles on <html>, which React would flag on hydration.
    let el = doc.getElementById("theme-draft");
    if (!el) {
      el = doc.createElement("style");
      el.id = "theme-draft";
      doc.head.appendChild(el);
    }
    el.textContent = themeCss(theme).replace("html:root{", "html:root:root{");
  }, [theme]);
  useEffect(apply, [apply]);

  const dirty = JSON.stringify(theme) !== JSON.stringify(published);
  const set = (patch: Partial<Theme>) => {
    setMessage("");
    setTheme((t) => normalizeTheme({ ...t, ...patch }));
  };
  const setColor = (k: ColorKey, v: string) => set({ colors: { ...theme.colors, [k]: v } });
  const setGradient = (patch: Partial<Theme["gradient"]>) => set({ gradient: { ...theme.gradient, ...patch } });
  const setShadow = (patch: Partial<Theme["shadow"]>) => set({ shadow: { ...theme.shadow, ...patch } });

  const save = () =>
    start(async () => {
      await saveTheme(theme);
      setPublished(theme);
      setMessage("Сохранено: сайт уже выглядит так.");
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="space-y-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2">
        <Section title="Готовые варианты">
          <div className="space-y-2">
            {themePresets.map((p) => {
              const active = JSON.stringify(normalizeTheme(p.theme)) === JSON.stringify(theme);
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => set(p.theme)}
                  className={`block w-full rounded-lg p-3 text-left ring-1 transition ${active ? "bg-paper ring-2 ring-ink" : "ring-line hover:bg-paper"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{p.label}</span>
                    <Swatches theme={p.theme} />
                  </span>
                  <span className="mt-1 block text-xs text-ink-soft">{p.note}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Фон страницы">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={theme.gradient.enabled} onChange={(e) => setGradient({ enabled: e.target.checked })} />
            Мягкий градиент вместо ровного фона
          </label>
          {theme.gradient.enabled && (
            <>
              <div
                className="h-14 rounded-lg ring-1 ring-line"
                style={{ background: themeVars(theme)["--page-bg"] }}
                aria-hidden
              />
              <ColorField label="Начало (сверху)" value={theme.gradient.from} onChange={(v) => setGradient({ from: v })} />
              <ColorField label="Конец (снизу)" value={theme.gradient.to} onChange={(v) => setGradient({ to: v })} />
              <Range label="Направление" value={theme.gradient.angle} min={0} max={360} step={5} unit="°" onChange={(v) => setGradient({ angle: v })} />
            </>
          )}
        </Section>

        {groups.map((g) => (
          <Section key={g.title} title={g.title}>
            {g.keys.map((k) => (
              <ColorField key={k} label={colorLabels[k].label} hint={colorLabels[k].hint} value={theme.colors[k]} onChange={(v) => setColor(k, v)} />
            ))}
          </Section>
        ))}

        <Section title="Шрифты">
          <FontSelect label="Заголовки" value={theme.displayFont} onChange={(v) => set({ displayFont: v })} />
          <Range label="Жирность заголовков" value={theme.displayWeight} min={300} max={900} step={100} onChange={(v) => set({ displayWeight: v })} />
          <Range label="Межбуквенный интервал" value={theme.displayTracking} min={-80} max={40} step={5} unit="‰" onChange={(v) => set({ displayTracking: v })} />
          <FontSelect label="Основной текст" value={theme.bodyFont} onChange={(v) => set({ bodyFont: v })} />
        </Section>

        <Section title="Скругления">
          <Range label="Карточки и фото" value={theme.radiusCard} min={0} max={40} unit="px" onChange={(v) => set({ radiusCard: v })} />
          <Range label="Кнопки" value={Math.min(theme.radiusControl, 30)} min={0} max={30} unit="px" onChange={(v) => set({ radiusControl: v })} />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={theme.radiusControl >= 999} onChange={(e) => set({ radiusControl: e.target.checked ? 999 : 8 })} />
            Кнопки-пилюли
          </label>
        </Section>

        <Section title="Тень карточек">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={theme.shadow.enabled} onChange={(e) => setShadow({ enabled: e.target.checked })} />
            Мягкая тень под карточками
          </label>
          {theme.shadow.enabled && (
            <>
              <div className="flex justify-center rounded-lg p-5" style={{ background: themeVars(theme)["--page-bg"] }} aria-hidden>
                <div
                  className="h-14 w-32"
                  style={{
                    background: theme.colors.paper,
                    borderRadius: theme.radiusCard,
                    boxShadow: `${themeVars(theme)["--card-shadow"]}, 0 0 0 1px ${theme.colors.line}`,
                  }}
                />
              </div>
              <ColorField label="Цвет тени" value={theme.shadow.color} onChange={(v) => setShadow({ color: v })} />
              <Range label="Размытие" value={theme.shadow.blur} min={0} max={80} unit="px" onChange={(v) => setShadow({ blur: v })} />
              <Range label="Смещение вниз" value={theme.shadow.offsetY} min={0} max={40} unit="px" onChange={(v) => setShadow({ offsetY: v })} />
              <Range label="Плотность" value={theme.shadow.opacity} min={0} max={60} unit="%" onChange={(v) => setShadow({ opacity: v })} />
            </>
          )}
        </Section>

        <div className="sticky bottom-0 -mx-1 space-y-2 border-t border-line bg-milk px-1 py-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={!dirty || pending} className={btnCls}>
              {pending ? "Сохраняю…" : "Сохранить на сайт"}
            </button>
            <button type="button" onClick={() => setTheme(published)} disabled={!dirty || pending} className={btnSecondaryCls}>
              Отменить
            </button>
          </div>
          <button type="button" onClick={() => set(defaultTheme)} className="text-sm text-ink-soft underline">
            Вернуть бренд-бук
          </button>
          <p className="text-sm text-ink-soft" role="status">
            {message || (dirty ? "Есть несохранённые изменения: их видно только в превью." : "Это то, что сейчас на сайте.")}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {pages.map((p) => (
            <button
              key={p.path}
              type="button"
              onClick={() => setPage(p.path)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${page === p.path ? "bg-ink text-milk" : "bg-paper ring-1 ring-line hover:bg-milk"}`}
            >
              {p.label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-line" />
          <button type="button" onClick={() => setMobile(!mobile)} className="rounded-md bg-paper px-3 py-1.5 text-sm font-semibold ring-1 ring-line hover:bg-milk">
            {mobile ? "Телефон → компьютер" : "Компьютер → телефон"}
          </button>
        </div>
        <div className="flex justify-center rounded-[var(--radius-card)] bg-ink/5 p-2">
          <iframe
            ref={frame}
            key={page}
            src={page}
            title="Превью сайта"
            onLoad={apply}
            className={`h-[calc(100vh-11rem)] min-h-[32rem] rounded-md bg-paper shadow-sm ring-1 ring-line ${mobile ? "w-[390px]" : "w-full"}`}
          />
        </div>
      </div>
    </div>
  );
}

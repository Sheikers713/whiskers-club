"use client";

import { useEffect, useRef, useState } from "react";

// Brand book palette and cats. The sun is never olive: it would vanish into Olive Dot.
const SUN_COLORS = ["#efc766", "#e39a46", "#cf6437", "#c82424", "#f5dcd5", "#f8f3eb"];
const CATS = ["black", "blue", "calico", "ginger", "mackerel", "point", "tortie", "tuxedo"];

const HOLD_MS = 4500; // the sun stays at its peak
const SWING_MS = 1600; // setting / rising along the arc
const CAT_MS = 700; // the cat ducks out of frame and the next one rises
const SUNS_PER_CAT = 3;

function pick<T>(list: T[], not: T): T {
  const rest = list.filter((x) => x !== not);
  return rest[Math.floor(Math.random() * rest.length)];
}

/**
 * Hero illustration: the sun sets along an arc to the lower right while a new
 * one in another brand colour rises from the left; every few suns the cat
 * slips down and a cat of another coat comes up. Static for reduced motion.
 */
export function HeroArt() {
  const [suns, setSuns] = useState([{ id: 0, color: SUN_COLORS[0], angle: 0 }]);
  const [cat, setCat] = useState("black");
  const [catDown, setCatDown] = useState(false);
  const count = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Warm the cache so a new cat never pops in half-loaded.
    for (const c of CATS) new Image().src = `/brand/cat-${c}.webp`;
    const timers: number[] = [];
    const cycle = () => {
      count.current += 1;
      const id = count.current;
      setSuns((prev) => {
        const current = prev[prev.length - 1];
        // The new sun starts below the left edge; the next frame swings both.
        return [{ ...current, angle: 0 }, { id, color: pick(SUN_COLORS, current.color), angle: -75 }];
      });
      timers.push(
        window.setTimeout(() => setSuns((prev) => prev.map((s) => ({ ...s, angle: s.id === id ? 0 : 75 }))), 50),
        window.setTimeout(() => setSuns((prev) => prev.filter((s) => s.id === id)), SWING_MS + 100),
      );
      if (id % SUNS_PER_CAT === 0) {
        setCatDown(true);
        timers.push(
          window.setTimeout(() => {
            setCat((c) => pick(CATS, c));
            setCatDown(false);
          }, CAT_MS + 100),
        );
      }
    };
    const interval = window.setInterval(cycle, HOLD_MS + SWING_MS);
    return () => {
      window.clearInterval(interval);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  return (
    <div aria-hidden className="olive-dot relative min-h-72 overflow-hidden md:my-10 md:min-h-[26rem] md:rounded-[var(--radius-card)]">
      {suns.map((s) => (
        // An arm pivoting far below the frame: rotating it moves the sun along an arc.
        <div
          key={s.id}
          className="absolute left-1/2 top-[12%] h-[110%] w-[52%] max-w-64 origin-bottom transition-transform ease-in-out"
          style={{ transform: `translateX(-50%) rotate(${s.angle}deg)`, transitionDuration: `${SWING_MS}ms` }}
        >
          <div className="aspect-square w-full rounded-full transition-colors" style={{ backgroundColor: s.color }} />
        </div>
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/brand/cat-${cat}.webp`}
        alt=""
        width={1100}
        height={600}
        className="absolute inset-x-0 bottom-0 mx-auto w-[118%] max-w-none transition-transform ease-in-out"
        style={{ transform: `translateX(-8%) translateY(${catDown ? "105%" : "0"})`, transitionDuration: `${CAT_MS}ms` }}
      />
    </div>
  );
}

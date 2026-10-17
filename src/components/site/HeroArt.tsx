"use client";

import { useEffect, useRef } from "react";

// Brand book palette and cats. The sun is never olive: it would vanish into Olive Dot.
const SUN_COLORS = ["#efc766", "#e39a46", "#cf6437", "#c82424", "#f5dcd5", "#f8f3eb"];
const CATS = ["black", "blue", "calico", "ginger", "mackerel", "point", "tortie", "tuxedo"];

const HOLD_MS = 4500; // the sun rests at its peak
const SET_MS = 1800; // the old sun leaves along the arc...
const RISE_MS = 2200; // ...and only then the new one rises
const CAT_DOWN_MS = 650;
const CAT_UP_MS = 1100;
const SUNS_PER_CAT = 3;

// Setting accelerates away; rising decelerates and settles with a slight overshoot.
// The cat never overshoots upwards: that would lift its cropped bottom edge into view.
const EASE_SET = "cubic-bezier(0.55, 0, 0.8, 0.35)";
const EASE_RISE = "cubic-bezier(0.18, 0.9, 0.3, 1.08)";
const EASE_DUCK = "cubic-bezier(0.6, 0, 0.9, 0.4)";
const EASE_POP = "cubic-bezier(0.16, 1, 0.3, 1)";

// Far enough round the pivot to leave even a short, wide (phone) frame.
const OFF = 110;
const arm = (deg: number) => ({ transform: `translateX(-50%) rotate(${deg}deg)` });
const catAt = (y: string) => ({ transform: `translateX(-8%) translateY(${y})` });

/** Runs an animation and bakes its end state into the inline style, so finished animations don't pile up. */
function run(el: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions): Promise<void> {
  const a = el.animate(frames, { ...options, fill: "both" });
  return a.finished.then(() => {
    a.commitStyles();
    a.cancel();
  });
}

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
  const sunA = useRef<HTMLDivElement>(null);
  const sunB = useRef<HTMLDivElement>(null);
  const catImg = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const suns = [sunA.current!, sunB.current!];
    const img = catImg.current!;
    // Warm the cache so a new cat never pops in half-loaded.
    for (const c of CATS) new Image().src = `/brand/cat-${c}.webp`;

    let active = 0;
    let color = SUN_COLORS[0];
    let cat = "black";
    let count = 0;

    // One swing after another, each started only when the previous one has
    // finished, so a hidden tab never queues up a pile of animations.
    const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
    let alive = true;

    const swing = async () => {
      const out = suns[active];
      const next = suns[1 - active];
      color = pick(SUN_COLORS, color);
      (next.firstElementChild as HTMLElement).style.backgroundColor = color;
      active = 1 - active;
      count += 1;
      const moves: Promise<void>[] = [
        (async () => {
          await run(out, [arm(0), arm(OFF)], { duration: SET_MS, easing: EASE_SET });
          // Park it hidden: on a short phone frame part of a parked sun would still peek in.
          out.style.visibility = "hidden";
          out.style.transform = arm(-OFF).transform;
          next.style.visibility = "visible";
          await run(next, [arm(-OFF), arm(0)], { duration: RISE_MS, easing: EASE_RISE });
        })(),
      ];
      if (count % SUNS_PER_CAT === 0) {
        moves.push(
          run(img, [catAt("0"), catAt("105%")], { duration: CAT_DOWN_MS, easing: EASE_DUCK }).then(async () => {
            cat = pick(CATS, cat);
            img.src = `/brand/cat-${cat}.webp`;
            await img.decode().catch(() => {});
            await run(img, [catAt("105%"), catAt("0")], { duration: CAT_UP_MS, easing: EASE_POP });
          }),
        );
      }
      await Promise.all(moves);
    };

    void (async () => {
      while (alive) {
        await sleep(HOLD_MS);
        if (!alive) break;
        if (document.hidden) continue;
        await swing().catch(() => {});
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div aria-hidden className="olive-dot relative min-h-72 overflow-hidden md:my-10 md:min-h-[26rem] md:rounded-[var(--radius-card)]">
      {/* Arms pivoting far below the frame: rotating one moves its sun along an arc. */}
      <div ref={sunA} className="absolute left-1/2 top-[12%] h-[110%] w-[52%] max-w-64 origin-bottom" style={arm(0)}>
        <div className="aspect-square w-full rounded-full motion-safe:animate-[sun-float_6s_ease-in-out_infinite]" style={{ backgroundColor: SUN_COLORS[0] }} />
      </div>
      <div ref={sunB} className="absolute left-1/2 top-[12%] h-[110%] w-[52%] max-w-64 origin-bottom" style={{ ...arm(-OFF), visibility: "hidden" }}>
        <div className="aspect-square w-full rounded-full motion-safe:animate-[sun-float_6s_ease-in-out_infinite]" style={{ backgroundColor: SUN_COLORS[0] }} />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={catImg} src="/brand/cat-black.webp" alt="" width={1100} height={600} className="absolute inset-x-0 bottom-0 mx-auto w-[118%] max-w-none" style={catAt("0")} />
    </div>
  );
}

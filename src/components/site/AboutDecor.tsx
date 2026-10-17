import type { ReactNode } from "react";

// Hand-drawn decorations for the About page, after the founders' Instagram slides.

export function Blob({ className = "", variant = 0 }: { className?: string; variant?: 0 | 1 | 2 }) {
  const d = [
    "M43 -61C55 -50 62 -34 67 -16C72 2 74 22 65 36C56 51 36 60 16 66C-4 72 -24 75 -41 67C-58 59 -72 41 -76 21C-80 1 -74 -22 -61 -37C-48 -52 -28 -59 -9 -65C10 -71 31 -72 43 -61Z",
    "M52 -54C66 -39 73 -19 71 -1C69 17 58 34 44 47C30 60 13 69 -6 71C-25 73 -46 68 -58 54C-70 40 -73 18 -70 -2C-67 -22 -58 -40 -44 -55C-30 -70 -15 -81 3 -84C21 -87 38 -69 52 -54Z",
    "M38 -48C50 -38 62 -26 66 -11C70 4 66 21 56 33C46 45 30 52 13 58C-4 64 -22 69 -37 62C-52 55 -64 36 -69 16C-74 -4 -72 -25 -60 -38C-48 -51 -27 -56 -8 -60C11 -64 26 -58 38 -48Z",
  ][variant];
  return (
    <svg viewBox="-90 -90 180 180" aria-hidden className={`pointer-events-none absolute ${className}`}>
      <path d={d} fill="currentColor" />
    </svg>
  );
}

/** A loose white line that runs along a blob edge. */
export function Squiggle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 120" aria-hidden className={`pointer-events-none absolute ${className}`} fill="none">
      <path d="M5 110C40 60 70 100 100 70S150 10 195 15" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Heart({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={`pointer-events-none ${className}`} fill="none">
      <path
        d="M20 35C12 28 4 21 4 13.5 4 8.5 8 5 12.5 5c3.5 0 6 2 7.5 5 1.5-3 4-5 7.5-5C32 5 36 8.5 36 13.5 36 21 28 28 20 35Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Three short strokes, like an exclamation drawn next to a word. */
export function Sparks({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={`pointer-events-none ${className}`} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
      <path d="M22 4l6 11M6 14l12 6M4 30l13-1" />
    </svg>
  );
}

export function Paw({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={`pointer-events-none ${className}`} fill="currentColor">
      <ellipse cx="32" cy="44" rx="15" ry="12.5" />
      <ellipse cx="14" cy="26" rx="6.5" ry="8.5" transform="rotate(-20 14 26)" />
      <ellipse cx="26" cy="15" rx="6.5" ry="9" transform="rotate(-6 26 15)" />
      <ellipse cx="39" cy="15" rx="6.5" ry="9" transform="rotate(6 39 15)" />
      <ellipse cx="51" cy="26" rx="6.5" ry="8.5" transform="rotate(20 51 26)" />
    </svg>
  );
}

const line = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" aria-hidden className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const founderIcons: Record<string, ReactNode> = {
  globe: line(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18M5 7.5h14M5 16.5h14" />
    </>,
  ),
  home: line(<path d="M3.5 11 12 4l8.5 7M6 9.5V20h4.5v-5.5h3V20H18V9.5" />),
  heart: line(<path d="M12 20c-4.5-3.6-8.5-7-8.5-11A4.5 4.5 0 0 1 12 6.5 4.5 4.5 0 0 1 20.5 9c0 4-4 7.4-8.5 11Z" />),
  people: line(
    <>
      <circle cx="6" cy="11" r="2.2" />
      <circle cx="12" cy="10" r="2.4" />
      <circle cx="18" cy="11" r="2.2" />
      <path d="M2.5 19c.4-2.5 1.8-4 3.5-4s2.6.8 3.1 1.8M8.5 19c.5-3 1.8-4.7 3.5-4.7s3 1.7 3.5 4.7M14.9 16.8c.5-1 1.4-1.8 3.1-1.8s3.1 1.5 3.5 4M12 6.2c-.9-1.3-2.6-1-2.6.4 0 1 1.4 1.9 2.6 2.7 1.2-.8 2.6-1.7 2.6-2.7 0-1.4-1.7-1.7-2.6-.4Z" />
    </>,
  ),
  cat: line(
    <>
      <path d="M4.5 9.5 4 3.5l5 3.2a9.5 9.5 0 0 1 6 0l5-3.2-.5 6c.7 1.2 1 2.4 1 3.8 0 4.4-4 7.2-8.5 7.2S3.5 17.7 3.5 13.3c0-1.4.3-2.6 1-3.8Z" />
      <path d="M9 12.5v.5M15 12.5v.5M10.5 15.5c.8.7 2.2.7 3 0M1.5 14h4M1.5 16.5l4-1M22.5 14h-4M22.5 16.5l-4-1" />
    </>,
  ),
};

/** Renders **phrase** as a pill highlight, like the marker strokes on the slides. */
export function Highlighted({ text, markClass }: { text: string; markClass: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith("**") ? (
          <mark key={i} className={`rounded-full px-1.5 py-0.5 font-bold [box-decoration-break:clone] ${part.length <= 18 ? "whitespace-nowrap" : ""} ${markClass}`}>
            {part.slice(2, -2)}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

"use client";

import { useState } from "react";

type Photo = { src: string; srcSet: string; alt: string; width?: number | null; height?: number | null };

export function Gallery({ photos, name }: { photos: Photo[]; name: string }) {
  const [index, setIndex] = useState(0);
  if (!photos.length) return <div className="aspect-[3/4] rounded-[var(--radius-card)] bg-line" />;
  const current = photos[Math.min(index, photos.length - 1)];
  return (
    <div>
      {/* Photos inside the cat page come in any shape: show each whole, never cropped.
          The frame hugs the photo (no side bars); very tall ones are capped by the screen height. */}
      <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-[var(--radius-card)] bg-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.src}
          src={current.src}
          srcSet={current.srcSet}
          sizes="(min-width: 1024px) 55vw, 100vw"
          width={current.width ?? undefined}
          height={current.height ?? undefined}
          alt={current.alt || name}
          className="block h-auto max-h-[80vh] w-auto max-w-full"
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((index - 1 + photos.length) % photos.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setIndex((index + 1) % photos.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white"
              aria-label="Next photo"
            >
              ›
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
              {index + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <li key={p.src} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={`block overflow-hidden rounded-[var(--radius-card)] ring-2 ${i === index ? "ring-brick" : "ring-transparent"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src.replace(".w1200.", ".w480.")} alt="" className="h-20 w-16 object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

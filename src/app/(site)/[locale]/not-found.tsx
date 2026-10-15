import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <div aria-hidden className="olive-dot relative mx-auto h-56 max-w-md overflow-hidden rounded-[var(--radius-card)]">
        <div className="absolute left-1/2 top-6 h-32 w-32 -translate-x-1/2 rounded-full bg-sun" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/cat-black.webp" alt="" className="absolute bottom-0 left-1/2 w-[110%] max-w-none -translate-x-1/2" />
      </div>
      <p className="mt-8 font-display text-7xl">404</p>
      <p className="mt-4 text-lg">Page not found · Страница не найдена · Stranica nije pronađena</p>
      <Link href="/" className="mt-6 inline-block rounded-[var(--radius-control)] bg-ink px-6 py-3 font-semibold text-milk">
        Whiskers Club
      </Link>
    </div>
  );
}

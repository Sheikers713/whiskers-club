import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <p className="font-display text-6xl font-bold">404</p>
      <p className="mt-4 text-lg">Page not found · Страница не найдена · Stranica nije pronađena</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-ink px-6 py-3 font-semibold text-milk">
        Whiskers Club
      </Link>
    </div>
  );
}

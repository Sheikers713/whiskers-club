export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/cat-mark.png" alt="" width={72} height={72} className="h-18 w-18" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/wordmark.webp" alt="Whiskers Club" width={160} height={80} className="h-20 w-auto" />
      </div>
      <div className="rounded-[var(--radius-card)] bg-paper p-6 ring-1 ring-line">{children}</div>
    </div>
  );
}

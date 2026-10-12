export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <p className="mb-6 text-center font-display text-2xl font-bold">Whiskers Club</p>
      <div className="rounded-2xl bg-paper p-6 ring-1 ring-line">{children}</div>
    </div>
  );
}

import Link from "next/link";
import type { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";
import { logout } from "@/lib/actions/auth";

const nav: Array<{ href: string; label: string; roles: Role[] }> = [
  { href: "/admin", label: "Главная", roles: ["EDITOR", "FINANCE"] },
  { href: "/admin/cats", label: "Коты", roles: ["EDITOR"] },
  { href: "/admin/applications", label: "Заявки", roles: ["EDITOR"] },
  { href: "/admin/donations", label: "Поступления", roles: ["FINANCE"] },
  { href: "/admin/expenses", label: "Расходы", roles: ["FINANCE"] },
  { href: "/admin/campaigns", label: "Сборы", roles: ["FINANCE"] },
  { href: "/admin/payment-methods", label: "Реквизиты", roles: ["FINANCE"] },
  { href: "/admin/users", label: "Пользователи", roles: ["SUPERADMIN"] },
  { href: "/admin/taxonomies", label: "Справочники", roles: ["SUPERADMIN"] },
  { href: "/admin/settings", label: "Настройки сайта", roles: ["SUPERADMIN"] },
  { href: "/admin/audit", label: "Журнал", roles: ["SUPERADMIN"] },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const items = nav.filter((n) => hasRole(user.roles, n.roles) || n.href === "/admin");
  const links = (
    <ul className="space-y-1">
      {items.map((n) => (
        <li key={n.href}>
          <Link href={n.href} className="block rounded-lg px-3 py-2 font-medium hover:bg-milk">
            {n.label}
          </Link>
        </li>
      ))}
      <li className="border-t border-line pt-2">
        <Link href="/admin/profile" className="block rounded-lg px-3 py-2 font-medium hover:bg-milk">
          Профиль · {user.name}
        </Link>
      </li>
      <li>
        <a href="/" target="_blank" className="block rounded-lg px-3 py-2 text-ink-soft hover:bg-milk">
          Открыть сайт ↗
        </a>
      </li>
      <li>
        <form action={logout}>
          <button className="w-full rounded-lg px-3 py-2 text-left text-ink-soft hover:bg-milk">Выйти</button>
        </form>
      </li>
    </ul>
  );
  return (
    <div className="md:flex">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-paper p-4 md:block md:min-h-screen">
        <Link href="/admin" className="mb-4 flex items-center gap-2.5 px-3 font-display text-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/cat-mark.png" alt="" width={36} height={36} className="h-9 w-9" />
          Whiskers Club
        </Link>
        <nav aria-label="Разделы">{links}</nav>
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper px-4 py-3 md:hidden">
        <Link href="/admin" className="flex items-center gap-2 font-display text-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/cat-mark.png" alt="" width={32} height={32} className="h-8 w-8" />
          Whiskers Club
        </Link>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-[var(--radius-control)] border border-ink/15 px-4 py-2 text-sm font-semibold">Меню</summary>
          <nav aria-label="Разделы" className="absolute right-0 mt-2 w-64 rounded-[var(--radius-card)] bg-paper p-3 shadow-lg ring-1 ring-line">
            {links}
          </nav>
        </details>
      </header>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}

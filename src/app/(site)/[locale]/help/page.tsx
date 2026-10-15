import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { PaymentMethods } from "@/components/site/PaymentMethods";

export async function generateMetadata({ params }: PageProps<"/[locale]/help">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).help.title };
}

export default async function HelpPage({ params }: PageProps<"/[locale]/help">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl uppercase md:text-6xl">{dict.help.title}</h1>
      <section id="donate" className="mt-8 scroll-mt-24">
        <h2 className="text-2xl font-bold">{dict.help.donateTitle}</h2>
        <p className="mt-2 max-w-3xl text-ink-soft">{dict.help.donateText}</p>
        <PaymentMethods locale={locale} dict={dict} />
      </section>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          { href: "volunteer", title: dict.help.volunteerTitle, text: dict.help.volunteerText },
          { href: "foster", title: dict.help.fosterTitle, text: dict.help.fosterText },
          { href: "partnership", title: dict.help.partnerTitle, text: dict.help.partnerText },
        ].map((c) => (
          <section key={c.href} className="flex flex-col rounded-[var(--radius-card)] bg-paper p-6 ring-1 ring-line">
            <h2 className="text-xl font-bold">{c.title}</h2>
            <p className="mt-2 flex-1 text-ink-soft">{c.text}</p>
            <Link href={`/${locale}/${c.href}`} className="mt-4 self-start rounded-[var(--radius-control)] bg-ink px-5 py-2.5 font-semibold text-milk hover:bg-brick">
              {dict.help.apply}
            </Link>
          </section>
        ))}
      </div>
    </div>
  );
}

import { NextResponse, type NextRequest } from "next/server";
import { isLocale, localeCookie, negotiateLocale } from "@/lib/i18n/config";

/**
 * Public pages live under /en, /ru and /sr. A path without a language is
 * redirected to the saved choice, or to the browser's language on the first
 * visit. Opening a language URL remembers that language.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];

  if (isLocale(first)) {
    // Lets the layout build language-switch links for the current page.
    const headers = new Headers(request.headers);
    headers.set("x-wc-path", pathname.slice(first.length + 1) + search);
    const res = NextResponse.next({ request: { headers } });
    if (request.cookies.get(localeCookie)?.value !== first) {
      res.cookies.set(localeCookie, first, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
    }
    return res;
  }

  const saved = request.cookies.get(localeCookie)?.value;
  const locale = isLocale(saved) ? saved : negotiateLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!admin|api|media|files|_next|favicon.ico|robots.txt|sitemap.xml|icon|apple-icon|.*\\.[a-z0-9]+$).*)"],
};

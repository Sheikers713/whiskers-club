/**
 * A server action call can throw instead of returning `{ error }`: the phone
 * lost the connection mid-upload (Wi-Fi without internet, switching to mobile
 * data), the browser could not read the picked file, the site was redeployed
 * while the page was open. Uncaught, that replaces the whole page with
 * «This page couldn't load» and the admin loses what they typed. Callers
 * catch it and show this message next to the form instead.
 *
 * Next's own control-flow errors (redirect, notFound) carry a `NEXT_` digest
 * and must be rethrown so they keep working.
 */
export function isNextControlFlow(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_");
}

export const ACTION_FAILED =
  "Не получилось отправить: связь прервалась или страница устарела. Проверьте интернет, обновите страницу и попробуйте ещё раз.";

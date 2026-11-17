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

/** The message shown next to the form, with the browser's reason in brackets for diagnosis. */
export function actionFailed(e: unknown): string {
  const reason = e instanceof Error ? e.message : String(e);
  return `Не получилось отправить. Проверьте интернет, обновите страницу и попробуйте ещё раз. (${reason.slice(0, 120)})`;
}

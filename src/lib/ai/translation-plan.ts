import type { LocalizedText } from "../i18n/localized";

/** Languages filled by machine translation; admins write in Russian. */
export const targetLocales = ["en", "sr"] as const;
export type TargetLocale = (typeof targetLocales)[number];

/** Key of one machine-translated value, e.g. `story.en`. */
export type AutoKey = `${string}.${TargetLocale}`;

export type TranslationPlan = {
  /** Russian source text per field that needs at least one fresh draft. */
  sources: Record<string, string>;
  /** Which languages of each field the fresh translation may write. */
  targets: Record<string, TargetLocale[]>;
  /** Machine-translated values that are still untouched by a human and stay marked. */
  keepAuto: AutoKey[];
};

/**
 * Decides which values to machine-translate when a cat is saved.
 *
 * A language of a field is (re)translated when the field has Russian text and
 * the value is empty, `force` is set, or the Russian text changed while the
 * value is still the untouched machine draft. Values an admin edited by hand
 * are kept (unless `force`) and lose their "auto" mark.
 */
export function planTranslations({
  submitted,
  before,
  beforeAuto,
  force = false,
}: {
  submitted: Record<string, LocalizedText>;
  before?: Record<string, LocalizedText> | null;
  beforeAuto?: string[];
  force?: boolean;
}): TranslationPlan {
  const autoBefore = new Set(beforeAuto ?? []);
  const plan: TranslationPlan = { sources: {}, targets: {}, keepAuto: [] };

  for (const [field, value] of Object.entries(submitted)) {
    const ru = value.ru;
    if (!ru) continue;
    const old = before?.[field] ?? {};
    const ruChanged = (old.ru ?? "") !== ru;
    for (const l of targetLocales) {
      const key: AutoKey = `${field}.${l}`;
      const current = value[l];
      const untouched = autoBefore.has(key) && current !== undefined && current === old[l];
      if (force || !current || (untouched && ruChanged)) {
        plan.sources[field] = ru;
        (plan.targets[field] ??= []).push(l);
      } else if (untouched) {
        plan.keepAuto.push(key);
      }
    }
  }
  return plan;
}

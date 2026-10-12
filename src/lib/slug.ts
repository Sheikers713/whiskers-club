const cyrillic: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "dj", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o",
  п: "p", р: "r", с: "s", т: "t", ћ: "c", у: "u", ф: "f", х: "h", ц: "c", ч: "ch",
  џ: "dz", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  č: "c", ć: "c", š: "s", ž: "z", đ: "dj",
};

/** Latin, lowercase, dash-separated slug that works for all three languages. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => cyrillic[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

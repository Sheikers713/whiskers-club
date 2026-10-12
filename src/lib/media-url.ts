export const PHOTO_WIDTHS = [480, 1200] as const;

export function photoUrl(storageKey: string, width: (typeof PHOTO_WIDTHS)[number] = 1200): string {
  return `/media/${storageKey}.w${width}.webp`;
}

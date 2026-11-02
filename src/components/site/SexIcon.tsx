/**
 * Venus / Mars mark for a cat's sex: pink for girls, blue for boys.
 * Drawn as SVG rather than ♀/♂ text so iOS doesn't swap in a colour emoji.
 * The word ("девочка" / "мальчик") stays available to screen readers and as a tooltip.
 */
export function SexIcon({ sex, label, className = "h-[1.15em] w-[1.15em]" }: { sex: "FEMALE" | "MALE"; label: string; className?: string }) {
  const female = sex === "FEMALE";
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 align-[-0.2em] ${female ? "text-sex-female" : "text-sex-male"} ${className}`}
    >
      <title>{label}</title>
      {female ? (
        <>
          <circle cx="12" cy="9" r="6" />
          <path d="M12 15v7M8.5 18.5h7" />
        </>
      ) : (
        <>
          <circle cx="10" cy="14" r="6" />
          <path d="M14.3 9.7 20 4M14.5 4H20v5.5" />
        </>
      )}
    </svg>
  );
}

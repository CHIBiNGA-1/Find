/**
 * The f!nd wordmark. The "!" stands in for the "i": it rises to the same height as the ascenders of
 * "f" and "d", so the word reads as one shape, and it carries the accent colour as the only flourish.
 * Live text (no image) keeps it crisp at any size; screen readers hear the word "find".
 */
export function Wordmark({ className = "", accent = "text-accent" }: { className?: string; accent?: string }) {
  return (
    <span role="img" aria-label="find" className={`inline-block font-sans font-semibold tracking-tight ${className}`}>
      <span aria-hidden="true">
        f<span className={accent}>!</span>nd
      </span>
    </span>
  );
}

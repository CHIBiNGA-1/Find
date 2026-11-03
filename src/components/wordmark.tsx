/**
 * The f!nd wordmark. The "!" is a highlighter mark: a yellow block with ink inside, so it reads
 * on white and on cobalt alike. Live text, so it stays crisp at any size; screen readers hear "find".
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span role="img" aria-label="find" className={`inline-flex items-baseline font-extrabold leading-none tracking-[-0.035em] ${className}`} style={{ fontStretch: "80%" }}>
      <span aria-hidden="true" className="inline-flex items-baseline">
        f<span className="mx-[0.03em] rounded-[0.16em] bg-hl px-[0.09em] text-ink">!</span>nd
      </span>
    </span>
  );
}

/** The original live-text f!nd mark, with the exclamation in honey accent. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span role="img" aria-label="find" className={`inline-block font-sans font-semibold tracking-tight ${className}`}>
      <span aria-hidden="true">
        f<span className="text-accent">!</span>nd
      </span>
    </span>
  );
}

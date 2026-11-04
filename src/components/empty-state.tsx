import Link from "next/link";

/** An empty screen is an invitation to act: say what is missing and offer the one next step. */
export function EmptyState({ title, hint, href, action }: { title: string; hint?: string; href?: string; action?: string }) {
  return (
    <div className="border-y border-line py-12 text-center">
      <p className="text-[1.25rem] font-bold [font-stretch:85%]">{title}</p>
      {hint && <p className="t-meta mx-auto mt-1 max-w-sm">{hint}</p>}
      {href && action && <Link href={href} className="btn btn-primary mt-5">{action}</Link>}
    </div>
  );
}

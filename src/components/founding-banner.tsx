import Link from "next/link";
import { getContext } from "@/lib/session";
import { daysLeft, progressPercent } from "@/lib/founding";

/** Shown to every member while their university is still in its founding period. Honest numbers, no pressure copy. */
export async function FoundingBanner() {
  const { supabase, universityId, universityName, isModerator } = await getContext();
  const { data } = await supabase.rpc("university_progress", { p_uni: universityId });
  const p = ((data ?? []) as { status: string; members: number; target: number; ends_at: string }[])[0];
  if (!p || p.status !== "probation") return null;
  const left = daysLeft(p.ends_at), pct = progressPercent(p.members, p.target);
  return (
    <section aria-label="Founding period" className="rounded-[var(--radius-lg)] bg-[var(--color-mint,#ecf0e8)] p-5">
      <p className="t-section">{universityName} is just getting started</p>
      <p className="t-meta mt-1">{p.members} of {p.target} verified students · {left} {left === 1 ? "day" : "days"} left. At {p.target} the university is here to stay.</p>
      <div role="progressbar" aria-label="Verified students" aria-valuemin={0} aria-valuemax={p.target} aria-valuenow={Math.min(p.members, p.target)} className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-[0.9rem]">{isModerator ? <>Share f!nd with classmates, then approve them in <Link href="/admin" className="link font-medium">Moderation</Link>.</> : "Bring a classmate along."}</p>
    </section>
  );
}

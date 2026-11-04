import Link from "next/link";
import { getContext } from "@/lib/session";
import { signedUrls } from "@/lib/listings/queries";
import { EmptyState } from "@/components/empty-state";
import { timeAgo, formatCalendarDate } from "@/lib/time";

export const metadata = { title: "Lost and found" };

export default async function LostFound({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const { supabase, universityId } = await getContext();
  let q = supabase.from("lost_found_reports").select("id, kind, title, area, occurred_on, status, image_path, created_at")
    .eq("university_id", universityId).in("status", ["open", "resolved"]).order("created_at", { ascending: false }).limit(60);
  if (kind === "lost" || kind === "found") q = q.eq("kind", kind);
  const { data, error } = await q;
  const urls = await signedUrls((data ?? []).flatMap((d) => (d.image_path ? [d.image_path] : [])), "lostfound-images");
  const open = data?.filter((d) => d.status === "open") ?? [], done = data?.filter((d) => d.status === "resolved") ?? [];
  const tab = (k: string | undefined, label: string) => <Link href={k ? `/lost-found?kind=${k}` : "/lost-found"} className="chip" aria-current={kind === k || (!kind && !k) ? "true" : undefined}>{label}</Link>;
  const row = (d: NonNullable<typeof data>[number], dim = false) => (
    <li key={d.id}><Link href={`/lost-found/${d.id}`} className={`flex items-center gap-4 py-3.5 hover:bg-sunken active:bg-sunken sm:px-3 ${dim ? "opacity-70" : ""}`}>
      <span className="size-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-sunken">{ }{d.image_path && urls.get(d.image_path) && <img src={urls.get(d.image_path) ?? undefined} alt="" className="size-full object-cover" />}</span>
      <span className="min-w-0 flex-1"><span className={`tag mb-1 ${d.kind === "lost" ? "tag-ink" : ""}`}>{d.kind === "lost" ? "Lost" : "Found"}</span>
        <span className="block truncate text-[1.0625rem] font-semibold">{d.title}</span>
        <span className="t-meta block">{d.area}, {dim ? formatCalendarDate(d.occurred_on) : timeAgo(d.created_at)}</span></span>
    </Link></li>);
  return (
    <main className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="t-page">Lost and found</h1>
        <Link href="/lost-found/new" className="btn btn-primary">Report an item</Link>
      </div>
      <nav aria-label="Filter" className="mt-6 flex gap-2">{tab(undefined, "All")}{tab("lost", "Lost")}{tab("found", "Found")}</nav>
      {error && <p role="alert" className="mt-6 font-medium text-danger">Reports couldn&rsquo;t load. Try again in a moment.</p>}
      {!error && !open.length && <div className="mt-8"><EmptyState title="Nothing reported right now." href="/lost-found/new" action="Report an item" /></div>}
      <ul className="rows mt-6">{open.map((d) => row(d))}</ul>
      {done.length > 0 && <><h2 className="mb-2 mt-12 text-[1.5rem]">Resolved</h2><ul className="rows">{done.map((d) => row(d, true))}</ul></>}
    </main>
  );
}

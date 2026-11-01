import Link from "next/link";
import { getContext } from "@/lib/session";
import { signedUrls } from "@/lib/listings/queries";

export const metadata = { title: "Lost and found" };

export default async function LostFound({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const { supabase, universityId } = await getContext();
  let q = supabase.from("lost_found_reports").select("id, kind, title, area, occurred_on, status, image_path")
    .eq("university_id", universityId).in("status", ["open", "resolved"]).order("created_at", { ascending: false }).limit(60);
  if (kind === "lost" || kind === "found") q = q.eq("kind", kind);
  const { data, error } = await q;
  const urls = await signedUrls((data ?? []).flatMap((d) => (d.image_path ? [d.image_path] : [])), "lostfound-images");
  const open = data?.filter((d) => d.status === "open") ?? [], done = data?.filter((d) => d.status === "resolved") ?? [];
  const tab = (k: string | undefined, label: string) => <Link href={k ? `/lost-found?kind=${k}` : "/lost-found"} aria-current={kind === k || (!kind && !k) ? "page" : undefined} className={`min-h-11 inline-flex items-center rounded-[var(--radius-md)] border border-line px-4 ${kind === k || (!kind && !k) ? "bg-surface font-semibold" : ""}`}>{label}</Link>;
  const row = (d: NonNullable<typeof data>[number]) => (
    <li key={d.id}><Link href={`/lost-found/${d.id}`} className="flex gap-3 p-3">
      <div className="size-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-bg">{/* eslint-disable-next-line @next/next/no-img-element */}{d.image_path && urls.get(d.image_path) && <img src={urls.get(d.image_path) ?? undefined} alt="" className="size-full object-cover" />}</div>
      <span><span className="font-medium">{d.kind === "lost" ? "Lost: " : "Found: "}{d.title}</span><span className="block text-sm text-muted">{d.area} · {new Date(d.occurred_on).toLocaleDateString()}</span></span></Link></li>);
  return (
    <main>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-serif text-3xl tracking-tight">Lost and found</h1>
        <Link href="/lost-found/new" className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-brand px-4 font-medium text-white">Report an item</Link></div>
      <nav aria-label="Filter" className="mt-4 flex gap-2">{tab(undefined, "All")}{tab("lost", "Lost")}{tab("found", "Found")}</nav>
      {error && <p role="alert" className="mt-6 text-danger">Reports couldn't load. Try again in a moment.</p>}
      {!error && !open.length && <p className="mt-8 text-muted">Nothing reported right now.</p>}
      <ul className="mt-6 divide-y divide-line rounded-[var(--radius-md)] border border-line bg-surface">{open.map(row)}</ul>
      {done.length > 0 && <><h2 className="mb-2 mt-10 font-semibold text-muted">Resolved</h2><ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line bg-surface opacity-75">{done.map(row)}</ul></>}
    </main>
  );
}

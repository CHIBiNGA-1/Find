import Link from "next/link";
import { getContext } from "@/lib/session";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import { Icon } from "@/components/icons";

export const metadata = { title: "Requests" };

export default async function Requests({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase, universityId } = await getContext();
  let query = supabase.from("requests").select("id, title, budget_minor, currency_code, expires_at, created_at")
    .eq("university_id", universityId).eq("status", "open").gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(50);
  if (q) query = query.ilike("title", `%${q.replace(/[%_\\]/g, "\\$&")}%`);
  const { data, error } = await query;
  return (
    <main className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="t-page">Requests</h1><p className="t-meta mt-2">Students asking for something. Answer one, or post your own.</p></div>
        <Link href="/requests/new" className="btn btn-primary">Post a request</Link>
      </div>
      <form role="search" className="mt-6 flex gap-2">
        <label className="relative flex-1"><span className="sr-only">Search requests</span>
          <Icon name="search" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Search requests" className="field !pl-12" /></label>
        <button className="btn btn-quiet">Search</button>
      </form>
      {error && <p role="alert" className="mt-6 font-medium text-danger">Requests couldn&rsquo;t load. Try again in a moment.</p>}
      {!error && !data?.length && (
        <div className="mt-8 rounded-[var(--radius-lg)] bg-sunken p-8 text-center">
          <p className="text-[1.5rem] font-bold [font-stretch:88%]">No open requests{q ? " match that search" : " yet"}.</p>
          {q ? <Link className="link mt-2 inline-block" href="/requests">Clear search</Link> : <Link href="/requests/new" className="btn btn-primary mt-5">Ask for something you need</Link>}
        </div>)}
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {data?.map((r) => (
          <li key={r.id}><Link href={`/requests/${r.id}`} className="flex items-center justify-between gap-4 py-4 hover:bg-sunken active:bg-sunken sm:px-3">
            <span className="min-w-0"><span className="block truncate text-[1.0625rem] font-semibold">{r.title}</span>
              <span className="t-meta block">Posted {timeAgo(r.created_at)}, open until {new Date(r.expires_at).toLocaleDateString()}</span></span>
            {r.budget_minor != null && <span className="pricetag shrink-0">{formatMoney(r.budget_minor, r.currency_code)}</span>}
          </Link></li>))}
      </ul>
    </main>
  );
}

import Link from "next/link";
import { getContext } from "@/lib/session";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Requests" };

export default async function Requests({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase, universityId } = await getContext();
  let query = supabase.from("requests").select("id, title, budget_minor, currency_code, expires_at")
    .eq("university_id", universityId).eq("status", "open").gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(50);
  if (q) query = query.ilike("title", `%${q.replace(/[%_\\]/g, "\\$&")}%`);
  const { data, error } = await query;
  return (
    <main>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-serif text-3xl tracking-tight">Requests</h1>
        <Link href="/requests/new" className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-brand px-4 font-medium text-white">Post a request</Link></div>
      <form role="search" className="mt-4 flex max-w-xl gap-2"><input name="q" defaultValue={q} aria-label="Search requests" placeholder="Search requests" className="min-h-11 flex-1 rounded-[var(--radius-md)] border border-line bg-surface px-3" /><button className="min-h-11 rounded-[var(--radius-md)] border border-line bg-surface px-4">Search</button></form>
      {error && <p role="alert" className="mt-6 text-danger">Requests couldn't load. Try again in a moment.</p>}
      {!error && !data?.length && <p className="mt-8 text-muted">No open requests{q ? " match that search" : " yet"}. {q ? <Link className="text-brand underline" href="/requests">Clear search</Link> : "Ask for something you need."}</p>}
      <ul className="mt-6 divide-y divide-line rounded-[var(--radius-md)] border border-line bg-surface">
        {data?.map((r) => <li key={r.id}><Link href={`/requests/${r.id}`} className="block p-3"><span className="font-medium">{r.title}</span>
          <span className="block text-sm text-muted">{r.budget_minor != null ? `Budget ${formatMoney(r.budget_minor, r.currency_code)} · ` : ""}Open until {new Date(r.expires_at).toLocaleDateString()}</span></Link></li>)}
      </ul>
    </main>
  );
}

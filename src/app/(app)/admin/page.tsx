import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/session";
import { moderateReport, reviewMembership } from "./actions";

export const metadata = { title: "Moderation" };
const HREF: Record<string, (id: string) => string | null> = {
  listing: (id) => `/listing/${id}`, request: (id) => `/requests/${id}`, lost_found: (id) => `/lost-found/${id}`, user: (id) => `/profile/${id}`, review: () => null, message: () => null,
};

export default async function Admin() {
  const { supabase } = await getContext();
  const { data: me } = await supabase.from("university_memberships").select("university_id").eq("status", "verified").in("role", ["moderator", "admin"]).limit(1).maybeSingle();
  if (!me) notFound();                        // UI gate only; every action re-checks inside the database
  type PendingRow = { id: string; display_name: string; university_name: string; created_at: string };
  const [{ data: reports }, { data: pendingRaw }, { data: log }] = await Promise.all([
    supabase.from("reports").select("id, target_type, target_id, reason, details, snapshot, status, created_at").eq("status", "open").order("created_at").limit(50),
    supabase.rpc("pending_memberships"),
    supabase.from("moderation_actions").select("id, action, target_type, note, created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  const pending = pendingRaw as PendingRow[] | null;
  const btn = "min-h-9 rounded-[var(--radius-sm)] border border-line px-3 text-sm";
  return (
    <main>
      <h1 className="font-serif text-3xl tracking-tight">Moderation</h1>
      <section className="mt-8"><h2 className="font-semibold">Membership requests ({pending?.length ?? 0})</h2>
        <ul className="mt-2 divide-y divide-line rounded-[var(--radius-md)] border border-line bg-surface">
          {pending?.map((m) => <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3"><span>{m.display_name} <span className="text-sm text-muted">· {m.university_name}</span></span>
            <span className="flex gap-2"><form action={reviewMembership.bind(null, m.id, "verified")}><button className={btn}>Verify</button></form><form action={reviewMembership.bind(null, m.id, "rejected")}><button className={btn}>Reject</button></form></span></li>)}
          {!pending?.length && <li className="p-3 text-sm text-muted">No pending requests.</li>}
        </ul></section>
      <section className="mt-8"><h2 className="font-semibold">Open reports ({reports?.length ?? 0})</h2>
        <ul className="mt-2 space-y-3">
          {reports?.map((r) => { const href = HREF[r.target_type]?.(r.target_id); return (
            <li key={r.id} className="rounded-[var(--radius-md)] border border-line bg-surface p-3">
              <p className="text-sm"><span className="font-semibold">{r.target_type.replace("_", " ")}</span> · {r.reason} · {new Date(r.created_at).toLocaleDateString()}{href && <> · <Link className="underline" href={href}>View</Link></>}</p>
              {r.details && <p className="mt-1">{r.details}</p>}
              {r.snapshot && <p className="mt-1 rounded bg-bg p-2 text-sm">Reported message: {r.snapshot}</p>}
              <form className="mt-2 flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor={`n-${r.id}`}>Note</label><input id={`n-${r.id}`} name="note" placeholder="Note (optional)" className="min-h-9 flex-1 rounded-[var(--radius-sm)] border border-line px-2 text-sm" />
                <button formAction={moderateReport.bind(null, r.id, "dismiss")} className={btn}>Dismiss</button>
                {!["message", "user"].includes(r.target_type) && <button formAction={moderateReport.bind(null, r.id, "remove_content")} className={btn}>{r.target_type === "review" ? "Hide review" : "Remove"}</button>}
                {r.target_type === "user" && <button formAction={moderateReport.bind(null, r.id, "suspend_user")} className={btn}>Suspend member</button>}</form>
            </li>); })}
          {!reports?.length && <li className="text-sm text-muted">No open reports.</li>}
        </ul></section>
      <section className="mt-8"><h2 className="font-semibold">Recent decisions</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted">{log?.map((a) => <li key={a.id}>{new Date(a.created_at).toLocaleString()} · {a.action} · {a.target_type}{a.note ? ` · ${a.note}` : ""}</li>)}</ul></section>
    </main>
  );
}

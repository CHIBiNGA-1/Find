import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/session";
import { formatDate, formatTime } from "@/lib/time";
import { moderateReport, reviewMembership } from "./actions";

export const metadata = { title: "Moderation" };
const HREF: Record<string, (id: string) => string | null> = {
  listing: (id) => `/listing/${id}`, request: (id) => `/requests/${id}`, lost_found: (id) => `/lost-found/${id}`, user: (id) => `/profile/${id}`, review: () => null, message: () => null,
};

export default async function Admin() {
  const { supabase, timezone } = await getContext();
  const { data: me } = await supabase.from("university_memberships").select("university_id").eq("status", "verified").in("role", ["moderator", "admin"]).limit(1).maybeSingle();
  if (!me) notFound();                        // UI gate only; every action re-checks inside the database
  type PendingRow = { id: string; display_name: string; university_name: string; created_at: string };
  const [{ data: reports }, { data: pendingRaw }, { data: log }] = await Promise.all([
    supabase.from("reports").select("id, target_type, target_id, reason, details, snapshot, status, created_at").eq("status", "open").order("created_at").limit(50),
    supabase.rpc("pending_memberships"),
    supabase.from("moderation_actions").select("id, action, target_type, note, created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  const pending = pendingRaw as PendingRow[] | null;
  const btn = "btn btn-quiet btn-sm";
  return (
    <main>
      <h1 className="t-page">Moderation</h1>
      <section className="mt-8"><h2 className="text-[1.5rem]">Membership requests ({pending?.length ?? 0})</h2>
        <ul className="mt-2 rows">
          {pending?.map((m) => <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3"><span className="font-semibold">{m.display_name} <span className="t-meta font-normal">{m.university_name}</span></span>
            <span className="flex gap-2"><form action={reviewMembership.bind(null, m.id, "verified")}><button className={btn}>Verify</button></form><form action={reviewMembership.bind(null, m.id, "rejected")}><button className={btn}>Reject</button></form></span></li>)}
          {!pending?.length && <li className="p-3 text-sm text-muted">No pending requests.</li>}
        </ul></section>
      <section className="mt-8"><h2 className="text-[1.5rem]">Open reports ({reports?.length ?? 0})</h2>
        <ul className="rows mt-2">
          {reports?.map((r) => { const href = HREF[r.target_type]?.(r.target_id); return (
            <li key={r.id} className="border-b border-line py-4">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"><span className="tag">{r.target_type.replace("_", " ")}</span><span className="font-semibold">{r.reason}</span><span className="text-muted">{new Date(r.created_at).toLocaleDateString()}</span>{href && <Link className="link font-semibold" href={href}>View</Link>}</p>
              {r.details && <p className="mt-1">{r.details}</p>}
              {r.snapshot && <p className="note mt-2 !text-sm">Reported message: {r.snapshot}</p>}
              <form className="mt-2 flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor={`n-${r.id}`}>Note</label><input id={`n-${r.id}`} name="note" placeholder="Note (optional)" className="field !min-h-9 flex-1 !text-sm" />
                <button formAction={moderateReport.bind(null, r.id, "dismiss")} className={btn}>Dismiss</button>
                {!["message", "user"].includes(r.target_type) && <button formAction={moderateReport.bind(null, r.id, "remove_content")} className={btn}>{r.target_type === "review" ? "Hide review" : "Remove"}</button>}
                {r.target_type === "user" && <button formAction={moderateReport.bind(null, r.id, "suspend_user")} className={btn}>Suspend member</button>}</form>
            </li>); })}
          {!reports?.length && <li className="text-sm text-muted">No open reports.</li>}
        </ul></section>
      <section className="mt-8"><h2 className="text-[1.5rem]">Recent decisions</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted">{log?.map((a) => <li key={a.id}>{formatDate(a.created_at, timezone, true) + " " + formatTime(a.created_at, timezone)}: {a.action}, {a.target_type}{a.note ? `: ${a.note}` : ""}</li>)}</ul></section>
    </main>
  );
}

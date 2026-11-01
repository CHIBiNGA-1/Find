import { notFound } from "next/navigation";
import { getContext } from "@/lib/session";
import { formatMoney } from "@/lib/money";
import { ReportDialog } from "@/components/report-dialog";
import { setRequestStatus, startTopicConversation } from "../../campus-actions";

export default async function RequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ contact?: string }> }) {
  const { id } = await params; const { contact } = await searchParams;
  const { supabase, userId } = await getContext();
  const { data: r } = await supabase.from("requests").select("*, profiles(display_name)").eq("id", id).maybeSingle();
  if (!r) notFound();
  const mine = r.author_id === userId;
  const expired = new Date(r.expires_at) <= new Date();
  const active = r.status === "open" && !expired;
  const btn = "min-h-11 rounded-[var(--radius-md)] border border-line bg-surface px-4";
  return (
    <main className="max-w-xl">
      {!active && <p role="status" className="mb-3 rounded-[var(--radius-md)] border border-line bg-surface p-3 text-sm">{r.status === "fulfilled" ? "This request has been fulfilled." : r.status === "closed" ? "This request is closed." : "This request has expired."}</p>}
      <h1 className="font-serif text-3xl tracking-tight">{r.title}</h1>
      <p className="mt-1 text-sm text-muted">Asked by {(r.profiles as { display_name: string } | null)?.display_name ?? "a student"}{r.budget_minor != null && ` · Budget ${formatMoney(r.budget_minor, r.currency_code)}`} · {active ? `Open until ${new Date(r.expires_at).toLocaleDateString()}` : "Not active"}</p>
      <p className="mt-5 whitespace-pre-line">{r.description}</p>
      {contact === "failed" && <p role="alert" className="mt-3 text-sm text-danger">We couldn't start that conversation. The request may no longer be open.</p>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!mine && active && <form action={startTopicConversation.bind(null, "request", id)}><button className="min-h-11 rounded-[var(--radius-md)] bg-brand px-5 font-medium text-white">I can help</button></form>}
        {mine && r.status === "open" && <><form action={setRequestStatus.bind(null, id, "fulfilled")}><button className={btn}>Mark fulfilled</button></form><form action={setRequestStatus.bind(null, id, "closed")}><button className={btn}>Close request</button></form></>}
        {!mine && <ReportDialog type="request" targetId={id} label="Report request" />}
      </div>
    </main>
  );
}

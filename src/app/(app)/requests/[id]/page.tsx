import { notFound } from "next/navigation";
import { getContext } from "@/lib/session";
import { formatDate } from "@/lib/time";
import { formatMoney } from "@/lib/money";
import { ReportDialog } from "@/components/report-dialog";
import { setRequestStatus, startTopicConversation } from "../../campus-actions";

export default async function RequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ contact?: string }> }) {
  const { id } = await params; const { contact } = await searchParams;
  const { supabase, userId, timezone } = await getContext();
  const { data: r } = await supabase.from("requests").select("*, profiles(display_name)").eq("id", id).maybeSingle();
  if (!r) notFound();
  const mine = r.author_id === userId;
  const expired = new Date(r.expires_at) <= new Date();
  const active = r.status === "open" && !expired;
  const asker = (r.profiles as { display_name: string } | null)?.display_name ?? "a student";
  return (
    <main className="mx-auto max-w-2xl">
      {!active && <p role="status" className="note mb-5">{r.status === "fulfilled" ? "This request has been fulfilled." : r.status === "closed" ? "This request is closed." : "This request has expired."}</p>}
      <h1 className="t-page">{r.title}</h1>
      {r.budget_minor != null && <p className="mt-5"><span className="pricetag pricetag-lg">{formatMoney(r.budget_minor, r.currency_code)}</span><span className="t-meta ml-3">budget</span></p>}
      <p className="t-meta mt-4">Asked by {asker}. {active ? `Open until ${formatDate(r.expires_at, timezone)}.` : "Not active."}</p>
      <p className="mt-6 max-w-prose whitespace-pre-line text-[1.0625rem] leading-relaxed">{r.description}</p>
      {contact === "failed" && <p role="alert" className="mt-4 text-sm font-medium text-danger">We couldn&rsquo;t start that conversation. The request may no longer be open.</p>}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        {!mine && active && <form action={startTopicConversation.bind(null, "request", id)}><button className="btn btn-primary">I can help</button></form>}
        {mine && r.status === "open" && <><form action={setRequestStatus.bind(null, id, "fulfilled")}><button className="btn btn-quiet">Mark fulfilled</button></form><form action={setRequestStatus.bind(null, id, "closed")}><button className="btn btn-quiet">Close request</button></form></>}
        {!mine && <ReportDialog type="request" targetId={id} label="Report request" />}
      </div>
    </main>
  );
}

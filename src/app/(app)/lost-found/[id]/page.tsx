import { notFound } from "next/navigation";
import { getContext } from "@/lib/session";
import { signedUrls } from "@/lib/listings/queries";
import { ReportDialog } from "@/components/report-dialog";
import { resolveLostFound, startTopicConversation } from "../../campus-actions";

export default async function LostFoundPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ contact?: string }> }) {
  const { id } = await params; const { contact } = await searchParams;
  const { supabase, userId } = await getContext();
  const { data: r } = await supabase.from("lost_found_reports").select("*").eq("id", id).maybeSingle();
  if (!r || r.status === "removed") notFound();
  const url = r.image_path ? (await signedUrls([r.image_path], "lostfound-images")).get(r.image_path) : undefined;
  const mine = r.reporter_id === userId, open = r.status === "open";
  return (
    <main className="max-w-xl">
      {!open && <p role="status" className="mb-3 rounded-[var(--radius-md)] border border-line bg-surface p-3 text-sm">This report is resolved.</p>}
      <h1 className="font-serif text-3xl tracking-tight">{r.kind === "lost" ? "Lost: " : "Found: "}{r.title}</h1>
      <p className="mt-1 text-sm text-muted">{r.area} · {new Date(r.occurred_on).toLocaleDateString()}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt={r.title} className="mt-4 max-h-80 rounded-[var(--radius-md)] border border-line" />}
      <p className="mt-5 whitespace-pre-line">{r.description}</p>
      <p className="mt-4 text-sm text-muted">{r.kind === "found" ? "If this is yours, message the finder and describe something only the owner would know. " : ""}Meet in a public place on campus.</p>
      {contact === "failed" && <p role="alert" className="mt-3 text-sm text-danger">We couldn't start that conversation. This report may be resolved.</p>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!mine && open && <form action={startTopicConversation.bind(null, "lost_found", id)}><button className="min-h-11 rounded-[var(--radius-md)] bg-brand px-5 font-medium text-white">{r.kind === "found" ? "This is mine" : "I found this"}</button></form>}
        {mine && open && <form action={resolveLostFound.bind(null, id)}><button className="min-h-11 rounded-[var(--radius-md)] border border-line bg-surface px-4">Mark resolved</button></form>}
        {!mine && <ReportDialog type="lost_found" targetId={id} label="Report this entry" />}
      </div>
    </main>
  );
}

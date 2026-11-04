import { notFound } from "next/navigation";
import { getContext } from "@/lib/session";
import { formatCalendarDate } from "@/lib/time";
import { signedUrls } from "@/lib/listings/queries";
import { ReportDialog } from "@/components/report-dialog";
import { Icon } from "@/components/icons";
import { resolveLostFound, startTopicConversation } from "../../campus-actions";

export default async function LostFoundPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ contact?: string }> }) {
  const { id } = await params; const { contact } = await searchParams;
  const { supabase, userId } = await getContext();
  const { data: r } = await supabase.from("lost_found_reports").select("*").eq("id", id).maybeSingle();
  if (!r || r.status === "removed") notFound();
  const url = r.image_path ? (await signedUrls([r.image_path], "lostfound-images")).get(r.image_path) : undefined;
  const mine = r.reporter_id === userId, open = r.status === "open";
  return (
    <main className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2 md:gap-12">
      { }
      {url ? <img src={url} alt={r.title} className="aspect-[4/5] w-full rounded-[var(--radius-lg)] bg-sunken object-cover" /> : <div className="t-meta hidden aspect-[4/5] place-items-center rounded-[var(--radius-lg)] bg-sunken md:grid">No photo</div>}
      <div>
        {!open && <p role="status" className="note mb-5">This report is resolved.</p>}
        <span className={`tag ${r.kind === "lost" ? "tag-ink" : ""}`}>{r.kind === "lost" ? "Lost" : "Found"}</span>
        <h1 className="t-page mt-3">{r.title}</h1>
        <p className="t-meta mt-3 flex items-center gap-1.5"><Icon name="pin" size={16} />{r.area}, {formatCalendarDate(r.occurred_on)}</p>
        <p className="mt-6 whitespace-pre-line text-[1.0625rem] leading-relaxed">{r.description}</p>
        <p className="note mt-6">{r.kind === "found" ? "If this is yours, message the finder and describe something only the owner would know. " : ""}Meet in a public place on campus.</p>
        {contact === "failed" && <p role="alert" className="mt-4 text-sm font-medium text-danger">We couldn&rsquo;t start that conversation. This report may be resolved.</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!mine && open && <form action={startTopicConversation.bind(null, "lost_found", id)}><button className="btn btn-primary">{r.kind === "found" ? "This is mine" : "I found this"}</button></form>}
          {mine && open && <form action={resolveLostFound.bind(null, id)}><button className="btn btn-quiet">Mark resolved</button></form>}
          {!mine && <ReportDialog type="lost_found" targetId={id} label="Report this entry" />}
        </div>
      </div>
    </main>
  );
}

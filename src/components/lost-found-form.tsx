"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compress } from "@/lib/image";
import { createLostFound, type CampusState } from "@/app/(app)/campus-actions";

const f = "mt-1 block w-full min-h-11 rounded-[var(--radius-md)] border border-line bg-surface px-3 text-base aria-[invalid=true]:border-danger";

export function LostFoundForm({ userId }: { userId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [photo, setPhoto] = useState<{ path: string; preview: string } | null>(null);
  const [photoState, setPhotoState] = useState<"" | "uploading" | "error">("");
  const [state, setState] = useState<CampusState>({});
  const [pending, start] = useTransition();
  const err = (k: string) => state.fieldErrors?.[k]?.[0];

  async function pick(file?: File) {
    if (!file) return;
    setPhotoState("uploading");
    try {
      const { blob } = await compress(file);
      const path = `${userId}/${crypto.randomUUID()}.webp`;
      const { error } = await createClient().storage.from("lostfound-images").upload(path, blob, { contentType: "image/webp" });
      if (error) throw error;
      setPhoto({ path, preview: URL.createObjectURL(blob) }); setPhotoState("");
    } catch { setPhotoState("error"); }       // form values stay; the user can retry or continue without a photo
  }
  return (
    <form ref={ref} noValidate className="max-w-xl space-y-5" onSubmit={(e) => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(ref.current!)) as Record<string, string>;
      start(async () => { const r = await createLostFound({ ...v, imagePath: photo?.path ?? null }); if (r.id) router.push(`/lost-found/${r.id}`); else setState(r); });
    }}>
      <fieldset><legend className="text-sm font-medium">This item was</legend>
        <div className="mt-1 flex gap-4">{(["lost", "found"] as const).map((k) => <label key={k} className="flex min-h-11 items-center gap-2"><input type="radio" name="kind" value={k} defaultChecked={k === "lost"} />{k === "lost" ? "Lost" : "Found"}</label>)}</div></fieldset>
      <label className="block text-sm font-medium">Item
        <input name="title" className={f} aria-invalid={!!err("title")} /><span className="text-danger">{err("title")}</span></label>
      <label className="block text-sm font-medium">Description
        <textarea name="description" rows={4} className={f} aria-describedby="lf-hint" /><span className="text-danger">{err("description")}</span></label>
      <p id="lf-hint" className="-mt-3 text-xs text-muted">Describe colour, brand and marks. Leave out ID, student, bank or document numbers; the person who owns it can prove it's theirs.</p>
      <label className="block text-sm font-medium">Campus area
        <input name="area" placeholder="e.g. Library, main entrance" className={f} aria-invalid={!!err("area")} /><span className="text-danger">{err("area")}</span></label>
      <label className="block text-sm font-medium">Date
        <input name="occurredOn" type="date" max={new Date().toISOString().slice(0, 10)} className={f} aria-invalid={!!err("occurredOn")} /><span className="text-danger">{err("occurredOn")}</span></label>
      <div>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-md)] border border-line bg-surface px-4 text-sm font-medium">{photo ? "Change photo" : "Add a photo (optional)"}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} /></label>
        <span role="status" className="ml-3 text-sm">{photoState === "uploading" ? "Uploading…" : photoState === "error" ? "Photo failed. Try again, or continue without it." : ""}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo && <img src={photo.preview} alt="Chosen item" className="mt-2 max-h-40 rounded-[var(--radius-md)]" />}
      </div>
      {state.message && <p role="alert" className="text-sm text-danger">{state.message}</p>}
      <button disabled={pending || photoState === "uploading"} className="min-h-11 rounded-[var(--radius-md)] bg-brand px-5 font-medium text-white disabled:opacity-60">{pending ? "Saving…" : "Post report"}</button>
    </form>
  );
}

"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compress } from "@/lib/image";
import { createLostFound, type CampusState } from "@/app/(app)/campus-actions";

const f = "field mt-1";

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
      <fieldset><legend className="label">This item was</legend>
        <div className="mt-2 flex gap-3">{(["lost", "found"] as const).map((k) => <label key={k} className="pick"><input type="radio" name="kind" value={k} defaultChecked={k === "lost"} className="sr-only" />{k === "lost" ? "Lost" : "Found"}</label>)}</div></fieldset>
      <label className="label">Item
        <input name="title" className={f} aria-invalid={!!err("title")} /><span className="err">{err("title")}</span></label>
      <label className="label">Description
        <textarea name="description" rows={4} className={f} aria-describedby="lf-hint" /><span className="err">{err("description")}</span></label>
      <p id="lf-hint" className="t-meta -mt-4">Describe colour, brand and marks. Leave out ID, student, bank or document numbers; the person who owns it can prove it's theirs.</p>
      <label className="label">Campus area
        <input name="area" placeholder="e.g. Library, main entrance" className={f} aria-invalid={!!err("area")} /><span className="err">{err("area")}</span></label>
      <label className="label">Date
        <input name="occurredOn" type="date" max={new Date().toISOString().slice(0, 10)} className={f} aria-invalid={!!err("occurredOn")} /><span className="err">{err("occurredOn")}</span></label>
      <div>
        <label className="btn btn-quiet cursor-pointer">{photo ? "Change photo" : "Add a photo (optional)"}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} /></label>
        <label className="btn btn-quiet ml-2 hidden cursor-pointer [@media(pointer:coarse)]:inline-flex">Take photo
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} /></label>
        <span role="status" className="ml-3 text-sm">{photoState === "uploading" ? "Uploading…" : photoState === "error" ? "Photo failed. Try again, or continue without it." : ""}</span>
        { }
        {photo && <img src={photo.preview} alt="Chosen item" className="mt-3 max-h-48 rounded-[var(--radius-md)]" />}
      </div>
      {state.message && <p role="alert" className="text-sm font-medium text-danger">{state.message}</p>}
      <button disabled={pending || photoState === "uploading"} className="btn btn-primary">{pending ? "Saving…" : "Post report"}</button>
    </form>
  );
}

"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compress } from "@/lib/image";
import { CONDITIONS, CONDITION_LABEL } from "@/lib/listings/schema";
import { publishListing, registerImage, removeImage, saveListing } from "@/app/(app)/sell/actions";

type Img = { key: string; preview: string; status: "uploading" | "done" | "error"; id?: string; file?: Blob; w?: number; h?: number; path?: string };
type Initial = { id?: string; title?: string; description?: string; price?: string; condition?: string; categoryId?: string; meeting?: string; images?: Img[] };
const field = "mt-1 block w-full min-h-11 rounded-[var(--radius-md)] border border-line bg-surface px-3 text-base aria-[invalid=true]:border-danger";

export function ListingForm({ categories, userId, initial = {} }: { categories: { id: string; name: string }[]; userId: string; initial?: Initial }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [id, setId] = useState(initial.id ?? null);
  const [images, setImages] = useState<Img[]>(initial.images ?? []);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [pending, start] = useTransition();
  const values = () => Object.fromEntries(new FormData(formRef.current!)) as Record<string, string>;

  async function ensureDraft() {
    const r = await saveListing(id, values());
    setErrors(r.fieldErrors ?? {}); setMessage(r.message ?? "");
    if (r.id) setId(r.id);
    return r.id ?? null;
  }

  async function upload(img: Img, listingId: string, position: number) {
    const supabase = createClient();
    const path = img.path ?? `${userId}/${listingId}/${crypto.randomUUID()}.webp`;
    const patch = (p: Partial<Img>) => setImages((l) => l.map((x) => (x.key === img.key ? { ...x, ...p } : x)));
    patch({ status: "uploading", path });
    const { error } = await supabase.storage.from("listing-images").upload(path, img.file!, { contentType: "image/webp", upsert: true });
    if (error) return patch({ status: "error" });
    const reg = await registerImage(listingId, path, img.w!, img.h!, position);
    patch(reg.id ? { status: "done", id: reg.id } : { status: "error" });
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const listingId = await ensureDraft();
    if (!listingId) { setMessage((m) => m || "Add a title, price, condition and category first, then add photos."); return; }
    for (const f of Array.from(files).slice(0, 8 - images.length)) {
      try {
        const { blob, w, h } = await compress(f);
        const img: Img = { key: crypto.randomUUID(), preview: URL.createObjectURL(blob), status: "uploading", file: blob, w, h };
        const position = images.length;
        setImages((l) => [...l, img]);
        void upload(img, listingId, position);
      } catch { setMessage("One of those files couldn't be read as a photo."); }
    }
  }

  const remove = (img: Img) => { setImages((l) => l.filter((x) => x.key !== img.key)); if (img.id) void removeImage(img.id); };
  const err = (k: string) => errors[k]?.[0];
  const busy = images.some((i) => i.status === "uploading");

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="max-w-xl space-y-5" noValidate>
      <fieldset className={preview ? "hidden" : "space-y-5"}>
        <label className="block text-sm font-medium">Title
          <input name="title" defaultValue={initial.title} className={field} aria-invalid={!!err("title")} /><span className="text-danger">{err("title")}</span></label>
        <label className="block text-sm font-medium">Price (ZMW)
          <input name="price" inputMode="decimal" defaultValue={initial.price} className={field} aria-invalid={!!err("price")} /><span className="text-danger">{err("price")}</span></label>
        <label className="block text-sm font-medium">Category
          <select name="categoryId" defaultValue={initial.categoryId ?? ""} className={field}><option value="" disabled>Choose…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><span className="text-danger">{err("categoryId")}</span></label>
        <label className="block text-sm font-medium">Condition
          <select name="condition" defaultValue={initial.condition ?? ""} className={field}><option value="" disabled>Choose…</option>{CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}</select><span className="text-danger">{err("condition")}</span></label>
        <label className="block text-sm font-medium">Description
          <textarea name="description" rows={5} defaultValue={initial.description} className={field} /><span className="text-danger">{err("description")}</span></label>
        <label className="block text-sm font-medium">Where can you meet? <span className="font-normal text-muted">(public campus spots are safest)</span>
          <input name="meetingPreferences" defaultValue={initial.meeting} className={field} /></label>
        <div>
          <p className="text-sm font-medium">Photos <span className="font-normal text-muted">(up to 8, the first is the cover)</span></p>
          <ul className="mt-2 grid grid-cols-3 gap-2">
            {images.map((i) => (
              <li key={i.key} className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] border border-line bg-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.preview} alt="Listing photo" className="size-full object-cover" />
                <span role="status" className="absolute inset-x-0 bottom-0 bg-surface/90 px-1 text-center text-xs">{i.status === "uploading" ? "Uploading…" : i.status === "error" ? "Failed" : "Ready"}</span>
                <div className="absolute right-1 top-1 flex gap-1">
                  {i.status === "error" && i.file && <button type="button" onClick={() => id && upload(i, id, images.indexOf(i))} className="min-h-8 rounded bg-surface px-2 text-xs">Retry</button>}
                  <button type="button" aria-label="Remove photo" onClick={() => remove(i)} className="min-h-8 rounded bg-surface px-2 text-xs">Remove</button>
                </div>
              </li>))}
          </ul>
          {images.length < 8 && <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-md)] border border-line bg-surface px-4 text-sm font-medium">Add photos
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} /></label>}
        </div>
      </fieldset>
      {preview && (
        <section aria-label="Preview" className="rounded-[var(--radius-md)] border border-line bg-surface p-4">
          <p className="price text-xl font-semibold">ZMW {values().price}</p><p className="font-medium">{values().title}</p>
          <p className="mt-2 whitespace-pre-line text-sm text-muted">{values().description}</p>
        </section>)}
      {message && <p role="alert" className="text-sm text-danger">{message}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="min-h-11 rounded-[var(--radius-md)] border border-line bg-surface px-4" onClick={() => setPreview((p) => !p)}>{preview ? "Keep editing" : "Preview"}</button>
        <button type="button" disabled={pending || busy} className="min-h-11 rounded-[var(--radius-md)] border border-line bg-surface px-4 disabled:opacity-60"
          onClick={() => start(async () => { const r = await ensureDraft(); if (r) setMessage("Draft saved."); })}>Save draft</button>
        <button type="button" disabled={pending || busy} className="min-h-11 rounded-[var(--radius-md)] bg-brand px-4 font-medium text-white disabled:opacity-60"
          onClick={() => start(async () => {
            const lid = await ensureDraft(); if (!lid) return;
            const r = await publishListing(lid);
            if (r.ok) router.push(`/listing/${lid}`); else setMessage(r.message ?? "");
          })}>{busy ? "Waiting for photos…" : "Publish"}</button>
      </div>
    </form>
  );
}

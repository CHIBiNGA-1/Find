"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compress } from "@/lib/image";
import { env } from "@/lib/env";
import { buildUploadRequest, uploadWithProgress } from "@/lib/storage-upload";
import { Icon } from "@/components/icons";
import { CONDITIONS, CONDITION_LABEL } from "@/lib/listings/schema";
import { categoryTree, topLevelOf, type Category } from "@/lib/categories";
import { moveItem, roomFor, MAX_IMAGES } from "@/lib/listings/images";
import { publishListing, registerImage, removeImage, reorderImages, saveListing } from "@/app/(app)/sell/actions";

type Status = "queued" | "uploading" | "done" | "error";
export type FormImage = { key: string; preview: string; status: Status; progress?: number; id?: string; path?: string; blob?: Blob; w?: number; h?: number; error?: string };
type Initial = { id?: string; status?: string; title?: string; description?: string; price?: string; condition?: string; categoryId?: string; campusArea?: string; meeting?: string; images?: FormImage[] };
const field = "field mt-1";
const STATE_LABEL: Record<Status, string> = { queued: "Waiting", uploading: "Uploading", done: "Ready", error: "Failed" };

export function ListingForm({ categories, userId, currency, initial = {} }: { categories: Category[]; userId: string; currency: string; initial?: Initial }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [id, setId] = useState(initial.id ?? null);
  const [images, setImages] = useState<FormImage[]>(initial.images ?? []);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<{ text: string; kind: "ok" | "error" } | null>(null);
  const [preview, setPreview] = useState(false);
  const [pending, start] = useTransition();
  const tree = categoryTree(categories);
  const [parentId, setParentId] = useState(topLevelOf(categories, initial.categoryId) ?? "");
  const [childId, setChildId] = useState(initial.categoryId && initial.categoryId !== topLevelOf(categories, initial.categoryId) ? initial.categoryId : "");
  const children = tree.find((p) => p.id === parentId)?.children ?? [];
  const categoryId = childId || parentId;
  const isDraft = !initial.status || initial.status === "draft";
  const saved = useRef(images.filter((i) => i.id).map((i) => i.id).join());
  const say = (text: string, kind: "ok" | "error" = "error") => setMessage({ text, kind });
  const values = (): Record<string, string> => ({ ...(Object.fromEntries(new FormData(formRef.current!)) as Record<string, string>), categoryId });

  async function ensureDraft(): Promise<string | null> {
    const r = await saveListing(id, values());
    setErrors(r.fieldErrors ?? {});
    if (r.message) say(r.message); else if (r.fieldErrors) say("Check the highlighted fields.");
    if (r.id) setId(r.id);
    return r.id ?? null;
  }

  async function upload(img: FormImage, listingId: string) {
    const patch = (p: Partial<FormImage>) => setImages((l) => l.map((x) => (x.key === img.key ? { ...x, ...p } : x)));
    const path = img.path ?? `${userId}/${listingId}/${crypto.randomUUID()}.webp`;
    patch({ status: "uploading", path, error: undefined, progress: 0 });
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) throw new Error("session");
      const req = buildUploadRequest({ supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL, anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, accessToken: session.access_token, bucket: "listing-images", path, upsert: true });
      await uploadWithProgress(req, img.blob!, (progress) => patch({ progress }));
      const reg = await registerImage(listingId, path, img.w!, img.h!);
      if (!reg.id) {
        await createClient().storage.from("listing-images").remove([path]);     // don't leave an unreferenced file behind
        throw new Error(reg.error === "limit" ? `A listing can have ${MAX_IMAGES} photos.` : "save");
      }
      patch({ status: "done", id: reg.id, progress: 100 });
    } catch (e) {
      patch({ status: "error", error: e instanceof Error && e.message.includes("photos") ? e.message : "Upload failed. Check your connection and retry." });
    }
  }

  // Takes a real array: a FileList is live and is emptied the moment the input's value is reset.
  async function addFiles(files: File[]) {
    if (!files.length) return;
    const take = roomFor(images.length, files.length);
    if (take < files.length) say(`Only ${MAX_IMAGES} photos fit. ${files.length - take} weren't added.`);
    if (!take) return;
    const listingId = await ensureDraft();
    if (!listingId) { say("Add a title, price, category and condition first, then add photos."); return; }
    const staged: FormImage[] = [];
    for (const f of files.slice(0, take)) {
      try { const { blob, w, h } = await compress(f); staged.push({ key: crypto.randomUUID(), preview: URL.createObjectURL(blob), status: "queued", blob, w, h }); }
      catch { say("One of those files couldn't be read as a photo."); }
    }
    setImages((l) => [...l, ...staged]);
    for (const img of staged) await upload(img, listingId);          // one at a time: the database order matches the order chosen
  }

  const remove = (img: FormImage) => {
    setImages((l) => l.filter((x) => x.key !== img.key));
    if (img.id) void removeImage(img.id).then((r) => { if (!r.ok) say("That photo couldn't be removed. Reload and try again."); });
  };
  const move = (i: number, d: number) => setImages((l) => moveItem(l, i, i + d));
  // Drag to reorder (mouse and touch): the handle captures the pointer, and whichever tile is under it swaps places.
  const [dragKey, setDragKey] = useState<string | null>(null);
  const dragOver = (e: React.PointerEvent) => {
    if (!dragKey) return;
    const over = (document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-photo-key]") as HTMLElement | null)?.dataset.photoKey;
    if (!over || over === dragKey) return;
    setImages((l) => { const from = l.findIndex((x) => x.key === dragKey), to = l.findIndex((x) => x.key === over); return from < 0 || to < 0 ? l : moveItem(l, from, to); });
  };

  // Persist order once uploads settle. The server rewrites positions 0..n-1 atomically, which also repairs the cover after a removal.
  const signature = images.filter((i) => i.status === "done").map((i) => i.id).join();
  const settled = images.every((i) => i.status === "done" || i.status === "error");
  useEffect(() => {
    if (!id || !settled || dragKey || signature === saved.current) return;
    const ids = images.filter((i) => i.status === "done" && i.id).map((i) => i.id!);
    void reorderImages(id, ids).then((r) => { if (r.ok) saved.current = signature; else say("Photo order couldn't be saved. It will retry on your next change."); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, settled, id, dragKey]);

  const busy = images.some((i) => i.status === "uploading" || i.status === "queued");
  const failed = images.some((i) => i.status === "error");
  const err = (k: string) => errors[k]?.[0];
  const v = preview ? values() : null;
  const cover = images.find((i) => i.status !== "error");

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} noValidate className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
      <section aria-label="Photos" className={preview ? "hidden" : ""}>
        <p className="label">Photos <span className="hint">Up to {MAX_IMAGES}. Drag to reorder; the first is the cover.</span></p>
        <ul className="mt-3 grid grid-cols-3 gap-2.5">
          {images.map((i, n) => (
            <li key={i.key} data-photo-key={i.key} className={`relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-sunken transition-shadow ${dragKey === i.key ? "z-10 shadow-xl ring-2 ring-ink" : ""}`}>
              { }
              <img src={i.preview} alt={`Photo ${n + 1}${n === 0 ? ", cover" : ""}`} className={`size-full object-cover ${i.status === "done" ? "" : "opacity-60"}`} />
              {n === 0 && <span className="tag tag-ink absolute left-1.5 top-1.5">Cover</span>}
              <button type="button" aria-label={`Remove photo ${n + 1}`} onClick={() => remove(i)} className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-white shadow"><Icon name="close" size={16} /></button>
              {i.status === "uploading" && <progress max={100} value={i.progress ?? 0} aria-label={`Uploading photo ${n + 1}`} className="absolute inset-x-0 bottom-0 h-1.5 w-full appearance-none [&::-moz-progress-bar]:bg-hl [&::-webkit-progress-bar]:bg-ink/30 [&::-webkit-progress-value]:bg-hl" />}
              <div className="absolute inset-x-0 bottom-1.5 flex items-center justify-between gap-1 px-1.5 text-xs font-semibold text-white">
                <span role="status" className="rounded bg-ink/85 px-1.5 py-0.5">{i.status === "uploading" ? `Uploading ${i.progress ?? 0}%` : STATE_LABEL[i.status]}</span>
                {i.status === "error" && i.blob && id && <button type="button" onClick={() => void upload(i, id)} className="min-h-6 rounded bg-white px-2 font-bold text-ink">Retry</button>}
                {i.status === "done" && images.length > 1 && (
                  <button type="button" aria-label={`Reorder photo ${n + 1}. Drag, or use the arrow keys.`}
                    onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragKey(i.key); }} onPointerMove={dragOver}
                    onPointerUp={() => setDragKey(null)} onPointerCancel={() => setDragKey(null)}
                    onKeyDown={(e) => { const d = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : 0; if (d) { e.preventDefault(); move(n, d); } }}
                    style={{ touchAction: "none" }} className="grid size-8 cursor-grab place-items-center rounded bg-ink/85 active:cursor-grabbing"><Icon name="grip" size={18} /></button>)}
              </div>
            </li>))}
          {images.length < MAX_IMAGES && (<>
            <li><label className="grid aspect-square cursor-pointer place-items-center rounded-[var(--radius-md)] border-2 border-dashed border-line-strong text-center text-sm font-semibold text-muted hover:border-ink hover:text-ink">
              <span><Icon name="image" size={26} className="mx-auto mb-1" />Add photos</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/*" multiple className="sr-only" onChange={(e) => { const picked = Array.from(e.target.files ?? []); e.target.value = ""; void addFiles(picked); }} /></label></li>
            <li className="hidden [@media(pointer:coarse)]:block"><label className="grid aspect-square cursor-pointer place-items-center rounded-[var(--radius-md)] border-2 border-dashed border-line-strong text-center text-sm font-semibold text-muted hover:border-ink hover:text-ink">
              <span><Icon name="camera" size={26} className="mx-auto mb-1" />Take photo</span>
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const picked = Array.from(e.target.files ?? []); e.target.value = ""; void addFiles(picked); }} /></label></li></>)}
        </ul>
        {images.some((i) => i.error) && <ul className="mt-2">{images.filter((i) => i.error).map((i) => <li key={i.key} role="alert" className="err">{i.error}</li>)}</ul>}
      </section>

      <div className="space-y-6">
        <fieldset className={preview ? "hidden" : "space-y-6"}>
          <label className="label">Title<input name="title" defaultValue={initial.title} maxLength={120} className={field} aria-invalid={!!err("title")} /><span className="err">{err("title")}</span></label>
          <label className="label">Price ({currency})<input name="price" inputMode="decimal" defaultValue={initial.price} placeholder="0" className={field} aria-invalid={!!err("price")} /><span className="err">{err("price")}</span></label>
          <div className={`grid gap-4 ${children.length ? "sm:grid-cols-2" : ""}`}>
            <label className="label">Category
              <select value={parentId} onChange={(e) => { setParentId(e.target.value); setChildId(""); }} className={field} aria-invalid={!!err("categoryId")}><option value="" disabled>Choose…</option>{tree.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><span className="err">{err("categoryId")}</span></label>
            {children.length > 0 && <label className="label">Subcategory <span className="hint">optional</span>
              <select value={childId} onChange={(e) => setChildId(e.target.value)} className={field}><option value="">Any</option>{children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          </div>
          <fieldset><legend className="label">Condition</legend>
            <div className="mt-2 flex flex-wrap gap-2">{CONDITIONS.map((c) => <label key={c} className="pick"><input type="radio" name="condition" value={c} defaultChecked={initial.condition === c} className="sr-only" />{CONDITION_LABEL[c]}</label>)}</div><span className="err">{err("condition")}</span></fieldset>
          <label className="label">Description<textarea name="description" rows={5} maxLength={4000} defaultValue={initial.description} className={field} /><span className="err">{err("description")}</span></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">Campus area <span className="hint">optional</span><input name="campusArea" defaultValue={initial.campusArea} maxLength={120} placeholder="e.g. Great East Road campus" className={field} /><span className="err">{err("campusArea")}</span></label>
            <label className="label">Pickup and availability <span className="hint">optional</span><input name="meetingPreferences" defaultValue={initial.meeting} maxLength={500} placeholder="e.g. Library entrance, weekdays after 4pm" className={field} /></label>
          </div>
        </fieldset>

        {v && (
          <section aria-label="Preview" className="space-y-3">
            <p className="t-meta">This is how your listing will look.</p>
            <div className="photo max-w-xs">{cover ?   <img src={cover.preview} alt="" className="size-full object-cover" /> : <span className="t-meta absolute inset-0 grid place-items-center">No photo yet</span>}</div>
            <p><span className="pricetag pricetag-lg">{currency} {v.price || "0"}</span></p>
            <h2 className="text-[1.75rem]">{v.title || "Untitled"}</h2>
            <p className="t-meta">{[CONDITION_LABEL[v.condition as (typeof CONDITIONS)[number]], v.campusArea].filter(Boolean).join(", ")}</p>
            {v.description && <p className="max-w-prose whitespace-pre-line">{v.description}</p>}
          </section>)}

        <div aria-live="polite">{message && <p role={message.kind === "error" ? "alert" : "status"} className={`note ${message.kind === "error" ? "note-danger" : ""}`}>{message.text}</p>}</div>
        {failed && <p className="err">Some photos failed. Retry or remove them before publishing.</p>}
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-quiet" onClick={() => setPreview((p) => !p)}>{preview ? "Keep editing" : "Preview"}</button>
          <button type="button" disabled={pending || busy} className="btn btn-quiet" onClick={() => start(async () => { const r = await ensureDraft(); if (r) say(isDraft ? "Draft saved." : "Changes saved.", "ok"); })}>{isDraft ? "Save draft" : "Save changes"}</button>
          {isDraft && <button type="button" disabled={pending || busy || failed} className="btn btn-primary" onClick={() => start(async () => {
            const lid = await ensureDraft(); if (!lid) return;
            const r = await publishListing(lid);
            if (r.ok) router.push(`/listing/${lid}`); else say(r.message ?? "We couldn't publish this listing.");
          })}>{busy ? "Uploading photos…" : "Publish"}</button>}
          {!isDraft && id && <button type="button" className="btn btn-primary" disabled={pending || busy} onClick={() => start(async () => { const r = await ensureDraft(); if (r) router.push(`/listing/${r}`); })}>Save and view</button>}
        </div>
      </div>
    </form>
  );
}

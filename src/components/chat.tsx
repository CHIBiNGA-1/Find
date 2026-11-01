"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compress } from "@/lib/image";
import { markRead, sendMessage } from "@/app/(app)/messages/actions";

export type Msg = { id: string; client_id: string; sender_id: string; body: string; image_path: string | null; created_at: string; state?: "sending" | "failed" };
const ERR = { invalid: "That message can't be sent.", rate_limited: "You're sending messages too quickly. Wait a moment, then retry.", failed: "Message not sent. Check your connection and retry." } as const;

function ChatImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => { void createClient().storage.from("message-images").createSignedUrl(path, 3600).then((r) => setUrl(r.data?.signedUrl)); }, [path]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="Shared photo" className="mt-1 max-h-64 rounded-[var(--radius-sm)]" /> : <span className="text-xs">Loading photo…</span>;
}

export function Chat({ conversationId, me, initial, canSend }: { conversationId: string; me: string; initial: Msg[]; canSend: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(true);
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const subscribedBefore = useRef(false);
  const latest = useRef(initial.at(-1)?.created_at ?? "1970-01-01T00:00:00Z");

  const add = useCallback((m: Msg) => {
    setMsgs((prev) => {
      if (prev.some((x) => x.id === m.id && !x.state)) return prev;
      const i = prev.findIndex((x) => x.client_id === m.client_id && x.sender_id === m.sender_id);   // replaces the optimistic copy
      const next = i >= 0 ? prev.map((x, n) => (n === i ? m : x)) : [...prev, m];
      return next.sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
    if (m.created_at > latest.current) latest.current = m.created_at;
    if (m.sender_id !== me) void markRead(conversationId);
  }, [conversationId, me]);

  useEffect(() => {
    const supabase = createClient();
    const catchUp = async () => {           // after a reconnect, fetch anything missed instead of assuming nothing was
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).gt("created_at", latest.current).order("created_at");
      data?.forEach((m) => add(m as Msg));
    };
    const ch = supabase.channel(`conv:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (p) => add(p.new as Msg))
      .subscribe((status) => { if (status === "SUBSCRIBED") { if (subscribedBefore.current) void catchUp(); subscribedBefore.current = true; } });
    void markRead(conversationId);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off); setOnline(navigator.onLine);
    return () => { void supabase.removeChannel(ch); window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [conversationId, add]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);

  async function deliver(m: Msg) {
    setMsgs((l) => l.map((x) => (x.client_id === m.client_id ? { ...x, state: "sending" } : x)));
    const r = await sendMessage({ conversationId, clientId: m.client_id, body: m.body, imagePath: m.image_path });
    if (r.ok) setMsgs((l) => l.map((x) => (x.client_id === m.client_id ? { ...x, state: undefined } : x)));
    else { setError(ERR[r.code]); setMsgs((l) => l.map((x) => (x.client_id === m.client_id ? { ...x, state: "failed" } : x))); }
  }
  function queue(body: string, image_path: string | null) {
    const id = crypto.randomUUID();
    const m: Msg = { id, client_id: id, sender_id: me, body, image_path, created_at: new Date().toISOString(), state: "sending" };
    setError(""); setMsgs((l) => [...l, m]); void deliver(m);
  }
  async function attach(file: File | undefined) {
    if (!file) return;
    try {
      const { blob } = await compress(file);
      const path = `${conversationId}/${me}/${crypto.randomUUID()}.webp`;
      const { error: e } = await createClient().storage.from("message-images").upload(path, blob, { contentType: "image/webp" });
      if (e) throw e;
      queue("", path);
    } catch { setError("That photo couldn't be uploaded. Try again."); }
  }

  return (
    <div className="flex flex-col">
      {!online && <p role="status" className="mb-2 rounded bg-surface p-2 text-sm">You're offline. Messages will fail until you reconnect; you can retry them.</p>}
      <ul className="space-y-2" aria-live="polite" aria-label="Messages">
        {msgs.map((m) => {
          const mine = m.sender_id === me;
          return (
            <li key={m.client_id} className={`flex ${mine ? "justify-end" : ""}`}>
              <div className={`max-w-[80%] rounded-[var(--radius-lg)] px-3 py-2 ${mine ? "bg-brand text-white" : "border border-line bg-surface"}`}>
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                {m.image_path && <ChatImage path={m.image_path} />}
                <p className="mt-1 text-xs opacity-80">
                  <time dateTime={m.created_at}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                  {mine && <> · {m.state === "sending" ? "Sending…" : m.state === "failed" ? "Not sent" : "Sent"}</>}
                  {m.state === "failed" && <button type="button" onClick={() => void deliver(m)} className="ml-2 min-h-8 underline">Retry</button>}
                </p>
              </div>
            </li>);
        })}
      </ul>
      <div ref={bottom} />
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      {canSend ? (
        <form onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (t) { queue(t, null); setText(""); } }}
          className="sticky bottom-16 mt-4 flex gap-2 bg-bg py-2 pb-safe md:bottom-0">
          <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-line bg-surface" title="Send a photo">
            <span className="sr-only">Send a photo</span><span aria-hidden="true">+</span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { void attach(e.target.files?.[0]); e.target.value = ""; }} /></label>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} aria-label="Message" placeholder="Write a message"
            className="min-h-11 flex-1 rounded-[var(--radius-md)] border border-line bg-surface px-3" />
          <button className="min-h-11 rounded-[var(--radius-md)] bg-brand px-4 font-medium text-white">Send</button>
        </form>
      ) : <p className="mt-4 text-sm text-muted">You can't send messages in this conversation.</p>}
    </div>
  );
}

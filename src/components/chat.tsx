"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compress } from "@/lib/image";
import { Icon } from "@/components/icons";
import { tap } from "@/lib/haptics";
import { formatDate, formatTime } from "@/lib/time";
import { markRead, sendMessage } from "@/app/(app)/messages/actions";

export type Msg = { id: string; client_id: string; sender_id: string; body: string; image_path: string | null; created_at: string; state?: "sending" | "failed" };
const ERR = { invalid: "That message can\u2019t be sent.", rate_limited: "You\u2019re sending messages too quickly. Wait a moment, then retry.", failed: "Message not sent. Check your connection and retry." } as const;
const PAGE = 40;

function ChatImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string>(), [bad, setBad] = useState(false);
  useEffect(() => { void createClient().storage.from("message-images").createSignedUrl(path, 3600).then((r) => (r.data?.signedUrl ? setUrl(r.data.signedUrl) : setBad(true))); }, [path]);
   
  return url ? <img src={url} alt="Shared photo" className="my-1 max-h-64 rounded-[var(--radius-md)]" /> : <span className="text-xs">{bad ? "Photo unavailable" : "Loading photo…"}</span>;
}

export function Chat({ conversationId, me, initial, hasEarlier, canSend, timezone, peerReadAt }: { conversationId: string; me: string; initial: Msg[]; hasEarlier: boolean; canSend: boolean; timezone: string; peerReadAt: string | null }) {
  const [msgs, setMsgs] = useState<Msg[]>(() => [...initial].sort((a, b) => a.created_at.localeCompare(b.created_at)));
  const [earlier, setEarlier] = useState(hasEarlier), [loadingEarlier, setLoadingEarlier] = useState(false);
  const [error, setError] = useState(""), [online, setOnline] = useState(true), [text, setText] = useState("");
  const [peerRead, setPeerRead] = useState(peerReadAt);
  const bottom = useRef<HTMLDivElement>(null), subscribedBefore = useRef(false), stick = useRef(true);
  const latest = useRef(initial.at(-1)?.created_at ?? "1970-01-01T00:00:00Z");
  const msgsRef = useRef(msgs); msgsRef.current = msgs;

  const refreshPeer = useCallback(async () => {
    const { data } = await createClient().rpc("peer_last_read", { p_conv: conversationId });
    if (typeof data === "string") setPeerRead(data);
  }, [conversationId]);

  const add = useCallback((m: Msg) => {
    setMsgs((prev) => {
      if (prev.some((x) => x.id === m.id && !x.state)) return prev;
      const i = prev.findIndex((x) => x.client_id === m.client_id && x.sender_id === m.sender_id);      // the server copy replaces the optimistic one
      const next = i >= 0 ? prev.map((x, n) => (n === i ? m : x)) : [...prev, m];
      return next.sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
    if (m.created_at > latest.current) latest.current = m.created_at;
    if (m.sender_id !== me) { void markRead(conversationId); }
  }, [conversationId, me]);

  useEffect(() => {
    const supabase = createClient();
    const catchUp = async () => {                         // after a reconnect, fetch what was missed instead of assuming nothing was
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).gt("created_at", latest.current).order("created_at");
      data?.forEach((m) => add(m as Msg)); void refreshPeer();
    };
    const ch = supabase.channel(`conv:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (p) => add(p.new as Msg))
      .subscribe((status) => { if (status === "SUBSCRIBED") { if (subscribedBefore.current) void catchUp(); subscribedBefore.current = true; } });
    void markRead(conversationId);
    const poll = setInterval(() => { if (document.visibilityState === "visible") void refreshPeer(); }, 20000);   // the other person's read state is private to them, so it can't be streamed
    const on = () => { setOnline(true); retryFailed(); void catchUp(); }, off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off); setOnline(navigator.onLine);
    return () => { void supabase.removeChannel(ch); clearInterval(poll); window.removeEventListener("online", on); window.removeEventListener("offline", off); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, add, refreshPeer]);

  useEffect(() => {
    const last = msgs.at(-1);
    if (stick.current || last?.sender_id === me) bottom.current?.scrollIntoView({ block: "end" });
  }, [msgs, me]);
  useEffect(() => {
    const onScroll = () => { stick.current = window.innerHeight + window.scrollY >= document.body.scrollHeight - 160; };
    window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function loadEarlier() {
    setLoadingEarlier(true); stick.current = false;
    const oldest = msgs[0]?.created_at;
    const { data, error: e } = await createClient().from("messages").select("*").eq("conversation_id", conversationId).lt("created_at", oldest ?? new Date().toISOString()).order("created_at", { ascending: false }).limit(PAGE + 1);
    setLoadingEarlier(false);
    if (e) { setError("Couldn\u2019t load earlier messages. Try again."); return; }
    setError(""); const rows = (data ?? []) as Msg[];
    setEarlier(rows.length > PAGE);
    setMsgs((l) => [...rows.slice(0, PAGE).reverse(), ...l]);
  }

  // Delivery is idempotent: the client_id is unique per message, so a retry can never create a duplicate.
  async function deliver(m: Msg) {
    setMsgs((l) => l.map((x) => (x.client_id === m.client_id ? { ...x, state: "sending" } : x)));
    let code: keyof typeof ERR | null = null;
    try { const r = await sendMessage({ conversationId, clientId: m.client_id, body: m.body, imagePath: m.image_path }); if (!r.ok) code = r.code; }
    catch { code = "failed"; }                            // network down: the server action itself throws
    if (!code) { setMsgs((l) => l.map((x) => (x.client_id === m.client_id ? { ...x, state: undefined } : x))); setError(""); }
    else { setError(ERR[code]); setMsgs((l) => l.map((x) => (x.client_id === m.client_id ? { ...x, state: "failed" } : x))); }
  }
  function retryFailed() { msgsRef.current.filter((x) => x.state === "failed" && x.sender_id === me).forEach((x) => void deliver(x)); }
  function queue(body: string, image_path: string | null) {
    const id = crypto.randomUUID();
    const m: Msg = { id, client_id: id, sender_id: me, body, image_path, created_at: new Date().toISOString(), state: "sending" };
    setError(""); stick.current = true; setMsgs((l) => [...l, m]); void deliver(m);
  }
  async function attach(file: File | undefined) {
    if (!file) return;
    try {
      const { blob } = await compress(file);
      const path = `${conversationId}/${me}/${crypto.randomUUID()}.webp`;
      const { error: e } = await createClient().storage.from("message-images").upload(path, blob, { contentType: "image/webp" });
      if (e) throw e;
      queue("", path);
    } catch { setError("That photo couldn\u2019t be uploaded. Try again."); }
  }
  const submit = () => { const t = text.trim(); if (t) { tap(); queue(t, null); setText(""); } };
  const lastMineSeen = [...msgs].reverse().find((m) => m.sender_id === me && !m.state && peerRead && m.created_at <= peerRead)?.id;

  let day = "";
  return (
    <div className="flex min-h-[calc(100dvh-14rem)] flex-col md:min-h-0">
      {!online && <p role="status" className="note mb-3">You&rsquo;re offline. New messages will send when you reconnect.</p>}
      {earlier && <button type="button" disabled={loadingEarlier} onClick={() => void loadEarlier()} className="btn btn-quiet btn-sm mx-auto mb-3">{loadingEarlier ? "Loading…" : "Earlier messages"}</button>}
      <ul className="space-y-1.5" aria-label="Messages">
        {msgs.map((m) => {
          const mine = m.sender_id === me, d = formatDate(m.created_at, timezone, true), showDay = d !== day; day = d;
          return (
            <li key={m.client_id}>
              {showDay && <p className="t-meta my-3 text-center text-[0.75rem]">{d}</p>}
              <div className={`flex ${mine ? "justify-end" : ""}`}>
                <div className={`max-w-[84%] px-3.5 py-2 md:max-w-[70%] ${mine ? "rounded-[16px] rounded-br-[4px] bg-brand text-white" : "rounded-[16px] rounded-bl-[4px] bg-sunken text-ink"}`}>
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  {m.image_path && <ChatImage path={m.image_path} />}
                  <p className={`mt-0.5 flex items-center justify-end gap-2 text-[0.6875rem] ${mine ? "text-white/85" : "text-muted"}`}>
                    <time dateTime={m.created_at}>{formatTime(m.created_at, timezone)}</time>
                    {mine && <span>{m.state === "sending" ? "Sending…" : m.state === "failed" ? "Not sent" : m.id === lastMineSeen ? "Seen" : "Sent"}</span>}
                    {m.state === "failed" && <button type="button" onClick={() => void deliver(m)} className="min-h-8 font-bold underline">Retry</button>}
                  </p>
                </div>
              </div>
            </li>);
        })}
      </ul>
      <div ref={bottom} />
      <div aria-live="assertive">{error && <p role="alert" className="err mt-3">{error}</p>}</div>
      {canSend ? (
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="sticky bottom-0 mt-auto flex items-end gap-2 border-t border-line bg-bg pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          <label className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full shadow-[inset_0_0_0_1.5px_var(--color-line-strong)] hover:shadow-[inset_0_0_0_1.5px_var(--color-ink)]">
            <span className="sr-only">Send a photo</span><Icon name="image" size={20} />
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { void attach(e.target.files?.[0]); e.target.value = ""; }} /></label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000} aria-label="Message" placeholder="Write a message"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
            className="field !min-h-11 max-h-32 flex-1 resize-none !rounded-[22px] py-2.5 leading-snug [field-sizing:content]" />
          <button className="btn btn-primary !min-h-11 !rounded-full" disabled={!text.trim()}>Send</button>
        </form>
      ) : <p className="note mt-4">You can&rsquo;t send messages in this conversation.</p>}
    </div>
  );
}

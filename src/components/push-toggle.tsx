"use client";
import { useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/push-client";
import { removePushSubscription, savePushSubscription } from "@/app/(app)/you/push-actions";

type State = "checking" | "unsupported" | "needs-install" | "denied" | "off" | "on";
const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Switch for new-message notifications on this device. Renders nothing unless push is configured for this deployment. */
export function PushToggle() {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { setState(ios && !standalone ? "needs-install" : "unsupported"); return; }
      if (Notification.permission === "denied") { setState("denied"); return; }
      const reg = await navigator.serviceWorker.getRegistration();
      setState((await reg?.pushManager.getSubscription()) ? "on" : "off");
    })();
  }, []);

  if (!KEY) return null;

  async function enable() {
    setBusy(true); setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState(permission === "denied" ? "denied" : "off"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(KEY!) });
      const j = sub.toJSON();
      const saved = await savePushSubscription({ endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth });
      if (!saved.ok) { await sub.unsubscribe(); throw new Error("save"); }   // never leave a device subscribed that the server doesn't know about
      setState("on");
    } catch { setError("Couldn\u2019t turn notifications on. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true); setError("");
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) { const r = await removePushSubscription(sub.endpoint); if (!r.ok) throw new Error("remove"); await sub.unsubscribe(); }
      setState("off");
    } catch { setError("Couldn\u2019t turn notifications off. Try again."); }
    finally { setBusy(false); }
  }

  const text: Record<State, string> = {
    checking: "Checking this device\u2026",
    unsupported: "This browser doesn\u2019t support notifications.",
    "needs-install": "On iPhone, add f!nd to your Home Screen first, then come back here to turn notifications on.",
    denied: "Notifications are blocked for f!nd. Allow them in your browser or phone settings, then reload.",
    off: "Get a notification when someone messages you. It shows who it\u2019s from, never what they wrote.",
    on: "On for this device. It shows who a message is from, never what it says.",
  };
  return (
    <section className="mt-10" aria-labelledby="push-h">
      <h2 id="push-h" className="text-[1.75rem]">Notifications</h2>
      <p className="t-meta mt-1 max-w-prose" data-testid="push-status">{text[state]}</p>
      {(state === "off" || state === "on") && (
        <button type="button" disabled={busy} onClick={() => void (state === "on" ? disable() : enable())} className={`btn mt-3 ${state === "on" ? "btn-quiet" : "btn-primary"}`} aria-pressed={state === "on"}>
          {busy ? "Working\u2026" : state === "on" ? "Turn off on this device" : "Turn on notifications"}</button>)}
      {error && <p role="alert" className="err">{error}</p>}
    </section>
  );
}

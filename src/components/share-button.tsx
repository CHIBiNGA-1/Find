"use client";
import { useState } from "react";
import { Icon } from "@/components/icons";

/** Native share sheet where the device has one; otherwise copies the link and says so. */
export function ShareButton({ title, path, iconOnly = false }: { title: string; path: string; iconOnly?: boolean }) {
  const [msg, setMsg] = useState("");
  async function share() {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url); setMsg("Link copied");
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return;     // the person closed the share sheet
      setMsg("Couldn\u2019t copy. Copy the address from your browser.");
    }
    setTimeout(() => setMsg(""), 2500);
  }
  return (<>
    <button type="button" onClick={() => void share()} aria-label={iconOnly ? "Share listing" : undefined} className={`btn btn-quiet ${iconOnly ? "!min-w-12 !px-0" : ""}`}>
      <Icon name="share" size={iconOnly ? 22 : 18} />{!iconOnly && "Share"}</button>
    <span role="status" className="sr-only">{msg}</span>
    {msg && <span aria-hidden="true" className="t-meta">{msg}</span>}
  </>);
}

"use client";
import { useOptimistic, useState, useTransition } from "react";
import { toggleSaved } from "@/app/(app)/sell/actions";
import { Icon } from "@/components/icons";
import { tap } from "@/lib/haptics";

export function SaveButton({ listingId, saved, iconOnly = false }: { listingId: string; saved: boolean; iconOnly?: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [failed, setFailed] = useState(false);
  const [, start] = useTransition();
  return (<>
    <button type="button" aria-pressed={optimistic} aria-label={optimistic ? "Saved. Tap to remove" : "Save listing"}
      onClick={() => { tap(); setFailed(false); start(async () => { setOptimistic(!optimistic); const r = await toggleSaved(listingId, !optimistic); if (!r.ok) setFailed(true); }); }}
      className={`btn btn-quiet ${iconOnly ? "!min-w-12 !px-0" : ""}`}>
      <Icon name="bookmark" size={iconOnly ? 22 : 18} filled={optimistic} />{!iconOnly && (optimistic ? "Saved" : "Save")}
    </button>
    {failed && <span role="alert" className="err">Couldn&rsquo;t update. Try again.</span>}
  </>);
}

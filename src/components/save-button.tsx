"use client";
import { useOptimistic, useTransition } from "react";
import { toggleSaved } from "@/app/(app)/sell/actions";
import { Icon } from "@/components/icons";
import { tap } from "@/lib/haptics";

export function SaveButton({ listingId, saved, iconOnly = false }: { listingId: string; saved: boolean; iconOnly?: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, start] = useTransition();
  return (
    <button type="button" aria-pressed={optimistic}
      onClick={() => { tap(); start(async () => { setOptimistic(!optimistic); await toggleSaved(listingId, !optimistic); }); }}
      aria-label={optimistic ? "Saved" : "Save"} className={`btn btn-quiet ${iconOnly ? "!min-w-12 !px-0" : ""}`}>
      <Icon name="bookmark" size={iconOnly ? 22 : 18} filled={optimistic} />{!iconOnly && (optimistic ? "Saved" : "Save")}
    </button>
  );
}

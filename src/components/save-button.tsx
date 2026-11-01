"use client";
import { useOptimistic, useTransition } from "react";
import { toggleSaved } from "@/app/(app)/sell/actions";

export function SaveButton({ listingId, saved }: { listingId: string; saved: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, start] = useTransition();
  return (
    <button type="button" aria-pressed={optimistic}
      onClick={() => start(async () => { setOptimistic(!optimistic); await toggleSaved(listingId, !optimistic); })}
      className="btn btn-quiet">
      {optimistic ? "Saved" : "Save"}
    </button>
  );
}

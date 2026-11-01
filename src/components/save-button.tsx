"use client";
import { useOptimistic, useTransition } from "react";
import { toggleSaved } from "@/app/(app)/sell/actions";

export function SaveButton({ listingId, saved }: { listingId: string; saved: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, start] = useTransition();
  return (
    <button type="button" aria-pressed={optimistic}
      onClick={() => start(async () => { setOptimistic(!optimistic); await toggleSaved(listingId, !optimistic); })}
      className="min-h-11 rounded-[var(--radius-md)] border border-line bg-surface px-4 text-sm font-medium transition-transform active:scale-95">
      {optimistic ? "Saved" : "Save"}
    </button>
  );
}

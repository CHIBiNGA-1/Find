"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { updateProfile, type SettingsState } from "../settings-actions";

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateProfile, {});
  const ref = useRef<HTMLFormElement>(null);

  // Flash a subtle saved indicator
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (state.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
  }, [state]);

  return (
    <form ref={ref} action={action} className="mt-6 space-y-4 max-w-sm">
      <div>
        <label htmlFor="display_name" className="block text-sm font-medium mb-1">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          defaultValue={displayName}
          minLength={2}
          maxLength={60}
          required
          className="w-full min-h-11 rounded-[var(--radius-md)] border border-line bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {state.fieldErrors?.display_name && (
          <p role="alert" className="mt-1 text-sm text-danger">
            {state.fieldErrors.display_name[0]}
          </p>
        )}
      </div>
      {state.message && (
        <p role="alert" className="text-sm text-danger">{state.message}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-[var(--radius-md)] bg-brand px-5 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span role="status" className="text-sm text-muted animate-fade-in">
            ✓ Saved
          </span>
        )}
      </div>
    </form>
  );
}

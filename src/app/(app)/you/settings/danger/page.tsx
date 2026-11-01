"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount } from "../../settings-actions";

export default function DangerPage() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAccount(confirmation);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/sign-in?deleted=1");
      }
    });
  }

  return (
    <main className="max-w-xl">
      <h1 className="font-serif text-3xl tracking-tight">Delete account</h1>
      <p className="mt-3 text-muted">
        This is permanent. Your profile, listings, messages, and all other data
        will be removed and cannot be recovered.
      </p>

      <div className="mt-6 rounded-[var(--radius-md)] border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
        <strong>Before you continue:</strong> active listings will be removed, ongoing
        conversations will become inaccessible, and reviews tied to your account
        will be anonymised.
      </div>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-6 inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-danger px-4 font-medium text-danger"
        >
          I understand — delete my account
        </button>
      ) : (
        <div className="mt-6 space-y-4">
          <label htmlFor="confirm-delete" className="block text-sm font-medium">
            Type <strong>DELETE</strong> to confirm
          </label>
          <input
            id="confirm-delete"
            type="text"
            value={confirmation}
            onChange={(e) => { setConfirmation(e.target.value); setError(null); }}
            placeholder="DELETE"
            autoComplete="off"
            className="w-full min-h-11 rounded-[var(--radius-md)] border border-line bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-danger"
          />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={isPending || confirmation !== "DELETE"}
              className="min-h-11 rounded-[var(--radius-md)] bg-danger px-5 font-medium text-white disabled:opacity-40"
            >
              {isPending ? "Deleting…" : "Delete my account"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setConfirmation(""); setError(null); }}
              className="min-h-11 rounded-[var(--radius-md)] border border-line px-4 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

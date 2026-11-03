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
      <h1 className="t-page">Delete account</h1>
      <p className="mt-3 text-muted">
        This is permanent. Your profile, listings, messages, and all other data
        will be removed and cannot be recovered.
      </p>

      <div className="mt-6 rounded-[var(--radius-md)] bg-danger-tint p-4 text-sm font-medium text-danger">
        <strong>Before you continue:</strong> active listings will be removed, ongoing
        conversations will become inaccessible, and reviews tied to your account
        will be anonymised.
      </div>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-6 btn btn-danger-quiet"
        >
          I understand — delete my account
        </button>
      ) : (
        <div className="mt-6 space-y-4">
          <label htmlFor="confirm-delete" className="label">
            Type <strong>DELETE</strong> to confirm
          </label>
          <input
            id="confirm-delete"
            type="text"
            value={confirmation}
            onChange={(e) => { setConfirmation(e.target.value); setError(null); }}
            placeholder="DELETE"
            autoComplete="off"
            className="field"
          />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={isPending || confirmation !== "DELETE"}
              className="btn btn-danger"
            >
              {isPending ? "Deleting…" : "Delete my account"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setConfirmation(""); setError(null); }}
              className="btn btn-quiet"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

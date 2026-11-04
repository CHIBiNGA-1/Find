"use client";
import { useActionState, useMemo, useState } from "react";
import { foundUniversity, requestMembership, type FoundState } from "@/app/onboarding/actions";

type U = { id: string; name: string };

export function UniversityPicker({ universities, terms }: { universities: U[]; terms: { days: number; members: number } }) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(universities.length === 0);
  const [state, act, pending] = useActionState<FoundState, FormData>(foundUniversity, {});
  const matches = useMemo(() => universities.filter((u) => u.name.toLowerCase().includes(q.trim().toLowerCase())), [q, universities]);

  return (
    <div>
      {universities.length > 0 && (
        <>
          <label className="label">Find your university
            <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Start typing its name" className="field mt-1" autoComplete="off" /></label>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface">
            {matches.map((u) => (
              <li key={u.id}>
                <form action={requestMembership} className="flex items-center justify-between gap-3 px-4 py-3">
                  <input type="hidden" name="universityId" value={u.id} />
                  <span className="font-medium">{u.name}</span>
                  <button className="btn btn-quiet btn-sm">Request to join</button>
                </form>
              </li>))}
            {matches.length === 0 && <li className="px-4 py-3 text-muted">Nothing called &ldquo;{q}&rdquo; yet.</li>}
          </ul>
          {!adding && <p className="mt-5 text-muted">Not there? <button type="button" onClick={() => setAdding(true)} className="link font-medium">Add your university</button></p>}
        </>
      )}

      {adding && (
        <form action={act} className="mt-6 space-y-5 rounded-[var(--radius-lg)] bg-[var(--color-mint,#ecf0e8)] p-5">
          <div>
            <h2 className="t-section">Add your university</h2>
            <p className="t-meta mt-1">You&rsquo;ll be the first to bring it to f!nd, and its first moderator.</p>
          </div>
          <label className="label">University name
            <input name="name" defaultValue={q} required minLength={3} maxLength={120} className="field mt-1" autoComplete="off" /></label>
          <details className="text-[0.9rem]">
            <summary className="cursor-pointer font-medium">A friendly naming guide</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              <li>Use the full official name, such as &ldquo;University of Zambia&rdquo;.</li>
              <li>Skip abbreviations like UNZA; people search by the full name.</li>
              <li>Leave out the town or campus unless it is part of the name.</li>
              <li>Capitalise it the way the university itself does.</li>
            </ul>
            <p className="mt-2 text-muted">These are suggestions only. Nothing here is checked.</p>
          </details>
          <div className="rounded-[var(--radius-md)] bg-surface p-4 text-[0.9rem]">
            <p className="font-semibold">What founding means</p>
            <p className="mt-1 text-muted">You become the moderator and approve classmates. A new university has a <strong>{terms.days}-day founding period</strong> to reach <strong>{terms.members} verified students</strong> (you count as one). Reach it and the university stays open. Miss it and the university closes and nothing stays visible, so share it with your classmates early.</p>
          </div>
          {state.similar && (
            <div role="alert" className="rounded-[var(--radius-md)] border border-line-strong bg-surface p-4 text-[0.9rem]">
              <p>{state.message ?? <>There is already a university called <strong>{state.similar.name}</strong>. Is that yours?</>}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button formAction={requestMembership} name="universityId" value={state.similar.id} formNoValidate className="btn btn-primary btn-sm">Join {state.similar.name}</button>
                {!state.message && <button name="confirmDistinct" value="1" className="btn btn-quiet btn-sm">Mine is different, add it</button>}
              </div>
            </div>)}
          {state.message && !state.similar && <p role="alert" className="err">{state.message}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={pending} className="btn btn-primary">{pending ? "Adding…" : "Add it and become its moderator"}</button>
            {universities.length > 0 && <button type="button" onClick={() => setAdding(false)} className="link text-[0.9rem]">Back to the list</button>}
          </div>
        </form>)}
    </div>
  );
}

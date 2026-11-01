import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import { requestMembership } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Join your university" };

export default async function Onboarding() {
  const supabase = await createClient();
  const { data: memberships } = await supabase.from("university_memberships").select("status, universities(name)").limit(1);
  const m = memberships?.[0];
  if (m?.status === "verified") redirect("/");
  const { data: universities } = await supabase.from("universities").select("id, name").order("name");
  const uniName = (m?.universities as unknown as { name: string } | null)?.name;

  return (
    <main className="mx-auto max-w-md px-[var(--space-gutter)] py-16">
      {!m && (
        <>
          <h1 className="font-serif text-3xl tracking-tight">Choose your university</h1>
          <p className="mb-6 mt-2 text-muted">Your membership is reviewed by a moderator. Verification confirms you belong to this community; it doesn't guarantee how any individual will behave.</p>
          {universities?.length ? (
            <form action={requestMembership} className="space-y-4">
              <label className="block text-sm font-medium">University
                <select name="universityId" required className="mt-1 block min-h-11 w-full rounded-[var(--radius-md)] border border-line bg-surface px-3">
                  {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </label>
              <button className="min-h-11 w-full rounded-[var(--radius-md)] bg-brand px-4 font-medium text-white">Request membership</button>
            </form>
          ) : <p>No universities are set up yet. Check back soon.</p>}
        </>
      )}
      {m?.status === "pending" && (<><h1 className="font-serif text-3xl tracking-tight">Request received</h1><p className="mt-2 text-muted">A moderator at {uniName} is reviewing your membership. Check back later; you'll get access as soon as it's approved.</p></>)}
      {(m?.status === "rejected" || m?.status === "suspended") && (<><h1 className="font-serif text-3xl tracking-tight">Membership not active</h1><p className="mt-2 text-muted">Your membership at {uniName} isn't active. Contact your university's f!nd moderators if you think this is a mistake.</p></>)}
      <form action={signOut} className="mt-8"><button className="text-sm text-muted underline">Sign out</button></form>
    </main>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import { Wordmark } from "@/components/wordmark";
import { UniversityPicker } from "@/components/university-picker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Join the university" };

export default async function Onboarding() {
  const supabase = await createClient();
  const { data: memberships } = await supabase.from("university_memberships").select("status, universities(name, status)");
  const live = memberships?.find((m) => (m.universities as unknown as { status: string } | null)?.status !== "closed");
  if (live?.status === "verified") redirect("/");
  const m = live;
  const [{ data: universities }, { data: termsRows }] = await Promise.all([
    supabase.from("universities").select("id, name").neq("status", "closed").order("name"),
    supabase.rpc("founding_terms"),
  ]);
  const terms = ((termsRows ?? []) as { days: number; members: number }[])[0] ?? { days: 30, members: 15 };
  const uniName = (m?.universities as unknown as { name: string } | null)?.name;

  return (
    <main className="mx-auto max-w-lg px-[var(--gutter)] py-14">
      <p className="mb-8 text-[3rem] text-brand"><Wordmark /></p>
      {!m && (
        <>
          <p className="t-meta">Your email is confirmed. One more step.</p>
          <h1 className="t-page mt-1">Which university are you at?</h1>
          <p className="mb-7 mt-2 text-muted">A moderator there confirms you belong. Verification confirms membership, not how anyone behaves.</p>
          <UniversityPicker universities={(universities ?? []) as { id: string; name: string }[]} terms={terms} />
        </>)}
      {m?.status === "pending" && (<><h1 className="t-page">Request received</h1><p className="mt-2 text-muted">A moderator at {uniName} is reviewing your membership. You&rsquo;ll get access as soon as it&rsquo;s approved.</p></>)}
      {(m?.status === "rejected" || m?.status === "suspended") && (<><h1 className="t-page">Membership not active</h1><p className="mt-2 text-muted">Your membership at {uniName} isn&rsquo;t active. Contact the university&rsquo;s f!nd moderators if you think this is a mistake.</p></>)}
      <form action={signOut} className="mt-10"><button className="text-sm text-muted underline">Sign out</button></form>
    </main>
  );
}

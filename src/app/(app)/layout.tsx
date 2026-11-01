import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { Wordmark } from "@/components/wordmark";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data } = await supabase.from("university_memberships").select("id").eq("status", "verified").limit(1);
  if (!data?.length) redirect("/onboarding");
  const { data: unreadRaw } = await supabase.rpc("unread_counts");
  const total = ((unreadRaw ?? []) as { conversation_id: string; unread: number }[]).reduce((n, u) => n + Number(u.unread), 0);
  return (
    <div>
      <AppNav unread={total} />
      <header className="mx-auto max-w-[var(--width-content)] px-[var(--space-gutter)] pt-6">
        <Link href="/" aria-label="f!nd home" className="inline-block text-[1.75rem]"><Wordmark /></Link>
      </header>
      <div className="mx-auto max-w-[var(--width-content)] px-[var(--space-gutter)] pb-4 pt-8">{children}</div>
      <SiteFooter />
    </div>
  );
}

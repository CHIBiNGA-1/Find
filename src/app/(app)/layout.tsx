import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { SiteFooter } from "@/components/site-footer";
import { AppFrame } from "@/components/app-frame";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { ConnectionBanner } from "@/components/connection-banner";
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
      <ConnectionBanner />
      <PullToRefresh />
      <AppFrame>{children}</AppFrame>
      <SiteFooter />
    </div>
  );
}

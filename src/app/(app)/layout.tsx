import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { AppFrame } from "@/components/app-frame";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { ConnectionBanner } from "@/components/connection-banner";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const [{ data: m }, { data: unreadRaw }] = await Promise.all([
    supabase.from("university_memberships").select("universities(name)").eq("status", "verified").limit(1).maybeSingle(),
    supabase.rpc("unread_counts"),
  ]);
  if (!m) redirect("/onboarding");
  const total = ((unreadRaw ?? []) as { conversation_id: string; unread: number }[]).reduce((n, u) => n + Number(u.unread), 0);
  const university = (m.universities as unknown as { name: string } | null)?.name ?? "Campus";
  return (
    <div className="shell">
      <AppNav unread={total} university={university} />
      <ConnectionBanner />
      <PullToRefresh />
      <AppFrame>{children}</AppFrame>
    </div>
  );
}

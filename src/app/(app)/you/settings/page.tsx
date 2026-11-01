import Link from "next/link";
import { getContext } from "@/lib/session";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, userId } = await getContext();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single();

  return (
    <main className="max-w-xl">
      <h1 className="font-serif text-3xl tracking-tight">Settings</h1>

      {/* Profile */}
      <section className="mt-8">
        <h2 className="font-semibold text-lg">Profile</h2>
        <p className="mt-1 text-sm text-muted">
          Your display name is visible to other verified members of your university.
        </p>
        <ProfileForm displayName={profile?.display_name ?? ""} />
      </section>

      {/* Notifications placeholder */}
      <section className="mt-10 rounded-[var(--radius-md)] border border-line bg-surface p-4">
        <h2 className="font-semibold">Push notifications</h2>
        <p className="mt-1 text-sm text-muted">
          Push notifications aren&apos;t available yet — we&apos;ll let you know when they arrive.
        </p>
      </section>

      {/* Danger zone */}
      <section className="mt-10">
        <h2 className="font-semibold text-danger">Danger zone</h2>
        <p className="mt-1 text-sm text-muted">
          Permanently delete your account and all associated data.
        </p>
        <div className="mt-3">
          <Link
            href="/you/settings/danger"
            className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-danger px-4 text-sm font-medium text-danger"
          >
            Delete account
          </Link>
        </div>
      </section>
    </main>
  );
}

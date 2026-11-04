import Link from "next/link";
import { PushToggle } from "@/components/push-toggle";
import { getContext } from "@/lib/session";
import { ProfileForm } from "./profile-form";
import { InstallPrompt } from "@/components/install-prompt";

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
      <h1 className="t-page">Settings</h1>

      {/* Profile */}
      <section className="mt-8">
        <h2 className="text-[1.75rem]">Profile</h2>
        <p className="t-meta mt-1">
          Your display name is visible to other verified members of the university.
        </p>
        <ProfileForm displayName={profile?.display_name ?? ""} />
      </section>

      <section className="mt-10"><h2 className="text-[1.75rem]">App</h2><InstallPrompt variant="row" className="mt-3" /></section>

      <PushToggle />

      <section className="mt-10">
        <h2 className="text-[1.75rem]">Privacy</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[0.9375rem]">
          <li>Only verified members of your university can see your name and listings.</li>
          <li>Your email address and phone number are never shown on f!nd.</li>
          <li>People you message can see when you last read a conversation.</li>
          <li>Notifications never include what a message says.</li>
          <li>You can block anyone from a conversation&rsquo;s menu.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[1.75rem]">About f!nd</h2>
        <p className="t-meta mt-2 leading-relaxed">Verification confirms someone belongs to the university, not how they behave. Meet in public places. f!nd doesn&rsquo;t handle payments or guarantee any exchange.</p>
      </section>

      {/* Danger zone */}
      <section className="mt-10">
        <h2 className="text-[1.75rem] text-danger">Danger zone</h2>
        <p className="mt-1 text-sm text-muted">
          Permanently delete your account and all associated data.
        </p>
        <div className="mt-3">
          <Link
            href="/you/settings/danger"
            className="btn btn-danger-quiet"
          >
            Delete account
          </Link>
        </div>
      </section>
    </main>
  );
}

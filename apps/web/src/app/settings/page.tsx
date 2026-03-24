import type { UserProfileInput } from "@homemall/shared";
import Link from "next/link";
import { LogoutButton } from "@/components/layout/logout-button";
import { AccountProfileForm } from "@/components/settings/account-profile-form";
import { LikedOffersPanel } from "@/components/settings/liked-offers-panel";
import { serverApi } from "@/lib/server-api";

interface MeResponse {
  user: {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    displayName?: string;
    avatarUrl?: string;
    contactPhone?: string;
    contactWhatsApp?: string;
    contactInstagram?: string;
    contactFacebook?: string;
    contactWebsite?: string;
  };
}

interface ProfileResponse {
  profile: UserProfileInput;
}

const level = (value: number) => {
  if (value >= 4) return "High";
  if (value >= 2) return "Medium";
  return "Low";
};

const prettyGoal = (goal: string) =>
  goal.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

export default async function SettingsPage() {
  const [me, profile] = await Promise.all([
    serverApi<MeResponse>("/api/auth/me").catch(() => null),
    serverApi<ProfileResponse>("/api/profile").catch(() => null),
  ]);

  return (
    <main className="mx-auto max-w-[1100px] space-y-5 px-4 py-6 md:px-6">
      <header className="rounded-3xl border border-brand-200 bg-white/90 p-5 shadow-panel">
        <p className="text-sm uppercase tracking-[0.2em] text-brand-600">
          Profile
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-4xl text-brand-900">
          Profile & preferences
        </h1>
      </header>

      {me ? (
        <section
          id="account-profile"
          className="rounded-2xl border border-brand-200 bg-white/90 p-5"
        >
          <h2 className="text-lg font-semibold text-brand-900">Profile</h2>
          <p className="mt-2 text-sm text-brand-800">Email: {me.user.email}</p>
          <p className="text-sm text-brand-800">
            Name: {me.user.displayName || "-"}
          </p>
          <p className="text-sm text-brand-800">
            Joined: {new Date(me.user.createdAt).toLocaleDateString()}
          </p>
          <p className="mt-1 text-sm text-brand-700">
            Update your public info and contact links so buyers can reach you.
          </p>
          <AccountProfileForm
            email={me.user.email}
            displayName={me.user.displayName}
            avatarUrl={me.user.avatarUrl}
            contactPhone={me.user.contactPhone}
            contactWhatsApp={me.user.contactWhatsApp}
            contactInstagram={me.user.contactInstagram}
            contactFacebook={me.user.contactFacebook}
          />
          <div className="mt-4 max-w-[220px]">
            <LogoutButton />
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-brand-200 bg-white/90 p-5">
          <h2 className="text-lg font-semibold text-brand-900">Sign in required</h2>
          <p className="mt-2 text-sm text-brand-700">
            Sign in to view your account details, saved preferences, and personal settings.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex rounded-xl border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
            >
              Create account
            </Link>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-brand-200 bg-white/90 p-5">
        <h2 className="text-lg font-semibold text-brand-900">
          Your search preferences
        </h2>
        {profile ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-brand-600">
                Goal
              </p>
              <p className="text-base font-semibold text-brand-900">
                {prettyGoal(profile.profile.goal)}
              </p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-brand-600">
                Budget
              </p>
              <p className="text-base font-semibold text-brand-900">
                {profile.profile.budgetMin} - {profile.profile.budgetMax} /
                month
              </p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-brand-600">
                Transport modes
              </p>
              <p className="text-base font-semibold text-brand-900">
                {profile.profile.mobilityModes.join(", ")}
              </p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-brand-600">
                Work location
              </p>
              <p className="text-base font-semibold text-brand-900">
                {profile.profile.workLat.toFixed(4)},{" "}
                {profile.profile.workLng.toFixed(4)}
              </p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-brand-600">
                Noise sensitivity
              </p>
              <p className="text-base font-semibold text-brand-900">
                {level(profile.profile.sensitivities.noise)}
              </p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-brand-600">
                Heat sensitivity
              </p>
              <p className="text-base font-semibold text-brand-900">
                {level(profile.profile.sensitivities.heat)}
              </p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.12em] text-brand-600">
                Allergy sensitivity
              </p>
              <p className="text-base font-semibold text-brand-900">
                {level(profile.profile.sensitivities.allergies)}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-brand-700">
            No preferences saved yet. Complete onboarding to personalize your
            recommendations.
          </p>
        )}
      </section>

      {me ? <LikedOffersPanel /> : null}
    </main>
  );
}

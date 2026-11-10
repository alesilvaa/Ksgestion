import { connection } from "next/server";
import { Suspense } from "react";
import { ProfileSettings } from "@/features/profile/profile-settings";

async function OnboardingContent() {
  await connection();
  return <ProfileSettings onboarding />;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Cargando tu perfil…</p>}>
      <OnboardingContent />
    </Suspense>
  );
}

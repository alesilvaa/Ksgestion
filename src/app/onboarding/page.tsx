import { connection } from "next/server";
import { Suspense } from "react";
import { PremiumLoader } from "@/components/layout/page-loading";
import { ProfileSettings } from "@/features/profile/profile-settings";

async function OnboardingContent() {
  await connection();
  return <ProfileSettings onboarding />;
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <PremiumLoader
          label="Cargando tu perfil…"
          detail="Estamos trayendo tu nombre y correo para que completes tu cuenta."
        />
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

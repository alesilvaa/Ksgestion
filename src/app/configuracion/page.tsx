import { connection } from "next/server";
import { Suspense } from "react";
import { PageLoading } from "@/components/layout/page-loading";
import { ProfileSettings } from "@/features/profile/profile-settings";

async function SettingsContent() {
  await connection();
  return <ProfileSettings />;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageLoading label="Cargando tu perfil…" />}>
      <SettingsContent />
    </Suspense>
  );
}

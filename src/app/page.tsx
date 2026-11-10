import { connection } from "next/server";
import { Suspense } from "react";
import { PageLoading } from "@/components/layout/page-loading";
import { HomeDashboard } from "@/features/dashboard/home-dashboard";

async function HomeContent() {
  await connection();
  return <HomeDashboard />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoading label="Cargando tu espacio…" />}>
      <HomeContent />
    </Suspense>
  );
}

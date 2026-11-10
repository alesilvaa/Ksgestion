import { connection } from "next/server";
import { Suspense } from "react";
import { PageLoading } from "@/components/layout/page-loading";
import { ReportsDashboard } from "@/features/reports/reports-dashboard";

async function ReportsContent() {
  await connection();
  return <ReportsDashboard />;
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<PageLoading label="Cargando reportes…" />}>
      <ReportsContent />
    </Suspense>
  );
}

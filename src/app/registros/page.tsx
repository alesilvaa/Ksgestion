import { connection } from "next/server";
import { Suspense } from "react";
import { PageLoading } from "@/components/layout/page-loading";
import { RecordsPage } from "@/features/records/records-page";

async function RecordsContent() {
  await connection();
  return <RecordsPage />;
}

export default function Page() {
  return (
    <Suspense fallback={<PageLoading label="Cargando registros…" />}>
      <RecordsContent />
    </Suspense>
  );
}

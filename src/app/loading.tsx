import { PremiumLoader } from "@/components/layout/page-loading";

export default function Loading() {
  return (
    <PremiumLoader
      label="Conectando con tu espacio…"
      detail="Validamos tu sesión y recuperamos tus registros antes de mostrar el sistema."
      fullScreen
    />
  );
}

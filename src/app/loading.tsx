export default function Loading() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Cargando contenido">
      <div className="h-8 w-48 rounded-lg bg-subtle" />
      <div className="h-40 rounded-[20px] border bg-white" />
    </div>
  );
}

import { LoaderCircle } from "lucide-react";

export function PageLoading({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-40 items-center justify-center gap-3 rounded-2xl border bg-white text-sm font-medium text-muted"
    >
      <LoaderCircle className="size-4 animate-spin text-brand" />
      {label}
    </div>
  );
}

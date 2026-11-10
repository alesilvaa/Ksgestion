import { cn } from "@/lib/utils";

export function PremiumLoader({
  label,
  detail = "Estamos validando tu acceso y cargando la información guardada.",
  fullScreen = false,
}: {
  label: string;
  detail?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center p-4 sm:p-6",
        fullScreen
          ? "premium-loader-screen min-h-[100svh]"
          : "min-h-[220px]",
      )}
    >
      <div className="w-full max-w-sm rounded-[22px] border border-[#dce6dc] bg-white p-5 shadow-[0_18px_48px_rgba(20,55,36,.12)] sm:p-6">
        <div className="flex items-center gap-4">
          <span className="premium-loader-mark grid size-12 shrink-0 place-items-center rounded-[15px] bg-[#173d2f] text-sm font-black tracking-[-.08em] text-white shadow-[0_7px_16px_rgba(23,61,47,.2)]">
            KS
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-[#173d2f]">
              {label}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-[#657267]">
              {detail}
            </p>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="mt-5 space-y-2.5 rounded-2xl border border-[#e8ede7] bg-[#f8faf7] p-3.5"
        >
          <div className="premium-loader-shimmer h-2.5 w-2/5 rounded-full" />
          <div className="premium-loader-shimmer h-2.5 w-4/5 rounded-full [animation-delay:120ms]" />
          <div className="premium-loader-shimmer h-2.5 w-3/5 rounded-full [animation-delay:240ms]" />
        </div>
      </div>
    </div>
  );
}

export function PageLoading({ label }: { label: string }) {
  return <PremiumLoader label={label} />;
}

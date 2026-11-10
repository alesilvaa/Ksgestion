"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  FileSpreadsheet,
  LayoutDashboard,
  Menu,
  Plus,
  Settings2,
  X,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Blobatar } from "@blobatar/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDemoApp } from "@/features/records/demo-app-provider";
import { createClient } from "@/lib/supabase/client";
import { appConfig } from "@/lib/app-config";

const navItems = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/registros", label: "Registros", icon: FileSpreadsheet },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/configuracion", label: "Configuración", icon: Settings2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setDialogOpen, dataMode, workspaceName, profile } = useDemoApp();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const visibleNavItems = profile?.isPlatformAdmin
    ? [
        ...navItems,
        { href: "/administracion/usuarios", label: "Superadmin", icon: ShieldCheck },
      ]
    : navItems;
  const current =
    visibleNavItems.find((item) => item.href === pathname)?.label ?? "Gestión";

  React.useEffect(() => {
    if (pathname === "/login") return;
    const supabase = createClient();
    void supabase.auth
      .getUser()
      .then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, [pathname]);

  React.useEffect(() => {
    if (!profile) return;
    if (!profile.onboardingCompleted && pathname !== "/onboarding") {
      router.replace("/onboarding");
    } else if (profile.onboardingCompleted && pathname === "/onboarding") {
      router.replace("/");
    }
  }, [pathname, profile, router]);

  if (pathname === "/login" || pathname.startsWith("/auth/")) return children;
  if (pathname === "/onboarding") {
    return (
      <main className="onboarding-shell min-h-screen px-4 py-6 sm:px-8 sm:py-10">
        <header className="mx-auto mb-8 flex max-w-2xl items-center justify-center gap-3">
          <span className="grid size-10 place-items-center rounded-[14px] bg-brand text-base font-extrabold text-white">
            KS
          </span>
          <span>
            <span className="block text-sm font-bold">
              {appConfig.productName}
            </span>
            <span className="block text-[11px] text-muted">
              {appConfig.productDescription}
            </span>
          </span>
        </header>
        {children}
      </main>
    );
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {mobileOpen && (
        <button
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[272px] -translate-x-full flex-col border-r border-white/10 bg-[#103425] p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0",
          mobileOpen && "translate-x-0",
        )}
      >
        <div className="flex h-16 items-center justify-between px-2">
          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={() => setMobileOpen(false)}
          >
            <span className="grid size-10 place-items-center rounded-[14px] bg-white text-base font-extrabold text-[#173d2f] shadow-[0_6px_16px_rgba(0,0,0,.15)]">
              KS
            </span>
            <span>
              <span className="block text-[15px] font-bold tracking-[-.02em] text-white">
                {appConfig.productName}
              </span>
              <span className="block text-[11px] font-medium text-white/55">
                {appConfig.productDescription}
              </span>
            </span>
          </Link>
          <button
            className="grid size-9 place-items-center rounded-lg text-white/75 hover:bg-white/10 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="mt-7 space-y-1" aria-label="Navegación principal">
          {visibleNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/65 transition hover:bg-white/[.08] hover:text-white",
                  active && "bg-white/[.12] font-semibold text-white",
                )}
              >
                <item.icon
                  className="size-[18px]"
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {profile?.isPlatformAdmin && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#8fceb2]/20 bg-[#8fceb2]/10 px-3 py-2.5 text-[#c6ead5]">
            <ShieldCheck className="size-4 shrink-0" />
            <span className="text-[11px] font-extrabold uppercase tracking-[.12em]">Superadministrador</span>
          </div>
        )}

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.06] p-3.5">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.09em] text-[#b8dbc5]">
            <span className="size-1.5 rounded-full bg-[#8fceb2]" />
            {dataMode === "supabase"
              ? "Espacio conectado"
              : dataMode === "loading"
                ? "Verificando acceso"
                : dataMode === "unassigned"
                  ? "Sin espacio asignado"
                  : "Error de conexión"}
          </div>
          <p className="text-xs leading-5 text-white/65">
            {dataMode === "supabase"
              ? `${workspaceName ?? "Tu espacio"} · Tus datos se guardan de forma segura.`
              : dataMode === "loading"
                ? "Verificando tu espacio y permisos…"
                : dataMode === "unassigned"
                  ? "Tu usuario todavía no pertenece a un espacio."
                  : "No se pudieron cargar los datos del espacio."}
          </p>
        </div>
        <button
          className="mt-3 flex items-center gap-3 rounded-xl p-2.5 text-left text-white hover:bg-white/[.08]"
          onClick={signOut}
          title="Cerrar sesión"
        >
          <span className="size-8 shrink-0 overflow-hidden rounded-xl bg-white/10">
            {profile ? (
              <Blobatar
                name={profile.avatarSeed}
                size={32}
                background="squircle"
                title={profile.displayName}
              />
            ) : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold">
              {profile?.displayName ?? userEmail ?? "Sesión activa"}
            </span>
            <span className="block truncate text-[11px] text-white/55">
              Cerrar sesión
            </span>
          </span>
          <LogOut className="size-4 text-white/55" />
        </button>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-[76px] items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <button
            aria-label="Abrir menú"
            className="grid size-10 place-items-center rounded-xl border bg-white lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-muted">
              Administración
            </p>
            <h1 className="truncate text-lg font-bold tracking-[-.02em]">
              {current}
            </h1>
          </div>
          {profile && (
            <Link
              href="/configuracion"
              aria-label={`Abrir perfil de ${profile.displayName}`}
              title="Tu perfil"
              className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white transition hover:border-brand/40 hover:shadow-sm sm:w-auto sm:gap-2 sm:px-2"
            >
              <Blobatar
                name={profile.avatarSeed}
                size={30}
                background="squircle"
                title={profile.displayName}
              />
              <span className="hidden max-w-28 truncate text-xs font-semibold sm:block">
                {profile.displayName}
              </span>
            </Link>
          )}
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={dataMode !== "supabase"}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nuevo registro</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </header>
        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-7 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}

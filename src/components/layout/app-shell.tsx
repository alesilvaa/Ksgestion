"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  FileSpreadsheet,
  LoaderCircle,
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
          "fixed inset-y-0 left-0 z-40 flex w-[272px] -translate-x-full flex-col overflow-y-auto border-r border-white/10 bg-[radial-gradient(ellipse_at_top_left,rgba(74,117,81,.28),transparent_48%),linear-gradient(180deg,#103425,#0c2a1e)] p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0",
          mobileOpen && "translate-x-0",
        )}
      >
        <div className="flex min-h-16 items-center justify-between border-b border-white/10 px-2 pb-4">
          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={() => setMobileOpen(false)}
          >
            <span className="grid size-11 place-items-center rounded-[15px] border border-[#ddce9b] bg-[#f4f2e7] text-base font-black tracking-[-.08em] text-[#173d2f] shadow-[0_7px_18px_rgba(0,0,0,.2)]">
              KS
            </span>
            <span>
              <span className="block text-[15px] font-extrabold tracking-[-.03em] text-white">
                {appConfig.productName}
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold text-[#d4c27e]">
                {appConfig.productDescription}
              </span>
            </span>
          </Link>
          <button
            aria-label="Cerrar menú"
            className="grid size-9 place-items-center rounded-lg text-white/75 hover:bg-white/10 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="mt-5 space-y-1.5" aria-label="Navegación principal">
          <p className="mb-2 px-3 text-[9px] font-extrabold uppercase tracking-[.2em] text-white/40">
            Menú principal
          </p>
          {visibleNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group relative flex h-11 items-center gap-3 overflow-hidden rounded-xl px-3 text-[13px] font-semibold text-white/65 transition duration-200 hover:bg-white/[.08] hover:text-white",
                  active &&
                    "border border-[#d9c77f]/60 bg-[linear-gradient(100deg,#f3f0e3,#e5eee5)] font-extrabold text-[#173d2f] shadow-[0_5px_16px_rgba(0,0,0,.14)] hover:bg-[linear-gradient(100deg,#f3f0e3,#e5eee5)] hover:text-[#173d2f]",
                )}
              >
                {active && (
                  <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[#a78736]" />
                )}
                <item.icon
                  className={cn(
                    "size-[18px] transition-colors",
                    active ? "text-[#9b7924]" : "text-white/55 group-hover:text-[#d7c47f]",
                  )}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {item.label}
                {active && (
                  <span className="ml-auto size-1.5 rounded-full bg-[#b89b53] shadow-[0_0_0_3px_rgba(184,155,83,.15)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {profile?.isPlatformAdmin && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#d7c47f]/35 bg-[#d7c47f]/10 px-3 py-2.5 text-[#f0dfaa]">
            <ShieldCheck className="size-4 shrink-0" />
            <span className="text-[10px] font-extrabold uppercase tracking-[.1em]">Superadministrador</span>
          </div>
        )}

        <section className="mt-auto rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.035))] p-3.5 shadow-[0_12px_28px_rgba(0,0,0,.12)]">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#d7c47f]/25 bg-[#d7c47f]/10 text-[#e5d28e]">
              <Building2 className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#d9c77f]">
                {dataMode === "loading" ? "Conectando al espacio" : "Tu espacio"}
              </p>
              <p className="mt-0.5 truncate text-xs font-bold text-white">
                {workspaceName ?? "Espacio de gestión"}
              </p>
            </div>
          </div>
          <div
            className="mt-3 border-t border-white/10 pt-3"
            role={dataMode === "loading" ? "status" : undefined}
            aria-live={dataMode === "loading" ? "polite" : undefined}
          >
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-white/75">
            {dataMode === "loading" ? (
              <LoaderCircle className="size-3.5 animate-spin text-[#e0c878]" />
            ) : (
              <span className="size-1.5 rounded-full bg-[#a8c995] shadow-[0_0_0_3px_rgba(168,201,149,.12)]" />
            )}
            {dataMode === "supabase"
              ? "Conexión segura"
              : dataMode === "loading"
                ? "Cargando tus datos"
                : dataMode === "unassigned"
                  ? "Acceso pendiente"
                  : "Error de conexión"}
          </div>
          <p className="text-[11px] leading-[1.65] text-white/65">
            {dataMode === "supabase"
              ? "Tus registros están guardados y sincronizados."
              : dataMode === "loading"
                ? "Validamos tu sesión y recuperamos los registros guardados."
                : dataMode === "unassigned"
                  ? "Tu usuario todavía no pertenece a un espacio."
                  : "No se pudieron cargar los datos del espacio."}
          </p>
          </div>
        </section>
        <button
          className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] p-2.5 text-left text-white transition hover:border-white/20 hover:bg-white/[.09]"
          onClick={signOut}
          title="Cerrar sesión"
        >
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[#d7c47f]/35 bg-[#f1f2e8] shadow-sm">
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
            <span className="block truncate text-xs font-extrabold">
              {profile?.displayName ?? userEmail ?? "Sesión activa"}
            </span>
            <span className="mt-0.5 block truncate text-[10px] font-semibold text-white/55">
              {profile?.isPlatformAdmin ? "Superadministrador" : "Mi cuenta · Cerrar sesión"}
            </span>
          </span>
          <LogOut className="size-4 text-[#d7c47f]" />
        </button>

        <footer className="mt-3 flex items-center gap-2.5 border-t border-white/10 px-1 pt-3 pb-1">
          <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-white p-1.5 shadow-sm">
            <Image
              src="/brand/manageopy-mark.png"
              alt=""
              width={26}
              height={26}
              className="size-full object-contain"
            />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[8px] font-extrabold uppercase tracking-[.18em] text-white/45">
              Desarrollado por
            </span>
            <span className="mt-0.5 block truncate text-xs font-extrabold tracking-[-.02em] text-white">
              {appConfig.developerName} <span className="text-[#d7c47f]">↗</span>
            </span>
          </span>
          <span className="ml-auto rounded-md border border-white/10 bg-white/[.07] px-1.5 py-1 text-[9px] font-bold text-white/60">
            v{appConfig.version}
          </span>
        </footer>
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

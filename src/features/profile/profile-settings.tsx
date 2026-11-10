"use client";

import { Blobatar } from "@blobatar/react";
import {
  Check,
  Dices,
  KeyRound,
  Plus,
  ShieldCheck,
  Sparkles,
  Tags,
  UserRound,
  Workflow,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { useDemoApp } from "@/features/records/demo-app-provider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function createAvatarOptions(
  profileId: string,
  currentSeed: string,
  round = "initial",
) {
  return Array.from(
    new Set([
      currentSeed,
      ...Array.from(
        { length: 7 },
        (_, index) => `${profileId}-avatar-${round}-${index + 1}`,
      ),
    ]),
  );
}

export function ProfileSettings({
  onboarding = false,
}: {
  onboarding?: boolean;
}) {
  const { profile, refreshProfile } = useDemoApp();

  if (!profile) {
    return <p className="text-sm text-muted">Cargando tu perfil…</p>;
  }

  return (
    <ProfileForm
      profile={profile}
      refreshProfile={refreshProfile}
      onboarding={onboarding}
    />
  );
}

function ProfileForm({
  profile,
  refreshProfile,
  onboarding,
}: {
  profile: NonNullable<ReturnType<typeof useDemoApp>["profile"]>;
  refreshProfile: () => Promise<void>;
  onboarding: boolean;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = React.useState(profile.displayName);
  const [avatarSeed, setAvatarSeed] = React.useState(
    onboarding ? "" : profile.avatarSeed,
  );
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const [avatarOptions, setAvatarOptions] = React.useState(() =>
    createAvatarOptions(profile.id, profile.avatarSeed),
  );
  const [avatarAnimationKey, setAvatarAnimationKey] = React.useState(0);

  function chooseAvatar(seed: string) {
    setAvatarSeed(seed);
    setAvatarAnimationKey((key) => key + 1);
  }

  function showMoreAvatars() {
    setAvatarOptions(
      createAvatarOptions(profile.id, profile.avatarSeed, crypto.randomUUID()),
    );
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!displayName.trim() || !avatarSeed) return;
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await createClient()
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          avatar_seed: avatarSeed,
          updated_at: new Date().toISOString(),
          ...(onboarding ? { onboarding_completed: true } : {}),
        })
        .eq("id", profile.id);

      if (error) {
        setMessage("No se pudo guardar tu perfil. Volvé a intentar.");
      } else {
        await refreshProfile();
        if (onboarding) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage("Perfil actualizado correctamente.");
        }
      }
    } catch {
      setMessage("No se pudo guardar tu perfil. Volvé a intentar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={
        onboarding ? "mx-auto max-w-2xl animate-enter" : "animate-enter"
      }
    >
      {onboarding ? (
        <div className="mb-4 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand">
            Primera vez
          </p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-[-.045em] text-[#173d2f]">
            ¡Bienvenido, {profile.displayName}!
          </h1>
          <p className="mt-2 text-sm text-muted">
            Elegí cómo querés aparecer. Esto se guarda en tu cuenta y vas a
            encontrarlo igual cuando vuelvas.
          </p>
        </div>
      ) : (
        <div className="border-b pb-6">
          <h2 className="text-3xl font-bold tracking-[-.04em]">
            Configuración
          </h2>
          <p className="mt-2 text-sm text-muted">
            Administrá tu identidad y revisá la seguridad de tu cuenta.
          </p>
        </div>
      )}

      <div
        className={`mt-4 grid gap-4 ${onboarding ? "" : "xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.75fr)]"}`}
      >
        <form
          onSubmit={saveProfile}
          className={cn(
            "rounded-[20px] border bg-white",
            onboarding ? "p-4 sm:p-5" : "p-5 sm:p-7",
          )}
        >
          <div className={cn("flex items-center gap-3", onboarding && "hidden")}>
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <UserRound className="size-5" />
            </span>
            <div>
              <h3 className="font-bold">
                {onboarding ? "Personalizá tu perfil" : "Tu perfil"}
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                El nombre inicial se obtiene de tu cuenta de Google.
              </p>
            </div>
          </div>

          <div
            className={cn(
              "mt-3 grid gap-3",
              onboarding
                ? "md:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] md:items-start md:gap-3"
                : "mt-4",
            )}
          >
          <div className={cn(
            "rounded-[18px] border border-[#234d38] bg-[linear-gradient(120deg,#173d2f,#24543b)] p-3 shadow-[0_8px_20px_rgba(23,61,47,.16)] sm:p-3.5",
            onboarding && "md:col-start-1 md:row-start-1",
          )}>
            <div className="flex items-center gap-3 text-left">
              <div className="avatar-preview-halo grid size-[72px] shrink-0 place-items-center rounded-[22px] border border-[#d7c47f] bg-white shadow-[0_6px_18px_rgba(0,0,0,.18)]">
                {avatarSeed ? (
                  <span key={avatarAnimationKey} className="avatar-preview-pop">
                    <Blobatar
                      name={avatarSeed}
                      size={62}
                      background="squircle"
                      title=""
                    />
                  </span>
                ) : (
                  <span className="grid size-[62px] place-items-center rounded-[18px] bg-[#e4eee6] text-[#173d2f]">
                    <UserRound className="size-7" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[.15em] text-[#e0c878]">
                  <Sparkles className="size-3" /> Tu perfil
                </span>
                <p className="mt-1 truncate text-base font-extrabold tracking-[-.025em] text-white">
                  {displayName.trim() || "Tu nombre"}
                </p>
                <p className="mt-0.5 text-[11px] text-[#d1dfd4]">
                  {avatarSeed
                    ? "Así te verán en el sistema."
                    : "Elegí un avatar para continuar."}
                </p>
              </div>
            </div>
          </div>

          <div className={cn(
            "rounded-[18px] border border-[#cbd8c8] bg-[#eef3eb] p-3 sm:p-4",
            onboarding && "md:col-start-2 md:row-span-3 md:row-start-1",
          )}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[.16em] text-[#765e25]">
                  <span className="size-1.5 rounded-full bg-[#a88327]" />
                  Personalizá tu cuenta
                </p>
                <Label className="mt-0.5 block text-sm font-extrabold tracking-[-.02em] text-[#173d2f]">
                  Elegí tu avatar
                </Label>
                <p className="mt-0.5 text-[11px] text-[#536357]">
                  Seleccioná un estilo o descubrí otros.
                </p>
              </div>
              <button
                type="button"
                onClick={showMoreAvatars}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#bdcbb8] bg-white px-2.5 text-[11px] font-extrabold text-[#244b33] shadow-sm transition hover:-translate-y-0.5 hover:border-[#9b7924] hover:shadow-[0_6px_16px_rgba(23,61,47,.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <Dices className="size-4" />
                Ver otros estilos
              </button>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {avatarOptions.map((seed, index) => {
                const selected = avatarSeed === seed;
                return (
                  <button
                    key={seed}
                    type="button"
                    aria-label={`Avatar ${index + 1}${selected ? ", seleccionado" : ", seleccionar"}`}
                    aria-pressed={selected}
                    onClick={() => chooseAvatar(seed)}
                    className={cn(
                      "avatar-option group relative flex min-h-[76px] flex-col items-center justify-center gap-0.5 rounded-xl border bg-white p-1.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(23,61,47,.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                      selected
                        ? "border-[#9b7924] bg-[#fbf8ec] shadow-[0_0_0_2px_rgba(155,121,36,.2),0_6px_14px_rgba(23,61,47,.1)]"
                        : "border-[#cbd8c8] hover:border-[#527859]",
                    )}
                  >
                    <Blobatar
                      name={seed}
                      size={48}
                      background="squircle"
                      title=""
                    />
                    <span className={cn("text-[8px] font-extrabold tracking-[.05em]", selected ? "text-[#765e25]" : "text-[#536357]")}>
                      ESTILO {String(index + 1).padStart(2, "0")}
                    </span>
                    {selected && (
                      <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-[#173d2f] text-white shadow-sm ring-1 ring-[#d7c47f]">
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-[#536357]">
              {onboarding
                ? "Generados con Blobatar, sin subir fotos personales."
                : "Los avatares se generan localmente con Blobatar; no subimos una foto personal. Tu elección queda guardada en tu cuenta."}
            </p>
          </div>

          <div className={cn(
            "grid gap-4 sm:grid-cols-2",
            onboarding
              ? "md:col-start-1 md:row-start-2 md:grid-cols-1"
              : "mt-5",
          )}>
            <div>
              <Label htmlFor="display-name">Nombre visible</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="profile-email">Correo</Label>
              <Input id="profile-email" value={profile.email} disabled />
            </div>
          </div>

          <div className={cn(
            "flex flex-wrap items-center gap-3",
            onboarding
              ? "md:col-start-1 md:row-start-3"
              : "mt-6",
          )}>
            <Button
              type="submit"
              disabled={saving || !displayName.trim() || !avatarSeed}
            >
              {saving
                ? "Guardando…"
                : onboarding
                  ? "Continuar al sistema"
                  : "Guardar perfil"}
            </Button>
            {message && (
              <p role="status" className="text-xs text-muted">
                {message}
              </p>
            )}
          </div>
          </div>
        </form>

        {!onboarding && (
          <aside className="space-y-4">
            <section className="rounded-[20px] border bg-white p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold">Permisos activos</h3>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {profile.isPlatformAdmin
                      ? "Superadministrador de la plataforma"
                      : "Acceso limitado al espacio asignado"}
                  </p>
                </div>
              </div>
              {profile.isPlatformAdmin && (
                <span className="mt-4 inline-flex rounded-full bg-brand-soft px-3 py-1 text-[10px] font-bold tracking-[.08em] text-brand">
                  SUPERADMIN
                </span>
              )}
            </section>
            <section className="rounded-[20px] border bg-white p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-subtle text-foreground">
                  <KeyRound className="size-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold">Inicio de sesión seguro</h3>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Google administra tu acceso. La aplicación no almacena tu
                    contraseña de Google y Supabase protege cada sesión.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        )}
      </div>
      {!onboarding && <CategorySettings />}
      {!onboarding && <MovementTypeSettings />}
    </div>
  );
}

function MovementTypeSettings() {
  const { movementTypes, createMovementType, dataMode } = useDemoApp();
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#4b7955");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await createMovementType({ name, color });
      setName("");
      setMessage(
        "Tipo agregado. Ya aparece como columna y opción al cargar movimientos.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo crear el tipo.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 rounded-[22px] border border-[#dce6dc] bg-[#f8faf6] p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#173d2f] text-[#e0c982]">
          <Workflow className="size-5" />
        </span>
        <div>
          <h3 className="font-bold text-[#173d2f]">Tipos de movimiento</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">
            Agregá columnas a tu libro mensual. Cada tipo tendrá su propio
            color, selector y total; los registros existentes conservan su
            clasificación.
          </p>
        </div>
      </div>
      <form
        onSubmit={(event) => void submit(event)}
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="w-full max-w-md">
          <Label htmlFor="new-movement-type">Nombre del tipo</Label>
          <Input
            id="new-movement-type"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="Ej.: Anticipos, Reembolsos"
            required
            disabled={dataMode !== "supabase"}
          />
        </div>
        <div>
          <Label htmlFor="movement-type-color">Color</Label>
          <input
            id="movement-type-color"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-11 w-16 cursor-pointer rounded-xl border bg-white p-1.5"
            aria-label="Elegir color del tipo"
          />
        </div>
        <Button
          type="submit"
          disabled={saving || !name.trim() || dataMode !== "supabase"}
        >
          <Plus className="size-4" />
          {saving ? "Agregando…" : "Agregar tipo"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-danger">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-xs font-medium text-brand">
          {message}
        </p>
      )}
      <ul className="mt-5 flex flex-wrap gap-2">
        {movementTypes.map((type) => (
          <li
            key={type.id}
            className="inline-flex items-center gap-2 rounded-full border border-[#e0e7e2] bg-white px-3 py-2 text-xs font-bold text-[#344b3c]"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: type.color }}
            />
            {type.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CategorySettings() {
  const { categories, createCategory, dataMode } = useDemoApp();
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await createCategory(name);
      setName("");
      setMessage("Categoría creada. Ya podés asignarla a un registro.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo crear la categoría.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-[20px] border bg-white p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
          <Tags className="size-5" />
        </span>
        <div>
          <h3 className="font-bold">Categorías</h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            Organizá los movimientos de este espacio. Las categorías creadas
            aparecerán al cargar y editar registros.
          </p>
        </div>
      </div>
      <form
        onSubmit={(event) => void submit(event)}
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="w-full max-w-md">
          <Label htmlFor="new-category">Nueva categoría</Label>
          <Input
            id="new-category"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="Ej.: Servicios, Alquiler"
            required
            disabled={dataMode !== "supabase"}
          />
        </div>
        <Button
          type="submit"
          disabled={saving || !name.trim() || dataMode !== "supabase"}
        >
          <Plus className="size-4" />
          {saving ? "Creando…" : "Crear categoría"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-danger">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-xs font-medium text-brand">
          {message}
        </p>
      )}
      {categories.length ? (
        <ul className="mt-5 flex flex-wrap gap-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="rounded-full border bg-subtle px-3 py-1.5 text-xs font-semibold"
            >
              {category.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-muted">
          Todavía no hay categorías en este espacio.
        </p>
      )}
    </section>
  );
}

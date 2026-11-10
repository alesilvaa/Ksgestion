"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Clock3, Search, ShieldCheck, UserCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoApp } from "@/features/records/demo-app-provider";
import { createClient } from "@/lib/supabase/client";

type Workspace = { id: string; name: string };
type PlatformUser = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  workspace_id: string | null;
  workspace_name: string | null;
  workspace_role: "admin" | "operator" | null;
  is_platform_admin: boolean;
  last_sign_in_at: string | null;
  is_suspended: boolean;
};

export function UserManagement() {
  const { profile } = useDemoApp();
  const router = useRouter();
  const [users, setUsers] = React.useState<PlatformUser[]>([]);
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [selected, setSelected] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [activeSince, setActiveSince] = React.useState(0);

  React.useEffect(() => {
    if (profile && !profile.isPlatformAdmin) router.replace("/");
  }, [profile, router]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const [userResult, workspaceResult] = await Promise.all([
      supabase.rpc("list_platform_users"),
      supabase.from("workspaces").select("id, name").order("name"),
    ]);
    if (userResult.error || workspaceResult.error) {
      setError("No se pudo cargar la administración. Revisá que la migración esté aplicada y tu usuario sea superadmin.");
      setLoading(false);
      return;
    }
    const rows = (userResult.data ?? []) as PlatformUser[];
    const spaces = (workspaceResult.data ?? []) as Workspace[];
    setActiveSince(Date.now() - 30 * 24 * 60 * 60 * 1000);
    setUsers(rows);
    setWorkspaces(spaces);
    setSelected((current) => {
      const next = { ...current };
      for (const user of rows) {
        if (!(user.user_id in next)) {
          next[user.user_id] = user.workspace_id ?? spaces[0]?.id ?? "";
        }
      }
      return next;
    });
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (!profile?.isPlatformAdmin) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, profile?.isPlatformAdmin]);

  async function assign(user: PlatformUser) {
    const workspaceId = selected[user.user_id];
    if (!workspaceId) return;
    setSaving(user.user_id);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    const { data: updated, error: updateError } = await supabase
      .from("workspace_members")
      .update({ workspace_id: workspaceId })
      .eq("user_id", user.user_id)
      .select("user_id");
    const saveError = updateError
      ? updateError
      : updated?.length
        ? null
        : (
            await supabase.from("workspace_members").insert({
              workspace_id: workspaceId,
              user_id: user.user_id,
              role: user.workspace_role ?? "operator",
            })
          ).error;
    if (saveError) {
      setError("No se pudo habilitar al usuario en ese espacio.");
    } else {
      setNotice(`${user.email ?? "Usuario"} ya tiene acceso al espacio.`);
      await load();
    }
    setSaving(null);
  }

  const recentlyActive = users.filter(
    (user) => user.last_sign_in_at && Date.parse(user.last_sign_in_at) >= activeSince,
  ).length;
  const assigned = users.filter((user) => user.workspace_id).length;
  const filteredUsers = users.filter((user) => {
    const term = search.trim().toLocaleLowerCase();
    const matchesSearch =
      !term ||
      user.email?.toLocaleLowerCase().includes(term) ||
      user.display_name?.toLocaleLowerCase().includes(term);
    const matchesFilter =
      filter === "all" ||
      (filter === "pending" && !user.workspace_id) ||
      (filter === "recent" && Boolean(user.last_sign_in_at && Date.parse(user.last_sign_in_at) >= activeSince)) ||
      (filter === "suspended" && user.is_suspended);
    return matchesSearch && matchesFilter;
  });

  if (!profile?.isPlatformAdmin) {
    return <p className="text-sm text-muted">Verificando permisos…</p>;
  }

  return (
    <div className="animate-enter space-y-6">
      <header className="border-b pb-6">
        <p className="text-xs font-extrabold uppercase tracking-[.14em] text-brand">Superadministración</p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-.04em]">Usuarios y accesos</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Revisá las cuentas que iniciaron sesión y asignales un espacio para que puedan usar el sistema.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumen de usuarios">
        <MetricCard icon={UsersRound} label="Cuentas registradas" value={users.length} detail="Usuarios que ingresaron alguna vez" />
        <MetricCard icon={UserCheck} label="Con acceso" value={assigned} detail="Asignados a un espacio" />
        <MetricCard icon={Clock3} label="Ingreso en 30 días" value={recentlyActive} detail="Actividad reciente, no presencia en línea" />
      </section>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-brand">{notice}</p>}

      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="font-bold">Cuentas registradas</h3>
            <p className="mt-1 text-xs text-muted">{users.length} usuario{users.length === 1 ? "" : "s"} en Supabase Auth</p>
          </div>
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>Actualizar</Button>
        </div>
        {!loading && users.length > 0 && (
          <div className="flex flex-col gap-3 border-b bg-subtle/60 p-4 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Buscar por nombre o correo</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar nombre o correo"
                className="h-10 w-full rounded-xl border bg-white pl-9 pr-3 text-sm outline-none focus:border-brand"
              />
            </label>
            <label>
              <span className="sr-only">Filtrar usuarios</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 w-full rounded-xl border bg-white px-3 text-sm sm:w-52">
                <option value="all">Todos los usuarios</option>
                <option value="pending">Pendientes de espacio</option>
                <option value="recent">Ingreso en últimos 30 días</option>
                <option value="suspended">Cuentas suspendidas</option>
              </select>
            </label>
          </div>
        )}
        {loading ? (
          <p className="p-6 text-sm text-muted">Cargando usuarios…</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-sm text-muted">Todavía no hay usuarios registrados.</p>
        ) : filteredUsers.length === 0 ? (
          <p className="p-6 text-sm text-muted">No hay cuentas que coincidan con esa búsqueda.</p>
        ) : (
          <ul className="divide-y">
            {filteredUsers.map((user) => (
              <li key={user.user_id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{user.display_name || "Sin nombre"}</p>
                  <p className="mt-1 truncate text-xs text-muted">{user.email || user.user_id}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {user.is_platform_admin && <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand"><ShieldCheck className="size-3" /> Superadmin</span>}
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${user.is_suspended ? "bg-red-50 text-danger" : "bg-emerald-50 text-brand"}`}>
                      {user.is_suspended ? "Suspendida" : "Cuenta activa"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="sr-only" htmlFor={`space-${user.user_id}`}>Espacio para {user.email}</label>
                  <select
                    id={`space-${user.user_id}`}
                    className="h-10 min-w-52 rounded-xl border bg-white px-3 text-sm"
                    value={selected[user.user_id] ?? ""}
                    onChange={(event) => setSelected((current) => ({ ...current, [user.user_id]: event.target.value }))}
                    disabled={!workspaces.length}
                  >
                    <option value="">Sin espacio asignado</option>
                    {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
                  </select>
                  <Button onClick={() => void assign(user)} disabled={!selected[user.user_id] || saving === user.user_id}>
                    {saving === user.user_id ? "Guardando…" : user.workspace_id ? "Guardar acceso" : "Habilitar usuario"}
                  </Button>
                </div>
                <p className="text-xs text-muted lg:w-44 lg:text-right">
                  <span className="block">{user.workspace_name ? `${user.workspace_name} · ${user.workspace_role === "admin" ? "Administrador" : "Operador"}` : "Sin espacio asignado"}</span>
                  <span className="mt-1 block">{user.last_sign_in_at ? `Último ingreso: ${formatLastSignIn(user.last_sign_in_at)}` : "Todavía no inició sesión"}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof UsersRound;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border bg-white p-5">
      <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="size-5" /></span>
      <p className="mt-4 text-3xl font-extrabold tracking-[-.04em]">{value}</p>
      <h3 className="mt-1 text-sm font-bold">{label}</h3>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </article>
  );
}

function formatLastSignIn(value: string) {
  return new Intl.DateTimeFormat("es-PY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Asuncion",
  }).format(new Date(value));
}

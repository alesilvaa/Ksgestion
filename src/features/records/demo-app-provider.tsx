"use client";

import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { NewRecordDialog } from "./new-record-dialog";
import type { MovementType, RecordItem, RecordMutation } from "./types";

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  avatarSeed: string;
  isPlatformAdmin: boolean;
  onboardingCompleted: boolean;
};

type DataMode = "loading" | "supabase" | "unassigned" | "error";

type AppContextValue = {
  records: RecordItem[];
  addRecord: (record: RecordMutation) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  dataMode: DataMode;
  workspaceName: string | null;
  categories: Array<{ id: string; name: string }>;
  movementTypes: MovementType[];
  profile: UserProfile | null;
  refreshProfile: () => Promise<void>;
  importWorkbook: (input: WorkbookImportInput) => Promise<number>;
  updateRecordDate: (id: string, date: string) => Promise<void>;
  updateRecord: (id: string, record: RecordMutation) => Promise<void>;
  createCategory: (name: string) => Promise<void>;
  createMovementType: (input: { name: string; color: string }) => Promise<void>;
};

export type WorkbookImportRow = {
  record_date: string | null;
  description: string;
  record_group: "monthly_transfer" | "other_payment";
  amount_pyg: string;
  category_id: string | null;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  source_sheet: string;
  source_row: number;
  source_raw: Record<string, string>;
};

export type WorkbookImportInput = {
  originalFilename: string;
  fileFingerprint: string;
  sheetName: string;
  rows: WorkbookImportRow[];
};

type DbRecord = {
  id: string;
  record_date: string | null;
  source_sheet: string | null;
  description: string;
  record_group: "monthly_transfer" | "other_payment";
  movement_type_id: string;
  movement_types: { name: string; code: string; color: string } | null;
  amount_pyg: number;
  reference: string | null;
  notes: string | null;
  payment_method: string | null;
  categories: { name: string } | null;
};

const AppContext = React.createContext<AppContextValue | null>(null);

export function DemoAppProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = React.useState<RecordItem[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dataMode, setDataMode] = React.useState<DataMode>("loading");
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = React.useState<string | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [categories, setCategories] = React.useState<
    Array<{ id: string; name: string }>
  >([]);
  const [movementTypes, setMovementTypes] = React.useState<MovementType[]>([]);

  const refreshProfile = React.useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    const [{ data: profileData }, { data: adminData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, avatar_seed, onboarding_completed")
        .eq("id", user.id)
        .single(),
      supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    if (profileData) {
      setProfile({
        id: user.id,
        email: user.email ?? "",
        displayName:
          profileData.display_name ||
          user.user_metadata.full_name ||
          user.email?.split("@")[0] ||
          "Usuario",
        avatarSeed: profileData.avatar_seed,
        isPlatformAdmin: Boolean(adminData),
        onboardingCompleted: profileData.onboarding_completed,
      });
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    let loadVersion = 0;
    const supabase = createClient();

    async function loadUser(user: User | null) {
      const version = ++loadVersion;
      setProfile(null);
      setWorkspaceId(null);
      setWorkspaceName(null);
      setUserId(user?.id ?? null);
      setRecords([]);
      setCategories([]);
      setMovementTypes([]);
      setDataMode("loading");
      if (!user) return;

      setUserId(user.id);
      const [
        { data: profileData },
        { data: adminData },
        { data: membership, error: membershipError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, avatar_seed, onboarding_completed")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("platform_admins")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("workspace_members")
          .select("workspace_id, workspaces(name)")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle(),
      ]);

      if (!active || version !== loadVersion) return;
      if (profileData) {
        setProfile({
          id: user.id,
          email: user.email ?? "",
          displayName:
            profileData.display_name ||
            user.user_metadata.full_name ||
            user.email?.split("@")[0] ||
            "Usuario",
          avatarSeed: profileData.avatar_seed,
          isPlatformAdmin: Boolean(adminData),
          onboardingCompleted: profileData.onboarding_completed,
        });
      }

      if (membershipError || !membership) {
        setDataMode(membershipError ? "error" : "unassigned");
        return;
      }

      const selectedWorkspaceId = membership.workspace_id as string;
      const workspace = membership.workspaces as unknown as {
        name: string;
      } | null;
      setWorkspaceId(selectedWorkspaceId);
      setWorkspaceName(workspace?.name ?? "Mi espacio");
      const [
        { data: rows, error: recordsError },
        { data: categoryRows },
        { data: movementTypeRows, error: movementTypeError },
      ] = await Promise.all([
        supabase
          .from("records")
          .select(
            "id, record_date, source_sheet, description, record_group, movement_type_id, movement_types(name, code, color), amount_pyg, reference, notes, payment_method, categories(name)",
          )
          .eq("workspace_id", selectedWorkspaceId)
          .eq("is_breakdown", false)
          .order("record_date", { ascending: false }),
        supabase
          .from("categories")
          .select("id, name")
          .eq("workspace_id", selectedWorkspaceId)
          .eq("is_active", true),
        supabase
          .from("movement_types")
          .select("id, name, code, color, position")
          .eq("workspace_id", selectedWorkspaceId)
          .eq("is_active", true)
          .order("position", { ascending: true }),
      ]);

      if (!active || version !== loadVersion) return;
      setCategories(categoryRows ?? []);
      if (movementTypeError) {
        setDataMode("error");
        return;
      }
      setMovementTypes((movementTypeRows ?? []) as MovementType[]);
      if (recordsError) {
        setDataMode("error");
        return;
      }
      setRecords((rows as unknown as DbRecord[]).map(mapDbRecord));
      setDataMode("supabase");
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user ?? null;
        // Leave Supabase's auth callback before starting follow-up queries.
        window.setTimeout(() => {
          if (active) void loadUser(user);
        }, 0);
      },
    );
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function addRecord(record: RecordMutation) {
    if (dataMode !== "supabase" || !workspaceId || !userId)
      throw new Error("Tu usuario todavía no tiene un espacio habilitado.");
    const supabase = createClient();
    const categoryId =
      categories.find((category) => category.name === record.category)?.id ??
      null;
    const movementType = movementTypes.find(
      (type) => type.id === record.movementTypeId,
    );
    if (!movementType)
      throw new Error("Elegí un tipo de movimiento disponible.");
    const { data, error } = await supabase
      .from("records")
      .insert({
        workspace_id: workspaceId,
        movement_type_id: movementType.id,
        category_id: categoryId,
        record_date: record.date,
        description: record.description,
        record_group:
          movementType.code === "monthly_transfer"
            ? "monthly_transfer"
            : "other_payment",
        amount_pyg: record.amount,
        payment_method: record.method || null,
        reference: record.reference || null,
        notes: record.notes || null,
        created_by: userId,
      })
      .select(
        "id, record_date, source_sheet, description, record_group, movement_type_id, movement_types(name, code, color), amount_pyg, reference, notes, payment_method, categories(name)",
      )
      .single();
    if (error) throw new Error(error.message);
    setRecords((current) => [
      mapDbRecord(data as unknown as DbRecord),
      ...current,
    ]);
  }

  async function importWorkbook(input: WorkbookImportInput) {
    if (dataMode !== "supabase" || !workspaceId || !userId) {
      throw new Error("Tu usuario todavía no tiene un espacio habilitado.");
    }
    const supabase = createClient();
    const { data: importResult, error } = await supabase.rpc(
      "import_records_batch",
      {
        target_workspace_id: workspaceId,
        original_filename: input.originalFilename,
        file_fingerprint: input.fileFingerprint,
        sheet_name: input.sheetName,
        rows: input.rows,
      },
    );
    if (error) throw new Error(error.message);

    const [{ data: rows, error: recordsError }, { data: categoryRows }] =
      await Promise.all([
        supabase
          .from("records")
          .select(
            "id, record_date, source_sheet, description, record_group, movement_type_id, movement_types(name, code, color), amount_pyg, reference, notes, payment_method, categories(name)",
          )
          .eq("workspace_id", workspaceId)
          .eq("is_breakdown", false)
          .order("record_date", { ascending: false }),
        supabase
          .from("categories")
          .select("id, name")
          .eq("workspace_id", workspaceId)
          .eq("is_active", true),
      ]);
    if (recordsError) throw new Error(recordsError.message);
    setCategories(categoryRows ?? []);
    setRecords((rows as unknown as DbRecord[]).map(mapDbRecord));
    const importedCount = (importResult as { imported_count?: unknown } | null)
      ?.imported_count;
    return typeof importedCount === "number"
      ? importedCount
      : input.rows.length;
  }

  async function updateRecordDate(id: string, date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Ingresá una fecha válida.");
    }
    const { error } = await createClient()
      .from("records")
      .update({ record_date: date, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    setRecords((current) =>
      current.map((record) =>
        record.id === id ? { ...record, date } : record,
      ),
    );
  }

  async function updateRecord(id: string, record: RecordMutation) {
    if (dataMode !== "supabase" || !workspaceId) {
      throw new Error("Tu usuario todavía no tiene un espacio habilitado.");
    }
    const categoryId =
      categories.find((category) => category.name === record.category)?.id ??
      null;
    const movementType = movementTypes.find(
      (type) => type.id === record.movementTypeId,
    );
    if (!movementType)
      throw new Error("Elegí un tipo de movimiento disponible.");
    const { error } = await createClient()
      .from("records")
      .update({
        record_date: record.date,
        movement_type_id: movementType.id,
        description: record.description,
        record_group:
          movementType.code === "monthly_transfer"
            ? "monthly_transfer"
            : "other_payment",
        amount_pyg: record.amount,
        category_id: categoryId,
        payment_method: record.method || null,
        reference: record.reference || null,
        notes: record.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    setRecords((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...record,
              group:
                movementType.code === "monthly_transfer"
                  ? "transfer"
                  : "payment",
              movementTypeId: movementType.id,
              movementTypeCode: movementType.code,
              movementTypeName: movementType.name,
              movementTypeColor: movementType.color,
              sourceSheet: item.sourceSheet,
            }
          : item,
      ),
    );
  }

  async function createCategory(name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) throw new Error("Escribí el nombre de la categoría.");
    if (dataMode !== "supabase" || !workspaceId) {
      throw new Error("Tu usuario todavía no tiene un espacio habilitado.");
    }
    if (
      categories.some(
        (item) =>
          item.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
      )
    ) {
      throw new Error("Ya existe una categoría con ese nombre.");
    }
    const { data, error } = await createClient()
      .from("categories")
      .insert({ workspace_id: workspaceId, name: normalizedName })
      .select("id, name")
      .single();
    if (error) {
      if (error.code === "23505")
        throw new Error("Ya existe una categoría con ese nombre.");
      throw new Error(error.message);
    }
    setCategories((current) =>
      [...current, data].sort((a, b) => a.name.localeCompare(b.name, "es")),
    );
  }

  async function createMovementType(input: { name: string; color: string }) {
    const name = input.name.trim();
    if (!name) throw new Error("Escribí el nombre del tipo de movimiento.");
    if (dataMode !== "supabase" || !workspaceId) {
      throw new Error("Tu usuario todavía no tiene un espacio habilitado.");
    }
    if (
      movementTypes.some(
        (type) => type.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      throw new Error("Ya existe un tipo de movimiento con ese nombre.");
    }
    const slug =
      name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 48) || "tipo";
    const code = `custom_${slug}_${crypto.randomUUID().slice(0, 8)}`;
    const { data, error } = await createClient()
      .from("movement_types")
      .insert({
        workspace_id: workspaceId,
        name,
        code,
        color: input.color,
        position: movementTypes.length,
      })
      .select("id, name, code, color, position")
      .single();
    if (error) {
      if (error.code === "23505")
        throw new Error("Ya existe un tipo de movimiento con ese nombre.");
      throw new Error(error.message);
    }
    setMovementTypes((current) => [...current, data as MovementType]);
  }

  async function deleteRecord(id: string) {
    if (dataMode === "supabase") {
      const { error } = await createClient()
        .from("records")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    }
    setRecords((current) => current.filter((record) => record.id !== id));
  }

  return (
    <AppContext.Provider
      value={{
        records,
        addRecord,
        deleteRecord,
        dialogOpen,
        setDialogOpen,
        dataMode,
        workspaceName,
        categories,
        movementTypes,
        profile,
        refreshProfile,
        importWorkbook,
        updateRecordDate,
        updateRecord,
        createCategory,
        createMovementType,
      }}
    >
      {children}
      <NewRecordDialog />
    </AppContext.Provider>
  );
}

export function useDemoApp() {
  const context = React.useContext(AppContext);
  if (!context)
    throw new Error("useDemoApp debe usarse dentro de DemoAppProvider");
  return context;
}

function mapDbRecord(row: DbRecord): RecordItem {
  return {
    id: row.id,
    date: row.record_date,
    sourceSheet: row.source_sheet,
    description: row.description,
    group: row.record_group === "monthly_transfer" ? "transfer" : "payment",
    movementTypeId: row.movement_type_id,
    movementTypeCode: row.movement_types?.code ?? row.record_group,
    movementTypeName:
      row.movement_types?.name ??
      (row.record_group === "monthly_transfer"
        ? "Transferencias mensuales"
        : "Pagos varios"),
    movementTypeColor:
      row.movement_types?.color ??
      (row.record_group === "monthly_transfer" ? "#315b3c" : "#ac8a3e"),
    amount: Number(row.amount_pyg),
    category: row.categories?.name,
    reference: row.reference ?? undefined,
    notes: row.notes ?? undefined,
    method: row.payment_method ?? undefined,
  };
}

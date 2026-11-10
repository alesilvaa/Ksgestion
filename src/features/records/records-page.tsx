"use client";

import { flexRender } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getSortedRowModel,
  type LegacyColumnDef,
  useLegacyTable,
} from "@tanstack/react-table/legacy";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  FileDown,
  Pencil,
  FileUp,
  ReceiptText,
  WalletCards,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as React from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useDemoApp } from "./demo-app-provider";
import type { RecordItem } from "./types";
import { formatDate, formatPyg, monthNames } from "@/lib/utils";
import { WorkbookImport } from "./workbook-import";
import { EditRecordDialog } from "./edit-record-dialog";

export function RecordsPage() {
  const {
    records,
    deleteRecord,
    setDialogOpen,
    dataMode,
    categories,
    movementTypes,
    importWorkbook,
    profile,
    workspaceName,
  } = useDemoApp();
  const [search, setSearch] = React.useState("");
  const [month, setMonth] = React.useState("latest");
  const [year, setYear] = React.useState("latest");
  const [selectedTypeId, setSelectedTypeId] = React.useState("all");
  const [sorting, setSorting] = React.useState([{ id: "date", desc: false }]);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importSummary, setImportSummary] = React.useState<string | null>(null);
  const [editingRecord, setEditingRecord] = React.useState<RecordItem | null>(
    null,
  );
  const [exportOpen, setExportOpen] = React.useState(false);
  const [exportMonth, setExportMonth] = React.useState("01");
  const [exportYear, setExportYear] = React.useState("2026");
  const latestDatedRecord = records
    .flatMap((record) => (record.date ? [record.date] : []))
    .sort()
    .at(-1);
  const currentPeriod = getAsuncionPeriod();
  const activeMonth =
    month === "latest"
      ? (latestDatedRecord?.slice(5, 7) ??
        (records.length > 0 ? "undated" : currentPeriod.month))
      : month;
  const activeYear =
    year === "latest"
      ? (latestDatedRecord?.slice(0, 4) ??
        (records.length > 0 ? "all" : currentPeriod.year))
      : year;

  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).get("importar") === "1") {
      const timer = window.setTimeout(() => setImportOpen(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const filtered = records.filter((record) => {
    const yearMatches =
      activeYear === "all" ||
      record.sourceYear == null ||
      String(record.sourceYear) === activeYear;
    const matchesPeriod = !record.date
      ? yearMatches &&
        (activeMonth === "all" ||
          activeMonth === "undated" ||
          monthNames.findIndex(
            (name) =>
              normalizeMonth(name) === normalizeMonth(record.sourceSheet ?? ""),
          ) +
            1 ===
            Number(activeMonth))
      : activeMonth !== "undated" &&
        (activeYear === "all" || record.date.startsWith(`${activeYear}-`)) &&
        (activeMonth === "all" || record.date.slice(5, 7) === activeMonth);
    return (
      matchesPeriod &&
      record.description.toLowerCase().includes(search.toLowerCase()) &&
      (selectedTypeId === "all" || record.movementTypeId === selectedTypeId)
    );
  });

  const columns = React.useMemo<LegacyColumnDef<RecordItem>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Fecha",
        cell: ({ row }: { row: { original: RecordItem } }) =>
          row.original.date ? (
            (() => {
              const [dateYear, dateMonth, dateDay] =
                row.original.date.split("-");
              return (
                <span className="inline-flex min-w-24 items-center gap-2.5 whitespace-nowrap text-[#33483c]">
                  <span className="grid size-10 place-items-center rounded-xl bg-[#e8f0e7] text-base font-extrabold tabular-nums text-[#234a31]">
                    {Number(dateDay)}
                  </span>
                  <span>
                    <span className="block text-[10px] font-extrabold uppercase tracking-[.09em] text-[#718275]">
                      {monthNames[Number(dateMonth) - 1]?.slice(0, 3)}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-[#9aa49b]">
                      {dateYear}
                    </span>
                  </span>
                </span>
              );
            })()
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">
              Sin fecha
            </span>
          ),
      },
      {
        accessorKey: "description",
        header: "Descripción",
        cell: ({ row }: { row: { original: RecordItem } }) => (
          <div className="min-w-[260px]">
            <p className="font-semibold leading-5 text-foreground">
              {row.original.description}
            </p>
            {(row.original.category || row.original.reference || row.original.movementTypeName) && (
              <p className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-muted">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold"
                  style={{
                    color: `color-mix(in srgb, ${row.original.movementTypeColor} 78%, #10251b)`,
                    backgroundColor: `color-mix(in srgb, ${row.original.movementTypeColor} 16%, white)`,
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: row.original.movementTypeColor }}
                  />
                  {row.original.movementTypeName}
                </span>
                {row.original.category && (
                  <span className="rounded-full bg-[#edf3ee] px-2 py-0.5 font-semibold text-[#53675a]">
                    {row.original.category}
                  </span>
                )}
                {row.original.reference && (
                  <span className="self-center">
                    Ref. {row.original.reference}
                  </span>
                )}
              </p>
            )}
          </div>
        ),
      },
      ...movementTypes.map((type) => ({
        id: `movement-${type.id}`,
        header: () => (
          <span className="block max-w-40 text-right leading-4">
            {type.name}
          </span>
        ),
        cell: ({ row }: { row: { original: RecordItem } }) =>
          row.original.movementTypeId === type.id ? (
            <span
              className="inline-flex min-w-36 justify-end rounded-lg px-2.5 py-1.5 whitespace-nowrap text-right font-extrabold tabular-nums"
              style={{
                color: `color-mix(in srgb, ${type.color} 78%, #10251b)`,
                backgroundColor: `color-mix(in srgb, ${type.color} 18%, white)`,
                boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${type.color} 24%, white)`,
              }}
            >
              {formatPyg(row.original.amount)}
            </span>
          ) : null,
      })),
      {
        id: "actions",
        header: "",
        cell: ({ row }: { row: { original: RecordItem } }) => (
          <div className="flex items-center gap-1">
            <button
              aria-label={`Editar ${row.original.description}`}
              title="Editar registro"
              className="grid size-8 place-items-center rounded-lg text-muted hover:bg-brand-soft hover:text-brand"
              onClick={() => setEditingRecord(row.original)}
            >
              <Pencil className="size-4" />
            </button>
            <button
              aria-label={`Eliminar ${row.original.description}`}
              title="Eliminar registro"
              className="grid size-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-danger"
              onClick={() => {
                if (
                  window.confirm(
                    "¿Eliminar este registro? Esta acción no se puede deshacer.",
                  )
                )
                  void deleteRecord(row.original.id);
              }}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ),
      },
    ],
    [deleteRecord, movementTypes],
  );

  const table = useLegacyTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const typeTotals = movementTypes.map((type) => {
    const typeRecords = filtered.filter(
      (record) => record.movementTypeId === type.id,
    );
    return {
      ...type,
      total: typeRecords.reduce((sum, record) => sum + record.amount, 0),
      count: typeRecords.length,
    };
  });
  const periodLabel =
    activeMonth === "all"
      ? activeYear === "all"
        ? "Todos los períodos"
        : `Todos los meses de ${activeYear}`
      : activeMonth === "undated"
        ? "Movimientos sin fecha"
        : `${monthNames[Number(activeMonth) - 1]} ${activeYear === "all" ? "" : activeYear}`.trim();
  const grandTotal = typeTotals.reduce((sum, type) => sum + type.total, 0);
  const availableYears = Array.from(
    new Set([
      currentPeriod.year,
      ...records.flatMap((record) => record.date ? [record.date.slice(0, 4)] : []),
      ...records.flatMap((record) => record.sourceYear ? [String(record.sourceYear)] : []),
    ]),
  ).sort((left, right) => Number(right) - Number(left));
  const exportRecords = records
    .filter((record) =>
      recordBelongsToPeriod(record, exportMonth, exportYear),
    )
    .sort((left, right) => (left.date ?? "9999").localeCompare(right.date ?? "9999"));

  function openExport() {
    setExportMonth(
      /^\d{2}$/.test(activeMonth) ? activeMonth : currentPeriod.month,
    );
    setExportYear(/^\d{4}$/.test(activeYear) ? activeYear : currentPeriod.year);
    setExportOpen(true);
  }

  function generatePdf() {
    if (exportRecords.length === 0) return;
    exportRecordsPdf({
      records: exportRecords,
      month: exportMonth,
      year: exportYear,
      movementTypes,
      subscriberName: profile?.displayName || profile?.email || "Usuario",
      workspaceName: workspaceName ?? "Mi espacio",
    });
    setExportOpen(false);
  }

  function openImport() {
    setImportSummary(null);
    setImportOpen(true);
    window.setTimeout(
      () =>
        document
          .getElementById("workbook-import")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0,
    );
  }

  function finishImport(count: number) {
    setImportSummary(
      count > 0
        ? `Se importaron ${count} movimientos. Ya están visibles en la tabla.`
        : "Este archivo ya estaba importado. No agregamos movimientos duplicados.",
    );
    setImportOpen(false);
    setMonth("all");
    setYear("all");
    if (new URLSearchParams(window.location.search).has("importar")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    window.setTimeout(
      () =>
        document
          .getElementById("records-table")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  }

  return (
    <div className="animate-enter space-y-5">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#8a7442]">
            <span className="size-1.5 rounded-full bg-[#b89b53]" />
            KS · GESTIÓN FINANCIERA
          </p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-[-.05em] text-[#173d2f] sm:text-[2.15rem]">
            Tu libro de pagos
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[#68766c]">
            Cada movimiento en su mes y columna, con los totales siempre a la
            vista.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={openImport}>
            <FileUp className="size-4" />
            Importar Excel
          </Button>
          <Button variant="secondary" onClick={openExport}>
            <FileDown className="size-4" />
            Exportar PDF
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={dataMode !== "supabase"}
          >
            <Plus className="size-4" />
            Nuevo registro
          </Button>
        </div>
      </section>

      <Dialog.Root open={exportOpen} onOpenChange={setExportOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[#102119]/60 backdrop-blur-[3px] data-[state=open]:animate-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-24px)] max-w-[470px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[26px] border border-[#c9b77d] bg-[#fbfcfa] shadow-[0_28px_90px_rgba(5,26,17,.32)] outline-none">
            <div className="bg-[#173d2f] px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#d3bd77]/15 text-[#e4cf8e]">
                  <FileDown className="size-5" />
                </span>
                <div>
                  <Dialog.Title className="text-lg font-extrabold tracking-[-.03em]">
                    Preparar reporte PDF
                  </Dialog.Title>
                  <Dialog.Description className="mt-0.5 text-xs text-white/65">
                    Elegí el mes y año que querés incluir.
                  </Dialog.Description>
                </div>
              </div>
            </div>
            <div className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2 text-xs font-bold text-[#4f6255]">
                  Mes
                  <Select
                    value={exportMonth}
                    onChange={(event) => setExportMonth(event.target.value)}
                  >
                    {monthNames.map((name, index) => (
                      <option key={name} value={String(index + 1).padStart(2, "0")}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-2 text-xs font-bold text-[#4f6255]">
                  Año
                  <Select
                    value={exportYear}
                    onChange={(event) => setExportYear(event.target.value)}
                  >
                    {availableYears.map((availableYear) => (
                      <option key={availableYear} value={availableYear}>
                        {availableYear}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[#dce8dd] bg-[#eff5ee] px-4 py-3.5">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#65796a]">
                    Movimientos incluidos
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#829087]">
                    {monthNames[Number(exportMonth) - 1]} {exportYear}
                  </p>
                </div>
                <span className="text-xl font-extrabold tabular-nums text-[#173d2f]">
                  {exportRecords.length}
                </span>
              </div>
              {exportRecords.length > 0 && (
                <p className="text-xs leading-5 text-[#748177]">
                  El reporte incluirá los totales y figurará como suscripto por{" "}
                  <strong className="text-[#315b3c]">
                    {profile?.displayName || profile?.email || "Usuario"}
                  </strong>
                  .
                </p>
              )}
              {exportRecords.length === 0 && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-medium leading-5 text-amber-900">
                  No hay registros para ese período. Elegí otro mes o año.
                </p>
              )}
              <div className="flex justify-end gap-2 border-t border-[#e5ebe4] pt-4">
                <Dialog.Close asChild>
                  <Button type="button" variant="secondary">
                    Cancelar
                  </Button>
                </Dialog.Close>
                <Button
                  type="button"
                  onClick={generatePdf}
                  disabled={exportRecords.length === 0}
                >
                  <FileDown className="size-4" />
                  Generar PDF
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {importSummary && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-brand"
        >
          {importSummary}
        </p>
      )}

      {importOpen && (
        <div id="workbook-import" className="scroll-mt-24">
          <WorkbookImport
            categories={categories}
            onClose={() => setImportOpen(false)}
            onImport={importWorkbook}
            onComplete={finishImport}
          />
        </div>
      )}

      <section
        id="records-table"
        className="scroll-mt-24 overflow-hidden rounded-[24px] border border-[#dce7de] bg-white shadow-[0_8px_28px_rgba(18,52,34,.06)]"
      >
        <div className="relative isolate flex flex-col justify-between gap-5 overflow-hidden bg-[#173d2f] px-4 py-5 sm:px-6 sm:py-6 md:flex-row md:items-center">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-36 -z-10 size-80 rounded-full border border-white/[.08]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -top-20 -z-10 size-52 rounded-full border border-white/[.06]"
          />
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Mes anterior"
              title="Mes anterior"
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[.08] text-white transition hover:bg-white/[.16] disabled:opacity-35"
              onClick={() =>
                shiftMonth(-1, activeMonth, activeYear, setMonth, setYear)
              }
              disabled={
                activeMonth === "all" ||
                activeMonth === "undated" ||
                activeYear === "all"
              }
            >
              <ChevronLeft className="size-5" />
            </button>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#d6bd79]">
                <CalendarDays className="size-3.5" />
                Período
              </p>
              <h3 className="mt-0.5 truncate text-2xl font-extrabold tracking-[-.045em] text-white sm:text-[1.8rem]">
                {periodLabel}
              </h3>
              <p className="mt-1 text-[11px] font-medium text-white/60">
                {filtered.length}{" "}
                {filtered.length === 1 ? "movimiento" : "movimientos"} en esta
                vista
              </p>
            </div>
            <button
              aria-label="Mes siguiente"
              title="Mes siguiente"
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[.08] text-white transition hover:bg-white/[.16] disabled:opacity-35"
              onClick={() =>
                shiftMonth(1, activeMonth, activeYear, setMonth, setYear)
              }
              disabled={
                activeMonth === "all" ||
                activeMonth === "undated" ||
                activeYear === "all"
              }
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_108px] gap-2 md:w-[320px]">
            <Select
              aria-label="Elegir mes"
              value={activeMonth}
              onChange={(e) => setMonth(e.target.value)}
              className="border-white/20 bg-[#f6f5eb] font-bold text-[#244632] shadow-sm"
            >
              <option value="all">Todos los meses</option>
              <option value="undated">Sin fecha</option>
              {monthNames.map((name, index) => (
                <option key={name} value={String(index + 1).padStart(2, "0")}>
                  {name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Elegir año"
              value={activeYear}
              onChange={(e) => setYear(e.target.value)}
              className="border-white/20 bg-[#f6f5eb] font-bold text-[#244632] shadow-sm"
            >
              <option value="all">Todos</option>
              {availableYears.map((availableYear) => (
                <option key={availableYear}>{availableYear}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-y border-[#e5ece6] bg-white p-4 sm:px-6 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              placeholder="Buscar concepto o referencia…"
            />
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-[#f2f5f2] p-1">
            <button
              type="button"
              aria-pressed={selectedTypeId === "all"}
              onClick={() => setSelectedTypeId("all")}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition ${selectedTypeId === "all" ? "bg-white text-[#173d2f] shadow-sm" : "text-[#778179] hover:text-[#173d2f]"}`}
            >
              Todos
            </button>
            {movementTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                aria-pressed={selectedTypeId === type.id}
                onClick={() => setSelectedTypeId(type.id)}
                style={
                  selectedTypeId === type.id
                    ? {
                        color: type.color,
                        backgroundColor: `color-mix(in srgb, ${type.color} 12%, white)`,
                      }
                    : undefined
                }
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${selectedTypeId === type.id ? "shadow-sm" : "text-[#778179] hover:text-[#173d2f]"}`}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: type.color }}
                />
                {type.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 border-b border-[#e5ece6] bg-[#f7f8f3] p-4 sm:grid-cols-2 sm:px-6 sm:py-5 xl:grid-cols-3">
          {typeTotals.map((type) => (
            <div
              key={type.id}
              className="relative overflow-hidden rounded-2xl border p-4 sm:p-5"
              style={{
                borderColor: `color-mix(in srgb, ${type.color} 38%, #dfe7df)`,
                background: `linear-gradient(135deg, color-mix(in srgb, ${type.color} 13%, white), white 78%)`,
              }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: type.color }}
              />
              <span
                aria-hidden="true"
                className="absolute -right-4 -top-5 grid size-20 place-items-center rounded-full text-3xl font-black"
                style={{
                  color: `color-mix(in srgb, ${type.color} 25%, white)`,
                  backgroundColor: `color-mix(in srgb, ${type.color} 10%, white)`,
                }}
              >
                {type.name.slice(0, 1).toUpperCase()}
              </span>
              <p
                className="relative flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.11em]"
                style={{ color: `color-mix(in srgb, ${type.color} 78%, #10251b)` }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: type.color }}
                />
                {type.name}
              </p>
              <p
                className="relative mt-3 text-xl font-extrabold tracking-[-.035em] sm:text-[1.35rem]"
                style={{ color: `color-mix(in srgb, ${type.color} 82%, #10251b)` }}
              >
                {formatPyg(type.total)}
              </p>
              <p className="relative mt-1 text-[10px] font-semibold text-[#78857b]">
                {type.count} {type.count === 1 ? "movimiento" : "movimientos"}
              </p>
            </div>
          ))}
          <div className="relative overflow-hidden rounded-2xl bg-[#173d2f] p-4 text-white shadow-[0_8px_18px_rgba(23,61,47,.17)] sm:p-5">
            <span
              aria-hidden="true"
              className="absolute -right-4 -top-5 grid size-20 place-items-center rounded-full bg-white/[.08] text-white/45"
            >
              <WalletCards className="size-8" />
            </span>
            <p className="relative flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.11em] text-[#e0c982]">
              <span className="size-1.5 rounded-full bg-[#d0b35e]" />
              Total del período
            </p>
            <p className="relative mt-3 text-xl font-extrabold tracking-[-.035em] sm:text-[1.35rem]">
              {formatPyg(grandTotal)}
            </p>
            <p className="relative mt-1 text-[10px] font-semibold text-white/55">
              {filtered.length} movimientos sumados
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse text-left text-xs"
            style={{ minWidth: `${760 + movementTypes.length * 180}px` }}
          >
            <thead>
              <tr className="bg-[#e9f1e6]">
                {table.getHeaderGroups()[0]?.headers.map((header) =>
                  (() => {
                    const type = movementTypes.find(
                      (item) => header.id === `movement-${item.id}`,
                    );
                    return (
                      <th
                        key={header.id}
                        style={
                          type
                            ? {
                                backgroundColor: `color-mix(in srgb, ${type.color} 82%, #10251b)`,
                                color: "white",
                                borderColor: `color-mix(in srgb, ${type.color} 65%, #10251b)`,
                              }
                            : undefined
                        }
                        className="whitespace-nowrap border-b border-[#d6e2d7] px-5 py-4 text-[10px] font-extrabold uppercase tracking-[.07em] text-[#4f6556]"
                      >
                        <button
                          className="inline-flex items-center gap-1.5"
                          onClick={header.column.getToggleSortingHandler()}
                          disabled={!header.column.getCanSort()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {header.column.getCanSort() && (
                            <ArrowDownUp className="size-3" />
                          )}
                        </button>
                      </th>
                    );
                  })(),
                )}
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`group transition-colors ${row.index % 2 ? "bg-[#f6f8f5]" : "bg-white"} hover:bg-[#eef5ed]`}
                  style={{
                    borderLeft: `4px solid ${row.original.movementTypeColor}`,
                  }}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <td
                      key={cell.id}
                      style={
                        cellIndex >= 2 && cellIndex < movementTypes.length + 2
                          ? {
                              backgroundColor: `color-mix(in srgb, ${movementTypes[cellIndex - 2]?.color ?? "#315b3c"} ${row.original.movementTypeId === movementTypes[cellIndex - 2]?.id ? "11%" : "4%"}, white)`,
                            }
                          : undefined
                      }
                      className={`border-b border-r border-[#dce4dc] px-5 py-3.5 align-middle last:border-r-0 ${cellIndex >= 2 && cellIndex < movementTypes.length + 2 ? "group-hover:!bg-[#eaf2e9]" : "group-hover:bg-[#eef5ed]"}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-[#edf2ec] font-extrabold text-[#344b3c]">
                  <td
                    colSpan={2}
                    className="border-t-2 border-[#d5e1d6] px-5 py-4 uppercase tracking-[.08em]"
                  >
                    Totales del período
                  </td>
                  {typeTotals.map((type) => (
                    <td
                      key={type.id}
                      className="border-t-2 border-[#d5e1d6] px-5 py-4 text-right tabular-nums"
                      style={{
                        color: `color-mix(in srgb, ${type.color} 82%, #10251b)`,
                        backgroundColor: `color-mix(in srgb, ${type.color} 12%, white)`,
                      }}
                    >
                      {formatPyg(type.total)}
                    </td>
                  ))}
                  <td className="border-t-2 border-[#d5e1d6] px-5 py-4" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="bg-[radial-gradient(ellipse_at_center,_#f0f5ef_0%,_white_68%)] px-6 py-16 text-center">
            <div className="mx-auto grid size-[68px] place-items-center rounded-[22px] border border-[#dce8dd] bg-[#eaf2e9] text-[#315b3c] shadow-[0_8px_20px_rgba(35,74,49,.08)]">
              {records.length === 0 ? (
                <ReceiptText className="size-7" />
              ) : (
                <Search className="size-6" />
              )}
            </div>
            <p className="mt-5 text-lg font-extrabold tracking-[-.025em] text-[#173d2f]">
              {records.length === 0
                ? "Empezá tu libro mensual"
                : "No hay movimientos en esta vista"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#728076]">
              {records.length === 0
                ? "Importá la planilla que ya usás o cargá el primer movimiento. Tus totales y registros aparecerán acá."
                : "Probá otro mes, limpiá la búsqueda o cambiá el tipo de movimiento."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {records.length === 0 &&
                dataMode === "supabase" &&
                !importOpen && (
                  <Button onClick={openImport}>
                    <FileUp className="size-4" />
                    Importar mi Excel
                  </Button>
                )}
              {records.length === 0 && dataMode === "supabase" && (
                <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                  <Plus className="size-4" />
                  Cargar movimiento
                </Button>
              )}
              {records.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setMonth("all");
                    setYear("all");
                    setSelectedTypeId("all");
                    setSearch("");
                  }}
                >
                  Ver todos los movimientos
                </Button>
              )}
            </div>
          </div>
        )}
        <div className="flex flex-col justify-between gap-2 border-t px-5 py-4 text-[11px] text-muted sm:flex-row sm:items-center">
          <span>
            {filtered.length} {filtered.length === 1 ? "registro" : "registros"}{" "}
            ·{" "}
            {dataMode === "supabase"
              ? "Guardado en Supabase"
              : dataMode === "loading"
                ? "Conectando…"
                : dataMode === "unassigned"
                  ? "Sin espacio asignado"
                  : "Error al cargar"}
          </span>
          <span>{periodLabel}</span>
        </div>
      </section>
      <EditRecordDialog
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
      />
    </div>
  );
}

function normalizeMonth(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getAsuncionPeriod() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Asuncion",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return {
    year: parts.find((part) => part.type === "year")?.value ?? "2026",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
  };
}

function shiftMonth(
  delta: number,
  month: string,
  year: string,
  setMonth: (value: string) => void,
  setYear: (value: string) => void,
) {
  const date = new Date(Number(year), Number(month) - 1 + delta, 1);
  setMonth(String(date.getMonth() + 1).padStart(2, "0"));
  setYear(String(date.getFullYear()));
}

function recordBelongsToPeriod(record: RecordItem, month: string, year: string) {
  if (record.date) return record.date.startsWith(`${year}-${month}-`);
  if (record.sourceYear != null && record.sourceYear !== Number(year)) return false;
  const sourceMonth = monthNames.findIndex(
    (name) => normalizeMonth(name) === normalizeMonth(record.sourceSheet ?? ""),
  );
  return sourceMonth === Number(month) - 1;
}

function exportRecordsPdf({
  records,
  month,
  year,
  movementTypes,
  subscriberName,
  workspaceName,
}: {
  records: RecordItem[];
  month: string;
  year: string;
  movementTypes: Array<{ id: string; name: string; color: string }>;
  subscriberName: string;
  workspaceName: string;
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 16;
  const columnWidths = [25, 88, 43, 52, 57];
  const columnTitles = ["FECHA", "DESCRIPCIÓN", "TIPO DE MOVIMIENTO", "CATEGORÍA / REF.", "MONTO PYG"];
  const monthLabel = monthNames[Number(month) - 1] ?? month;
  const periodLabel = `${monthLabel} ${year}`;
  const issuedAt = new Intl.DateTimeFormat("es-PY", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Asuncion",
  }).format(new Date());
  const typeTotals = movementTypes
    .map((type) => ({
      ...type,
      total: records
        .filter((record) => record.movementTypeId === type.id)
        .reduce((sum, record) => sum + record.amount, 0),
    }))
    .filter((type) => type.total > 0);
  const grandTotal = records.reduce((sum, record) => sum + record.amount, 0);

  function drawBrandHeader(title: string, subtitle?: string) {
    doc.setFillColor(23, 61, 47);
    doc.rect(0, 0, pageWidth, 29, "F");
    doc.setFillColor(189, 163, 91);
    doc.rect(0, 28, pageWidth, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(224, 201, 130);
    doc.text("KS · GESTIÓN FINANCIERA", margin, 9);
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin, 19);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(periodLabel, pageWidth - margin, 14, { align: "right" });
    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(221, 232, 222);
      doc.text(subtitle, pageWidth - margin, 21, { align: "right" });
    }
  }

  function drawTableHeader(y: number) {
    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    doc.setFillColor(231, 239, 229);
    doc.roundedRect(margin, y, totalWidth, 9, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(54, 78, 61);
    let x = margin;
    columnTitles.forEach((title, index) => {
      const rightAligned = index === columnTitles.length - 1;
      doc.text(title, rightAligned ? x + columnWidths[index] - 3 : x + 3, y + 5.8, {
        align: rightAligned ? "right" : "left",
      });
      x += columnWidths[index];
    });
    return y + 9;
  }

  function drawContinuationHeader() {
    drawBrandHeader("REPORTE DE MOVIMIENTOS", workspaceName);
    return drawTableHeader(34);
  }

  drawBrandHeader("REPORTE DE MOVIMIENTOS", workspaceName);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(98, 116, 103);
  doc.text(`Período: ${periodLabel}`, margin, 36);
  doc.text(`${records.length} movimientos`, pageWidth - margin, 36, {
    align: "right",
  });

  doc.setFillColor(241, 246, 240);
  doc.roundedRect(margin, 40, pageWidth - margin * 2, 18, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(96, 118, 102);
  doc.text("TOTAL DEL PERÍODO", margin + 5, 47);
  doc.setFontSize(16);
  doc.setTextColor(23, 61, 47);
  doc.text(formatPyg(grandTotal), margin + 5, 54);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(103, 121, 108);
  doc.text(`Espacio: ${workspaceName}`, pageWidth - margin - 5, 48, {
    align: "right",
  });
  doc.text(`Suscriptor: ${subscriberName}`, pageWidth - margin - 5, 53,
    { align: "right" },
  );

  let y = drawTableHeader(63);
  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  records.forEach((record, index) => {
    const descriptionLines = doc.splitTextToSize(record.description, 82) as string[];
    const typeLines = doc.splitTextToSize(record.movementTypeName, 37) as string[];
    const categoryText = [record.category, record.reference && `Ref. ${record.reference}`]
      .filter(Boolean)
      .join(" · ") || "—";
    const categoryLines = doc.splitTextToSize(categoryText, 47) as string[];
    const lineCount = Math.max(descriptionLines.length, typeLines.length, categoryLines.length, 1);
    const rowHeight = Math.max(10, lineCount * 4 + 4);
    if (y + rowHeight > pageHeight - 43) {
      doc.addPage();
      y = drawContinuationHeader();
    }

    const color = hexToRgb(record.movementTypeColor);
    const rowBackground: [number, number, number] =
      index % 2 === 0 ? [255, 255, 255] : [248, 250, 247];
    doc.setFillColor(...rowBackground);
    doc.rect(margin, y, tableWidth, rowHeight, "F");
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, y, 1.2, rowHeight, "F");
    doc.setDrawColor(224, 231, 223);
    doc.setLineWidth(0.25);
    doc.line(margin, y + rowHeight, margin + tableWidth, y + rowHeight);

    let x = margin;
    const baseline = y + Math.max(6.5, rowHeight / 2 + 1.3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(81, 99, 86);
    doc.text(record.date ? formatDate(record.date) : "Sin fecha", x + 3, baseline);
    x += columnWidths[0];

    doc.setFont("helvetica", "bold");
    doc.setTextColor(36, 55, 42);
    doc.text(descriptionLines.slice(0, 3), x + 3, y + 4.5);
    x += columnWidths[1];

    const typeColor = mixRgb(color, [255, 255, 255], 0.16);
    const darkTypeColor = mixRgb(color, [16, 37, 27], 0.78);
    doc.setFillColor(...typeColor);
    doc.roundedRect(x + 2, y + 2.2, columnWidths[2] - 4, rowHeight - 4.4, 1.6, 1.6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.3);
    doc.setTextColor(...darkTypeColor);
    doc.text(typeLines.slice(0, 2), x + 4, y + 5.5);
    x += columnWidths[2];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(91, 107, 96);
    doc.text(categoryLines.slice(0, 3), x + 3, y + 4.5);
    x += columnWidths[3];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.6);
    doc.setTextColor(...darkTypeColor);
    doc.text(formatPyg(record.amount), x + columnWidths[4] - 3, baseline, {
      align: "right",
    });
    y += rowHeight;
  });

  const summaryHeight = typeTotals.length * 6 + 17;
  if (y + summaryHeight + 25 > pageHeight - 7) {
    doc.addPage();
    drawBrandHeader("RESUMEN DEL PERÍODO", workspaceName);
    y = 36;
  } else {
    y += 5;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(50, 76, 58);
  doc.text("TOTALES POR TIPO", margin + 2, y + 3);
  y += 7;
  typeTotals.forEach((type) => {
    const rgb = hexToRgb(type.color);
    doc.setFillColor(...mixRgb(rgb, [255, 255, 255], 0.12));
    doc.roundedRect(margin, y - 3.5, tableWidth, 5.5, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.6);
    doc.setTextColor(...mixRgb(rgb, [16, 37, 27], 0.8));
    doc.text(type.name, margin + 3, y);
    doc.text(formatPyg(type.total), margin + tableWidth - 3, y, { align: "right" });
    y += 6;
  });
  doc.setDrawColor(189, 163, 91);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + tableWidth, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(23, 61, 47);
  doc.text("TOTAL GENERAL", margin + 3, y);
  doc.text(formatPyg(grandTotal), margin + tableWidth - 3, y, { align: "right" });
  y += 8;

  if (y + 20 > pageHeight - 9) {
    doc.addPage();
    drawBrandHeader("CONSTANCIA DEL REPORTE", periodLabel);
    y = 48;
  }
  doc.setFillColor(241, 246, 240);
  doc.roundedRect(margin, y, tableWidth, 16, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(112, 129, 116);
  doc.text("EMITIDO Y SUSCRIPTO POR", margin + 4, y + 5.5);
  doc.setFontSize(9.5);
  doc.setTextColor(23, 61, 47);
  doc.text(subscriberName, margin + 4, y + 11.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(112, 129, 116);
  doc.text(`KS Gestión · ${issuedAt}`, margin + tableWidth - 4, y + 9, {
    align: "right",
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(220, 229, 220);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 6, pageWidth - margin, pageHeight - 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(119, 132, 122);
    doc.text(`KS Gestión · ${subscriberName}`, margin, pageHeight - 2.5);
    doc.text(`Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 2.5, {
      align: "right",
    });
  }

  const filename = `ks-gestion-registros-${monthLabel}-${year}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(" ", "-");
  doc.save(`${filename}.pdf`);
}

function hexToRgb(color: string): [number, number, number] {
  const match = /^#?([\da-f]{6})$/i.exec(color);
  if (!match) return [49, 91, 60];
  const value = match[1];
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function mixRgb(
  color: [number, number, number],
  toward: [number, number, number],
  amount: number,
): [number, number, number] {
  return color.map((value, index) =>
    Math.round(value * amount + toward[index] * (1 - amount)),
  ) as [number, number, number];
}

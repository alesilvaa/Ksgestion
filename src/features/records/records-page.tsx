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
  Download,
  Pencil,
  FileUp,
  ReceiptText,
  WalletCards,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useDemoApp } from "./demo-app-provider";
import type { RecordItem } from "./types";
import { formatPyg, monthNames } from "@/lib/utils";
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
    const matchesPeriod =
      activeMonth === "undated"
        ? !record.date
        : record.date
          ? (activeYear === "all" ||
              record.date.startsWith(`${activeYear}-`)) &&
            (activeMonth === "all" || record.date.slice(5, 7) === activeMonth)
          : activeMonth === "all"
            ? activeYear === "all"
            : monthNames.findIndex(
                (name) =>
                  normalizeMonth(name) ===
                  normalizeMonth(record.sourceSheet ?? ""),
              ) +
                1 ===
              Number(activeMonth);
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
            {(row.original.category || row.original.reference) && (
              <p className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-muted">
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
                color: type.color,
                backgroundColor: `color-mix(in srgb, ${type.color} 12%, white)`,
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
      ...records.flatMap((record) =>
        record.date ? [record.date.slice(0, 4)] : [],
      ),
    ]),
  ).sort((left, right) => Number(right) - Number(left));

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
          <Button variant="secondary" onClick={() => exportCsv(filtered)}>
            <Download className="size-4" />
            Exportar CSV
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
                borderColor: `color-mix(in srgb, ${type.color} 24%, white)`,
                backgroundColor: `color-mix(in srgb, ${type.color} 9%, white)`,
              }}
            >
              <span
                aria-hidden="true"
                className="absolute -right-4 -top-5 grid size-20 place-items-center rounded-full bg-white/55 text-3xl font-black"
                style={{
                  color: `color-mix(in srgb, ${type.color} 45%, white)`,
                }}
              >
                {type.name.slice(0, 1).toUpperCase()}
              </span>
              <p
                className="relative flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.11em]"
                style={{ color: type.color }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: type.color }}
                />
                {type.name}
              </p>
              <p
                className="relative mt-3 text-xl font-extrabold tracking-[-.035em] sm:text-[1.35rem]"
                style={{ color: type.color }}
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
                                backgroundColor: `color-mix(in srgb, ${type.color} 15%, white)`,
                                color: type.color,
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
                  className={`group transition-colors ${row.index % 2 ? "bg-[#f3f6f1]" : "bg-white"} hover:bg-[#eef5ed]`}
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
                              backgroundColor: `color-mix(in srgb, ${movementTypes[cellIndex - 2]?.color ?? "#315b3c"} ${row.index % 2 ? "13%" : "7%"}, white)`,
                            }
                          : undefined
                      }
                      className="border-b border-r border-[#dce4dc] px-5 py-3.5 align-middle last:border-r-0 group-hover:bg-[#eef5ed]"
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
                <tr className="bg-[#f1f5f0] font-extrabold text-[#344b3c]">
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
                      style={{ color: type.color }}
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

function exportCsv(records: RecordItem[]) {
  const rows = [
    ["Fecha", "Descripción", "Tipo de movimiento", "Categoría", "Monto PYG"],
    ...records.map((r) => [
      r.date ?? "",
      r.description,
      r.movementTypeName,
      r.category ?? "",
      String(r.amount),
    ]),
  ];
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "registros.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

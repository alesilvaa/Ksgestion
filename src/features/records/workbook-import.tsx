"use client";

import ExcelJS from "exceljs";
import { Check, FileSpreadsheet, LoaderCircle, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import type {
  WorkbookImportInput,
  WorkbookImportRow,
} from "@/features/records/demo-app-provider";

type RawValue = string | number | Date | null;
type SheetRow = { sourceRow: number; values: RawValue[] };
type ParsedSheet = { name: string; headers: string[]; rows: SheetRow[] };
type Group = "monthly_transfer" | "other_payment";
type Mapping = {
  date: number | null;
  description: number | null;
  amount: number | null;
  transferAmount: number | null;
  paymentAmount: number | null;
  category: number | null;
  reference: number | null;
  group: number | null;
  paymentMethod: number | null;
  notes: number | null;
};
type SheetSettings = { mapping: Mapping; groupOverride: "" | Group };
type Category = { id: string; name: string };
type PreparedRow = {
  id: string;
  sheetName: string;
  sourceRow: number;
  record_date: string | null;
  description: string;
  record_group: Group | null;
  amount_pyg: string;
  category_id: string | null;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  source_raw: Record<string, string>;
  error: string | null;
};

export function WorkbookImport({
  categories,
  onClose,
  onImport,
  onComplete,
}: {
  categories: Category[];
  onClose: () => void;
  onImport: (input: WorkbookImportInput) => Promise<number>;
  onComplete: (count: number) => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [sheets, setSheets] = React.useState<ParsedSheet[]>([]);
  const [reviewSheetName, setReviewSheetName] = React.useState("");
  const [settings, setSettings] = React.useState<Record<string, SheetSettings>>({});
  const [dateCorrections, setDateCorrections] = React.useState<Record<string, string>>({});
  const [descriptionCorrections, setDescriptionCorrections] = React.useState<Record<string, string>>({});
  const [amountCorrections, setAmountCorrections] = React.useState<Record<string, string>>({});
  const [parsing, setParsing] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const reviewSheet = sheets.find((sheet) => sheet.name === reviewSheetName) ?? null;

  const prepared = React.useMemo(() => {
    return sheets.flatMap((sheet) => {
      const config = settings[sheet.name] ?? { mapping: autoMapping(sheet.headers), groupOverride: "" as const };
      return sheet.rows.flatMap((row) => prepareRow(row, sheet, config, categories, dateCorrections, descriptionCorrections, amountCorrections));
    });
  }, [sheets, settings, categories, dateCorrections, descriptionCorrections, amountCorrections]);
  const validRows = prepared.filter((row) => !row.error);
  const invalidRows = prepared.filter((row) => row.error);
  const rowsWithoutDate = validRows.filter((row) => !row.record_date).length;
  const unmatchedCategories = validRows.filter(
    (row) => {
      const sheet = sheets.find((item) => item.name === row.sheetName);
      const categoryIndex = sheet ? settings[sheet.name]?.mapping.category ?? autoMapping(sheet.headers).category : null;
      return categoryIndex !== null && !row.category_id && Boolean(sheet && row.source_raw[sheet.headers[categoryIndex]]);
    },
  ).length;
  const reviewSettings = reviewSheet
    ? settings[reviewSheet.name] ?? { mapping: autoMapping(reviewSheet.headers), groupOverride: "" as const }
    : null;
  const sheetSummaries = sheets.map((sheet) => {
    const rows = prepared.filter((row) => row.sheetName === sheet.name);
    const ready = rows.filter((row) => !row.error).length;
    const groups = Array.from(new Set(rows.flatMap((row) => row.record_group ? [row.record_group] : [])));
    return {
      name: sheet.name,
      rows: sheet.rows.length,
      ready,
      group: groups.length === 1 ? groupLabel(groups[0]) : groups.length > 1 ? "Clasificación por fila" : "Revisar tipo",
    };
  });

  async function readFile(nextFile: File | null) {
    setFile(nextFile);
    setSheets([]);
    setReviewSheetName("");
    setSettings({});
    setDateCorrections({});
    setDescriptionCorrections({});
    setAmountCorrections({});
    setError(null);
    setSuccess(null);
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".xlsx")) {
      setError("Por ahora se admiten archivos .xlsx. Guardá el .xls como .xlsx y volvé a elegirlo.");
      return;
    }
    if (nextFile.size > 25 * 1024 * 1024) {
      setError("El archivo supera el límite de 25 MB. Guardá una copia más liviana y volvé a elegirla.");
      return;
    }

    setParsing(true);
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await nextFile.arrayBuffer());
      const parsedSheets = workbook.worksheets
        .map(readWorksheet)
        .filter((sheet) => sheet.headers.length > 0 && sheet.rows.length > 0);
      if (!parsedSheets.length) {
        setError("No encontramos hojas con encabezados y filas de datos en este archivo.");
        return;
      }
      setSheets(parsedSheets);
      setReviewSheetName(parsedSheets[0].name);
      setSettings(Object.fromEntries(parsedSheets.map((sheet) => [sheet.name, { mapping: autoMapping(sheet.headers), groupOverride: "" }])));
    } catch {
      setError("No se pudo leer el Excel. Verificá que sea un archivo .xlsx válido y volvé a intentarlo.");
    } finally {
      setParsing(false);
    }
  }

  async function confirmImport() {
    if (!file || !validRows.length) return;
    if (prepared.length > 2000) {
      setError("Este archivo tiene más de 2000 filas importables. Dividilo en archivos más pequeños para continuar.");
      return;
    }
    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        await file.arrayBuffer(),
      );
      const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const rows: WorkbookImportRow[] = validRows.map((row) => ({
        record_date: row.record_date,
        description: row.description,
        record_group: row.record_group as Group,
        amount_pyg: row.amount_pyg,
        category_id: row.category_id,
        payment_method: row.payment_method,
        reference: row.reference,
        notes: row.notes,
        source_sheet: row.sheetName,
        source_row: row.sourceRow,
        source_raw: row.source_raw,
      }));
      const count = await onImport({
        originalFilename: file.name,
        fileFingerprint: hash,
        sheetName: "Libro completo",
        rows,
      });
      setSuccess(`Se importaron ${count} movimientos de ${new Set(validRows.map((row) => row.sheetName)).size} hojas.`);
      onComplete(count);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      setError(
        message.includes("ya fue importada")
          ? message
            : message.includes("import_records_batch")
            ? "La base de datos todavía no tiene habilitada la importación. Aplicá las migraciones 009, 010 y 011 y volvé a intentar."
            : message || "No se pudo guardar la importación. No se confirmó ningún movimiento; revisá la conexión e intentá otra vez.",
      );
    } finally {
      setImporting(false);
    }
  }

  function updateMapping<K extends keyof Mapping>(
    sheet: string,
    key: K,
    value: Mapping[K],
  ) {
    setSettings((current) => {
      const config = current[sheet] ?? {
        mapping: autoMapping(sheets.find((item) => item.name === sheet)?.headers ?? []),
        groupOverride: "" as const,
      };
      return {
        ...current,
        [sheet]: { ...config, mapping: { ...config.mapping, [key]: value } },
      };
    });
  }

  function updateGroup(sheet: string, value: SheetSettings["groupOverride"]) {
    setSettings((current) => {
      const config = current[sheet] ?? {
        mapping: autoMapping(sheets.find((item) => item.name === sheet)?.headers ?? []),
        groupOverride: "" as const,
      };
      return { ...current, [sheet]: { ...config, groupOverride: value } };
    });
  }

  return (
    <section className="animate-enter space-y-5 rounded-[20px] border border-brand/20 bg-white p-5 shadow-[0_2px_12px_rgba(18,32,24,.035)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.14em] text-brand">Importación de Excel</p>
          <h3 className="mt-1 text-xl font-bold">Detectamos los datos automáticamente</h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted">
            Leemos todas las hojas y buscamos fechas, descripciones, montos y tipos de movimiento. Revisá el resumen y confirmá; solo abrí “Ajustar detección” si alguna columna no quedó bien reconocida.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar importación" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-subtle"><X className="size-4" /></button>
      </div>

      <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-brand/35 bg-brand-soft/40 px-4 py-3 hover:bg-brand-soft/70">
        {parsing ? <LoaderCircle className="size-5 animate-spin text-brand" /> : <FileSpreadsheet className="size-5 text-brand" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{file?.name ?? "Elegir archivo .xlsx"}</span>
          <span className="mt-0.5 block text-xs text-muted">{parsing ? "Leyendo hojas y filas…" : "El archivo original no se conserva en el sistema."}</span>
        </span>
        <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event) => void readFile(event.target.files?.[0] ?? null)} />
      </label>

      {sheets.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile label="Hojas leídas" value={sheets.length} />
            <SummaryTile label="Filas listas" value={validRows.length} />
            <SummaryTile label="Sin fecha (editables luego)" value={rowsWithoutDate} />
            <SummaryTile label="Filas para revisar" value={invalidRows.length} />
          </div>
          {unmatchedCategories > 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              {unmatchedCategories} filas tienen categorías que todavía no existen en el sistema; se importarán sin categoría.
            </p>
          )}

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[460px] text-left text-xs">
              <thead className="bg-subtle text-[10px] font-bold uppercase tracking-wide text-muted"><tr><th className="px-3 py-2.5">Hoja</th><th className="px-3 py-2.5">Filas válidas</th><th className="px-3 py-2.5">Grupo detectado</th></tr></thead>
              <tbody className="divide-y">
                {sheetSummaries.map((sheet) => <tr key={sheet.name}><td className="px-3 py-2.5 font-semibold">{sheet.name}</td><td className="px-3 py-2.5">{sheet.ready} movimientos · {sheet.rows} filas</td><td className="px-3 py-2.5">{sheet.group}</td></tr>)}
              </tbody>
            </table>
          </div>

          <details className="rounded-xl border bg-subtle/50 p-4">
            <summary className="cursor-pointer text-xs font-bold">Ajustar detección (opcional)</summary>
            {reviewSheet && reviewSettings && (
              <div className="mt-4 space-y-4">
                <Field label="Hoja a revisar" value={reviewSheetName} onChange={setReviewSheetName} options={sheets.map((sheet) => ({ value: sheet.name, label: sheet.name }))} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <MappingField label="Fecha *" value={reviewSettings.mapping.date} headers={reviewSheet.headers} onChange={(value) => updateMapping(reviewSheet.name, "date", value)} />
                  <MappingField label="Descripción *" value={reviewSettings.mapping.description} headers={reviewSheet.headers} onChange={(value) => updateMapping(reviewSheet.name, "description", value)} />
                  <MappingField label="Monto general" value={reviewSettings.mapping.amount} headers={reviewSheet.headers} onChange={(value) => updateMapping(reviewSheet.name, "amount", value)} optional />
                  <MappingField label="Transferencias mensuales" value={reviewSettings.mapping.transferAmount} headers={reviewSheet.headers} onChange={(value) => updateMapping(reviewSheet.name, "transferAmount", value)} optional />
                  <MappingField label="Pagos varios" value={reviewSettings.mapping.paymentAmount} headers={reviewSheet.headers} onChange={(value) => updateMapping(reviewSheet.name, "paymentAmount", value)} optional />
                  <MappingField label="Tipo de movimiento" value={reviewSettings.mapping.group} headers={reviewSheet.headers} onChange={(value) => updateMapping(reviewSheet.name, "group", value)} optional />
                  <MappingField label="Categoría" value={reviewSettings.mapping.category} headers={reviewSheet.headers} onChange={(value) => updateMapping(reviewSheet.name, "category", value)} optional />
                  <MappingField label="Referencia" value={reviewSettings.mapping.reference} headers={reviewSheet.headers} onChange={(value) => updateMapping(reviewSheet.name, "reference", value)} optional />
                  <MappingField label="Medio de pago" value={reviewSettings.mapping.paymentMethod} headers={reviewSheet.headers} onChange={(value) => updateMapping(reviewSheet.name, "paymentMethod", value)} optional />
                  <MappingField label="Notas" value={reviewSettings.mapping.notes} headers={reviewSheet.headers} onChange={(value) => updateMapping(reviewSheet.name, "notes", value)} optional />
                </div>
                <label className="grid max-w-sm gap-1.5 text-xs font-bold">
                  Tipo fijo de esta hoja (solo si no hay columna de tipo)
                  <select value={reviewSettings.groupOverride} onChange={(event) => updateGroup(reviewSheet.name, event.target.value as SheetSettings["groupOverride"])} className="h-10 rounded-xl border bg-white px-3 text-sm font-medium">
                    <option value="">Detectar automáticamente</option>
                    <option value="monthly_transfer">Transferencia mensual</option>
                    <option value="other_payment">Pagos varios</option>
                  </select>
                </label>
              </div>
            )}
          </details>

          <div className="max-h-[28rem] overflow-auto rounded-xl border">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="sticky top-0 bg-subtle text-[10px] font-bold uppercase tracking-wide text-muted">
                <tr><th className="px-3 py-2.5">Hoja / fila</th><th className="px-3 py-2.5">Fecha</th><th className="px-3 py-2.5">Descripción</th><th className="px-3 py-2.5 text-center">Grupo</th><th className="px-3 py-2.5 text-right">Monto PYG</th><th className="px-3 py-2.5">Validación</th></tr>
              </thead>
              <tbody className="divide-y">
                {prepared.map((row, index) => (
                  <tr key={`${row.sheetName}-${row.sourceRow}-${row.record_group ?? "invalid"}-${index}`}>
                    <td className="px-3 py-2.5 text-muted">{row.sheetName} · {row.sourceRow}</td>
                    <td className="px-3 py-2.5">
                      <input
                        aria-label={`Corregir fecha de ${row.sheetName}, fila ${row.sourceRow}`}
                        type="date"
                        value={row.record_date ?? ""}
                        onChange={(event) => setDateCorrections((current) => ({ ...current, [`${row.sheetName}:${row.sourceRow}`]: event.target.value }))}
                        className="h-8 rounded-md border px-1.5 text-[11px]"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        aria-label={`Corregir descripción de ${row.sheetName}, fila ${row.sourceRow}`}
                        value={row.description}
                        onChange={(event) => setDescriptionCorrections((current) => ({ ...current, [`${row.sheetName}:${row.sourceRow}`]: event.target.value }))}
                        className="h-8 w-52 rounded-md border px-2 text-[11px]"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center">{row.record_group ? groupLabel(row.record_group) : "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <input
                        aria-label={`Corregir monto de ${row.sheetName}, fila ${row.sourceRow}`}
                        value={row.amount_pyg}
                        onChange={(event) => setAmountCorrections((current) => ({ ...current, [row.id]: event.target.value }))}
                        inputMode="numeric"
                        className="h-8 w-28 rounded-md border px-2 text-right text-[11px]"
                      />
                    </td>
                    <td className={`px-3 py-2.5 ${row.error ? "font-semibold text-amber-700" : "text-brand"}`}>{row.error ?? "Lista"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
            <p className="max-w-2xl text-[11px] leading-5 text-muted">Las filas sin fecha también se importan y quedan marcadas para completar después. Las descripciones o montos inválidos se excluyen. Los montos se guardan como PYG entero.</p>
            <Button onClick={() => void confirmImport()} disabled={importing || !validRows.length || prepared.length > 2000}>
              {importing ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
              {importing ? "Importando…" : `Importar ${validRows.length} movimientos`}
            </Button>
          </div>
        </>
      )}

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-brand">{success}</p>}
    </section>
  );
}

function Field({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-foreground">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border bg-white px-3 text-sm font-medium">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function MappingField({
  label,
  value,
  headers,
  onChange,
  optional = false,
}: {
  label: string;
  value: number | null;
  headers: string[];
  onChange: (value: number | null) => void;
  optional?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-foreground">
      {label}
      <select value={value === null ? "" : String(value)} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} className="h-10 rounded-xl border bg-white px-3 text-sm font-medium">
        <option value="">{optional ? "No importar" : "Elegí una columna"}</option>
        {headers.map((header, index) => <option key={`${index}-${header}`} value={index}>{header}</option>)}
      </select>
    </label>
  );
}

function readWorksheet(worksheet: ExcelJS.Worksheet): ParsedSheet {
  const candidate = worksheet.getSheetValues() as unknown[][];
  let headerRow = 0;
  let bestScore = 0;
  let firstTabularRow = 0;
  for (let rowNumber = 1; rowNumber <= Math.min(20, worksheet.rowCount); rowNumber += 1) {
    const values = candidate[rowNumber] ?? [];
    const labels = values.map((value) => normalizeHeader(displayValue(value)));
    const filled = labels.filter(Boolean).length;
    if (filled >= 3 && !firstTabularRow) firstTabularRow = rowNumber;
    const score = labels.reduce((total, label) => {
      if (/fecha|date/.test(label)) return total + 3;
      if (/descripcion|concepto|detalle|beneficiario|proveedor/.test(label)) return total + 3;
      if (/monto|importe|guaran|valor|total|transfer|trasfer|pagos?\s*varios?/.test(label)) return total + 3;
      if (/grupo|tipo de movimiento|tipo de pago/.test(label)) return total + 2;
      if (/categoria|rubro|referencia|comprobante/.test(label)) return total + 1;
      return total;
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      headerRow = rowNumber;
    }
  }
  if (bestScore < 4) headerRow = firstTabularRow;
  if (!headerRow) return { name: worksheet.name, headers: [], rows: [] };

  const sourceHeader = worksheet.getRow(headerRow);
  let columnCount = 0;
  sourceHeader.eachCell({ includeEmpty: false }, (cell) => {
    if (displayValue(cell.value).trim()) columnCount = Math.max(columnCount, Number(cell.col));
  });
  columnCount = Math.min(columnCount, 50);
  const headers = Array.from({ length: columnCount }, (_, index) => {
    const text = displayValue(sourceHeader.getCell(index + 1).value).trim();
    return text || `Columna ${index + 1}`;
  });
  const mapped = autoMapping(headers);
  const amountColumns = [mapped.amount, mapped.transferAmount, mapped.paymentAmount]
    .filter((index): index is number => index !== null);
  const rows: SheetRow[] = [];
  for (let rowNumber = headerRow + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (amountColumns.some((index) => isFormulaValue(row.getCell(index + 1).value))) break;
    const values = headers.map((_, index) => normalizeValue(row.getCell(index + 1).value));
    const rowText = values.map(displayValue).join(" ").toLocaleLowerCase();
    if (/\b(subtotal|total pagos|total gastos|total general|total del mes)\b/.test(rowText)) break;
    if (values.every((value) => !displayValue(value).trim())) continue;
    rows.push({ sourceRow: rowNumber, values });
  }
  return { name: worksheet.name, headers, rows };
}

function isFormulaValue(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      ("formula" in value || "sharedFormula" in value),
  );
}

function normalizeValue(value: unknown): RawValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date || typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "object") {
    const item = value as { result?: unknown; text?: unknown; richText?: Array<{ text?: string }> };
    if (item.result !== undefined) return normalizeValue(item.result);
    if (typeof item.text === "string") return item.text;
    if (item.richText) return item.richText.map((part) => part.text ?? "").join("");
  }
  return String(value);
}

function displayValue(value: unknown): string {
  const normalized = normalizeValue(value);
  if (normalized === null) return "";
  if (normalized instanceof Date) return normalized.toLocaleDateString("es-PY");
  return String(normalized);
}

function autoMapping(headers: string[]): Mapping {
  const find = (pattern: RegExp) => {
    const index = headers.findIndex((header) => pattern.test(normalizeHeader(header)));
    return index < 0 ? null : index;
  };
  return {
    date: find(/fecha|date|dia de pago/),
    description: find(/descripcion|concepto|detalle|proveedor|beneficiario/),
    amount: find(/monto|importe|valor|total|guaran/),
    transferAmount: find(/transfer|trasfer|trasnf/),
    paymentAmount: find(/pagos?\s*varios?/),
    category: find(/categoria|rubro/),
    reference: find(/referencia|comprobante|factura|documento/),
    group: find(/^(grupo|grupo de registro|tipo de movimiento|tipo de pago|tipo de registro|tipo de operacion|tipo de transaccion)$/),
    paymentMethod: find(/medio.?de.?pago|forma.?de.?pago|metodo.?de.?pago/),
    notes: find(/observacion|nota|comentario/),
  };
}

function normalizeHeader(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function prepareRow(
  row: SheetRow,
  sheet: ParsedSheet,
  settings: SheetSettings,
  categories: Category[],
  dateCorrections: Record<string, string>,
  descriptionCorrections: Record<string, string>,
  amountCorrections: Record<string, string>,
): PreparedRow[] {
  const { mapping, groupOverride } = settings;
  const raw = Object.fromEntries(sheet.headers.map((header, index) => [header, displayValue(row.values[index])]));
  const originalDate = mapping.date === null ? null : parseDate(row.values[mapping.date]);
  const date = dateCorrections[`${sheet.name}:${row.sourceRow}`] || originalDate;
  const description = descriptionCorrections[`${sheet.name}:${row.sourceRow}`] ??
    (mapping.description === null ? "" : displayValue(row.values[mapping.description]).trim());
  const categoryName = mapping.category === null ? "" : displayValue(row.values[mapping.category]).trim();
  const category = categoryName
    ? categories.find((item) => normalizeHeader(item.name) === normalizeHeader(categoryName))
    : undefined;
  const groupText = mapping.group === null ? "" : displayValue(row.values[mapping.group]).trim();
  const wideColumns: Array<{ index: number | null; group: Group }> = [
    { index: mapping.transferAmount, group: "monthly_transfer" },
    { index: mapping.paymentAmount, group: "other_payment" },
  ];
  const wideMode = wideColumns.some((column) => column.index !== null);
  const candidates = wideMode
    ? wideColumns.flatMap(({ index, group }) => {
        if (index === null) return [];
        const value = row.values[index];
        if (!displayValue(value).trim() || (typeof value === "number" && value === 0)) return [];
        return [{ value, group }];
      })
    : mapping.amount === null
      ? []
      : (() => {
          const value = row.values[mapping.amount as number];
          if (!displayValue(value).trim() || (typeof value === "number" && value === 0)) return [];
          const detectedGroup = groupOverride ||
            (groupText ? classifyGroup(groupText) : null) ||
            (mapping.group === null || !groupText ? classifyGroup(sheet.name) : null);
          return [{ value, group: detectedGroup }];
        })();

  return candidates.map(({ value, group }) => {
    const id = `${sheet.name}:${row.sourceRow}:${group ?? "unknown"}`;
    const amountText = amountCorrections[id] ?? displayValue(value);
    const amount = parseAmount(amountText);
    const error =
      mapping.description === null || (!wideMode && mapping.amount === null)
        ? "No se reconocieron las columnas obligatorias"
        : !description
          ? "Falta descripción"
          : amount === null
            ? "Monto no entero o inválido"
            : !group
              ? groupText
                ? `Tipo “${groupText}” no reconocido`
                : "No se pudo reconocer el grupo"
              : null;
    return {
      id,
      sheetName: sheet.name,
      sourceRow: row.sourceRow,
      record_date: date,
      description,
      record_group: group,
      amount_pyg: amount ?? "",
      category_id: category?.id ?? null,
      payment_method: mapping.paymentMethod === null ? null : emptyToNull(displayValue(row.values[mapping.paymentMethod])),
      reference: mapping.reference === null ? null : emptyToNull(displayValue(row.values[mapping.reference])),
      notes: mapping.notes === null ? null : emptyToNull(displayValue(row.values[mapping.notes])),
      source_raw: raw,
      error,
    };
  });
}

function classifyGroup(value: string): Group | null {
  const text = normalizeHeader(value).replace(/[_-]+/g, " ").trim();
  if (/\btransfer(encia|encias)?\b|\btransf\.?\b/.test(text)) return "monthly_transfer";
  if (/\bpago(s)?\b|\bpayment(s)?\b/.test(text)) return "other_payment";
  return null;
}

function groupLabel(group: Group) {
  return group === "monthly_transfer" ? "Transferencia mensual" : "Pagos varios";
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-subtle/50 p-3">
      <p className="text-xl font-extrabold tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-muted">{label}</p>
    </div>
  );
}

function parseDate(value: RawValue | undefined): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  const parts = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : dmy
      ? [Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]), Number(dmy[2]), Number(dmy[1])]
      : null;
  if (!parts) return null;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseAmount(value: RawValue | undefined): string | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
  }
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/(?:Gs\.?|PYG|₲)/gi, "").replace(/\s/g, "");
  if (!text || text.startsWith("-") || text.startsWith("+")) return null;
  if (/^\d+$/.test(text)) return Number.isSafeInteger(Number(text)) ? text : null;
  const separators = [...text.matchAll(/[.,]/g)].map((match) => match.index ?? -1);
  if (!separators.length || /[^\d.,]/.test(text)) return null;
  if (separators.length > 1) {
    const chunks = text.split(/[.,]/);
    if (chunks.slice(1).every((chunk) => chunk.length === 3)) {
      const whole = chunks.join("");
      return Number.isSafeInteger(Number(whole)) ? whole : null;
    }
  }
  const last = separators[separators.length - 1];
  const fraction = text.slice(last + 1);
  if (fraction.length <= 2 && /^0+$/.test(fraction)) {
    const whole = text.slice(0, last).replace(/[.,]/g, "");
    return Number.isSafeInteger(Number(whole)) ? whole : null;
  }
  if (fraction.length === 3) {
    const whole = text.replace(/[.,]/g, "");
    return Number.isSafeInteger(Number(whole)) ? whole : null;
  }
  return null;
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

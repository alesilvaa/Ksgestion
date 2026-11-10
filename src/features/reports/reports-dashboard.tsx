"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ReceiptText,
} from "lucide-react";
import * as React from "react";
import { Select } from "@/components/ui/field";
import { useDemoApp } from "@/features/records/demo-app-provider";
import { formatDate, formatPyg, monthNames } from "@/lib/utils";

export function ReportsDashboard() {
  const { records, movementTypes, dataMode } = useDemoApp();
  const latestDate = records
    .flatMap((record) => (record.date ? [record.date] : []))
    .sort()
    .at(-1);
  const today = currentPeriod();
  const [month, setMonth] = React.useState("latest");
  const [year, setYear] = React.useState("latest");
  const activeMonth =
    month === "latest" ? (latestDate?.slice(5, 7) ?? today.month) : month;
  const activeYear =
    year === "latest" ? (latestDate?.slice(0, 4) ?? today.year) : year;
  const periodName =
    activeMonth === "all"
      ? "Todos los períodos"
      : activeMonth === "undated"
        ? "Movimientos sin fecha"
        : `${monthNames[Number(activeMonth) - 1]} ${activeYear}`;
  const years = Array.from(
    new Set([
      today.year,
      ...records.flatMap((record) =>
        record.date ? [record.date.slice(0, 4)] : [],
      ),
    ]),
  ).sort((a, b) => Number(b) - Number(a));
  const selected = records.filter((record) => {
    if (activeMonth === "undated") return !record.date;
    if (!record.date) {
      if (activeMonth === "all") return activeYear === "all";
      return (
        monthNames.findIndex(
          (name) => normalize(name) === normalize(record.sourceSheet ?? ""),
        ) +
          1 ===
        Number(activeMonth)
      );
    }
    return (
      (activeYear === "all" || record.date.startsWith(`${activeYear}-`)) &&
      (activeMonth === "all" || record.date.slice(5, 7) === activeMonth)
    );
  });
  const total = selected.reduce((sum, record) => sum + record.amount, 0);
  const typeStats = movementTypes.map((type) => {
    const items = selected.filter(
      (record) => record.movementTypeId === type.id,
    );
    const amount = items.reduce((sum, record) => sum + record.amount, 0);
    return {
      ...type,
      count: items.length,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
    };
  });
  const categories = Array.from(
    selected
      .reduce((map, record) => {
        const key = record.category || "Sin categoría";
        map.set(key, (map.get(key) ?? 0) + record.amount);
        return map;
      }, new Map<string, number>())
      .entries(),
  )
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const chartAnchor =
    activeMonth === "undated" || activeMonth === "all"
      ? latestDate
        ? {
            year: Number(latestDate.slice(0, 4)),
            month: Number(latestDate.slice(5, 7)),
          }
        : { year: Number(today.year), month: Number(today.month) }
      : {
          year: Number(activeYear === "all" ? today.year : activeYear),
          month: Number(activeMonth),
        };
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(chartAnchor.year, chartAnchor.month - 6 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const amount = records
      .filter((record) => record.date?.startsWith(key))
      .reduce((sum, record) => sum + record.amount, 0);
    return {
      key,
      name: monthNames[date.getMonth()].slice(0, 3),
      year: date.getFullYear(),
      amount,
    };
  });
  const maxMonthly = Math.max(...monthly.map((item) => item.amount), 1);
  const recent = [...selected]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 6);

  if (dataMode === "loading")
    return (
      <div className="rounded-3xl border bg-white p-10 text-center text-sm text-muted">
        Cargando los movimientos del espacio…
      </div>
    );
  if (dataMode !== "supabase")
    return (
      <div className="rounded-3xl border border-[#dce6dc] bg-white p-10 text-center">
        <p className="font-bold text-[#173d2f]">
          No pudimos abrir los reportes
        </p>
        <p className="mt-2 text-sm text-muted">
          Verificá que tu usuario tenga un espacio asignado.
        </p>
      </div>
    );

  return (
    <div className="animate-enter space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#8a7442]">
            <span className="size-1.5 rounded-full bg-[#b89b53]" />
            LECTURA DE TU ESPACIO
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-.05em] text-[#173d2f] sm:text-[2.15rem]">
            Reportes claros
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[#68766c]">
            Un resumen de lo que ya cargaste, agrupado por mes, tipo y
            categoría.
          </p>
        </div>
        <Link
          href="/registros"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173d2f] px-4 text-sm font-bold text-white shadow-[0_5px_14px_rgba(23,61,47,.16)] transition hover:bg-[#24513c]"
        >
          <ReceiptText className="size-4" />
          Abrir registros
        </Link>
      </header>

      <section className="relative isolate overflow-hidden rounded-[24px] bg-[#173d2f] px-5 py-5 text-white shadow-[0_10px_28px_rgba(17,63,45,.14)] sm:px-7 sm:py-6">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-32 -z-10 size-72 rounded-full border border-white/[.08]"
        />
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#d6bd79]">
              <CalendarDays className="size-3.5" />
              Período analizado
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">
              {periodName}
            </h2>
            <p className="mt-1 text-xs text-white/60">
              {selected.length} movimientos cargados
            </p>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_108px] gap-2 md:w-[320px]">
            <Select
              aria-label="Mes del reporte"
              value={activeMonth}
              onChange={(event) => setMonth(event.target.value)}
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
              aria-label="Año del reporte"
              value={activeYear}
              onChange={(event) => setYear(event.target.value)}
              className="border-white/20 bg-[#f6f5eb] font-bold text-[#244632] shadow-sm"
            >
              <option value="all">Todos</option>
              {years.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      {records.length === 0 ? (
        <section className="rounded-[24px] border border-dashed border-[#cbd9cd] bg-white px-6 py-16 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-[22px] bg-[#eaf2e9] text-[#315b3c]">
            <BarChart3 className="size-7" />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-[#173d2f]">
            Los reportes aparecerán con tus datos
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            Todavía no hay movimientos en este espacio. Cuando cargues o
            importes tu planilla, vas a ver aquí los totales y tendencias.
          </p>
          <Link
            href="/registros?importar=1"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#173d2f] px-4 text-sm font-bold text-white"
          >
            <ArrowUpRight className="size-4" />
            Importar planilla
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Total de movimientos"
              value={formatPyg(total)}
              detail={`${selected.length} registros en ${periodName.toLowerCase()}`}
              tone="forest"
            />
            <MetricCard
              label="Tipos utilizados"
              value={String(typeStats.filter((type) => type.count > 0).length)}
              detail={`de ${movementTypes.length} tipos configurados`}
              tone="gold"
            />
            <MetricCard
              label="Promedio por movimiento"
              value={
                selected.length
                  ? formatPyg(Math.round(total / selected.length))
                  : formatPyg(0)
              }
              detail="Monto medio de los registros del período"
              tone="cream"
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
            <div className="overflow-hidden rounded-[24px] border border-[#dce6dc] bg-white shadow-[0_8px_24px_rgba(18,52,34,.045)]">
              <div className="border-b border-[#e5ece6] bg-[#f7f8f3] px-5 py-4 sm:px-6">
                <h2 className="font-extrabold text-[#173d2f]">
                  Distribución por tipo
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Montos agrupados según las columnas de tu libro.
                </p>
              </div>
              <div className="space-y-5 p-5 sm:p-6">
                {typeStats.map((type) => (
                  <div key={type.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-[#33483c]">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        {type.name}
                        <span className="text-[10px] font-semibold text-muted">
                          {type.count}
                        </span>
                      </span>
                      <span
                        className="shrink-0 text-sm font-extrabold tabular-nums"
                        style={{ color: type.color }}
                      >
                        {formatPyg(type.amount)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#eef1ec]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${type.percent}%`,
                          minWidth: type.count ? "4px" : 0,
                          backgroundColor: type.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-[#dce6dc] bg-white shadow-[0_8px_24px_rgba(18,52,34,.045)]">
              <div className="border-b border-[#e5ece6] bg-[#f7f8f3] px-5 py-4 sm:px-6">
                <h2 className="font-extrabold text-[#173d2f]">
                  Actividad mensual
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Suma de montos registrados en los últimos seis meses.
                </p>
              </div>
              <div className="flex h-[238px] items-end gap-3 px-5 pb-5 pt-7 sm:gap-4 sm:px-6">
                {monthly.map((item, index) => (
                  <div
                    key={item.key}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                  >
                    <span className="max-w-full truncate text-center text-[9px] font-bold tabular-nums text-[#66756a]">
                      {item.amount ? compactAmount(item.amount) : "·"}
                    </span>
                    <div className="flex h-[150px] w-full items-end overflow-hidden rounded-t-lg bg-[#f0f4ef]">
                      <div
                        className={`w-full rounded-t-lg ${index === monthly.length - 1 ? "bg-[#b89b53]" : "bg-[#315b3c]"}`}
                        style={{
                          height: item.amount
                            ? `${Math.max(8, (item.amount / maxMonthly) * 100)}%`
                            : "3px",
                          opacity: item.amount ? 1 : 0.18,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#53675a]">
                      {item.name}
                    </span>
                    <span className="text-[9px] font-medium text-[#9aa49b]">
                      {item.year}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
            <div className="overflow-hidden rounded-[24px] border border-[#dce6dc] bg-white shadow-[0_8px_24px_rgba(18,52,34,.045)]">
              <div className="border-b border-[#e5ece6] bg-[#f7f8f3] px-5 py-4 sm:px-6">
                <h2 className="font-extrabold text-[#173d2f]">Por categoría</h2>
                <p className="mt-1 text-xs text-muted">
                  Mayores montos registrados en este período.
                </p>
              </div>
              {categories.length ? (
                <div className="divide-y divide-[#edf1ed] px-5 sm:px-6">
                  {categories.map((category, index) => (
                    <div
                      key={category.name}
                      className="flex items-center gap-3 py-3.5"
                    >
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-xs font-extrabold"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${categoryColors[index % categoryColors.length]} 12%, white)`,
                          color: categoryColors[index % categoryColors.length],
                        }}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#405246]">
                        {category.name}
                      </span>
                      <span className="text-sm font-extrabold tabular-nums text-[#294634]">
                        {formatPyg(category.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-6 text-sm text-muted">
                  Todavía no hay categorías con movimientos en este período.
                </p>
              )}
            </div>
            <div className="overflow-hidden rounded-[24px] border border-[#dce6dc] bg-white shadow-[0_8px_24px_rgba(18,52,34,.045)]">
              <div className="flex items-center justify-between gap-3 border-b border-[#e5ece6] bg-[#f7f8f3] px-5 py-4 sm:px-6">
                <div>
                  <h2 className="font-extrabold text-[#173d2f]">
                    Movimientos del período
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    Actividad reciente de la información cargada.
                  </p>
                </div>
                <ArrowDownRight className="size-5 text-[#b89b53]" />
              </div>
              {recent.length ? (
                <div className="divide-y divide-[#edf1ed] px-5 sm:px-6">
                  {recent.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center gap-3 py-3.5"
                    >
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-xl"
                        style={{
                          color: record.movementTypeColor,
                          backgroundColor: `color-mix(in srgb, ${record.movementTypeColor} 12%, white)`,
                        }}
                      >
                        <ReceiptText className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#344b3c]">
                          {record.description}
                        </p>
                        <p className="mt-1 truncate text-[10px] font-medium text-muted">
                          {formatDate(record.date)} · {record.movementTypeName}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs font-extrabold tabular-nums text-[#244632]">
                        {formatPyg(record.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-6 text-sm text-muted">
                  No hay movimientos para el período elegido.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "forest" | "gold" | "cream";
}) {
  const tones = {
    forest: "border-[#315b3c] bg-[#173d2f] text-white",
    gold: "border-[#e8ddbf] bg-[#f5edd8] text-[#604d21]",
    cream: "border-[#dce6dc] bg-white text-[#244632]",
  };
  return (
    <div
      className={`rounded-[22px] border p-5 shadow-[0_5px_16px_rgba(18,52,34,.035)] ${tones[tone]}`}
    >
      <p
        className={`text-[10px] font-extrabold uppercase tracking-[.12em] ${tone === "forest" ? "text-[#e0c982]" : "opacity-70"}`}
      >
        {label}
      </p>
      <p className="mt-3 text-xl font-extrabold tracking-[-.035em] sm:text-2xl">
        {value}
      </p>
      <p
        className={`mt-1.5 text-[10px] ${tone === "forest" ? "text-white/60" : "opacity-65"}`}
      >
        {detail}
      </p>
    </div>
  );
}

function currentPeriod() {
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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
function compactAmount(value: number) {
  return new Intl.NumberFormat("es-PY", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
const categoryColors = [
  "#315b3c",
  "#ac8a3e",
  "#557c88",
  "#876c9d",
  "#6a8750",
  "#a66b50",
];

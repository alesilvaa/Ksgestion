"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FileSpreadsheet,
  CircleDollarSign,
  Plus,
  ReceiptText,
  ShieldCheck,
  Upload,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useDemoApp } from "@/features/records/demo-app-provider";
import { formatDate, formatPyg, monthNames } from "@/lib/utils";

export function HomeDashboard() {
  const {
    records,
    movementTypes,
    setDialogOpen,
    dataMode,
    workspaceName,
    profile,
  } = useDemoApp();
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
  const periodName = `${monthNames[Number(activeMonth) - 1]} ${activeYear}`;
  const years = Array.from(
    new Set([
      today.year,
      ...records.flatMap((record) =>
        record.date ? [record.date.slice(0, 4)] : [],
      ),
      ...records.flatMap((record) =>
        record.sourceYear ? [String(record.sourceYear)] : [],
      ),
    ]),
  ).sort((a, b) => Number(b) - Number(a));
  const selected = records.filter((record) => {
    if (!record.date)
      return (
        (record.sourceYear == null || String(record.sourceYear) === activeYear) &&
        monthNames.findIndex(
          (name) => normalize(name) === normalize(record.sourceSheet ?? ""),
        ) +
          1 ===
          Number(activeMonth)
      );
    return record.date.startsWith(`${activeYear}-${activeMonth}`);
  });
  const stats = movementTypes.map((type) => {
    const items = selected.filter(
      (record) => record.movementTypeId === type.id,
    );
    return {
      ...type,
      count: items.length,
      total: items.reduce((sum, record) => sum + record.amount, 0),
    };
  });
  const total = selected.reduce((sum, record) => sum + record.amount, 0);

  if (dataMode !== "supabase") {
    const message =
      dataMode === "loading"
        ? "Estamos verificando tu acceso y tu espacio de trabajo."
        : dataMode === "unassigned"
          ? "Tu cuenta todavía no tiene un espacio asignado. Pedile al superadmin que te habilite."
          : "No pudimos leer los datos. Revisá tu conexión y volvé a intentar.";
    return (
      <section className="mx-auto mt-10 max-w-2xl rounded-[24px] border border-[#dce6dc] bg-white p-8 text-center shadow-[0_8px_28px_rgba(18,52,34,.06)] sm:p-12">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eaf2e9] text-[#315b3c]">
          <ShieldCheck className="size-5" />
        </div>
        <h2 className="mt-5 text-2xl font-extrabold tracking-[-.04em] text-[#173d2f]">
          {dataMode === "loading"
            ? "Preparando tu espacio"
            : "No pudimos abrir tu espacio"}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
          {message}
        </p>
        {profile?.isPlatformAdmin && dataMode === "unassigned" && (
          <Link
            href="/administracion/usuarios"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-[#173d2f] px-4 text-sm font-bold text-white hover:bg-[#24513c]"
          >
            Administrar usuarios y espacios
          </Link>
        )}
      </section>
    );
  }

  if (records.length === 0) {
    return (
      <div className="animate-enter mx-auto max-w-5xl space-y-6 py-3 sm:py-6">
        <section className="relative isolate overflow-hidden rounded-[28px] bg-[#173d2f] px-6 py-10 text-center text-white shadow-[0_14px_34px_rgba(17,63,45,.16)] sm:px-10 sm:py-14">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-40 -z-10 size-96 rounded-full border border-white/[.08]"
          />
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#d9c276] text-[#173d2f]">
            <FileSpreadsheet className="size-6" />
          </span>
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#e0c982]">
            {workspaceName ?? "Tu espacio"}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em] sm:text-4xl">
            Empezá con tu planilla
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/70">
            Todavía no hay movimientos cargados. Importá tu Excel y vas a
            encontrar tus datos organizados por mes y tipo.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/registros?importar=1"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#d9c276] px-4 text-sm font-extrabold text-[#173d2f] transition hover:bg-[#e5d18c]"
            >
              <Upload className="size-4" />
              Elegir archivo Excel
            </Link>
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              Cargar el primero
            </Button>
          </div>
        </section>
        <div className="grid gap-3 sm:grid-cols-3">
          <OnboardingNote
            number="01"
            title="Elegí el archivo"
            detail="Seleccioná la planilla mensual que ya usás."
          />
          <OnboardingNote
            number="02"
            title="Revisá la lectura"
            detail="Detectamos hojas, fechas y tipos de movimiento."
          />
          <OnboardingNote
            number="03"
            title="Seguí trabajando"
            detail="Tus movimientos y totales quedan guardados en tu espacio."
          />
        </div>
      </div>
    );
  }

  const recent = [...selected]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 6);
  return (
    <div className="animate-enter space-y-5">
      <section className="relative isolate overflow-hidden rounded-[28px] border border-[#315845] bg-[linear-gradient(112deg,#123628_0%,#1c4937_58%,#28533d_100%)] px-5 py-6 text-white shadow-[0_18px_42px_rgba(17,63,45,.19)] sm:px-7 sm:py-7">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-36 -z-10 size-80 rounded-full border border-white/[.08]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 left-[42%] -z-10 size-72 rounded-full border border-[#d9c276]/10"
        />
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#e4ce87]">
              <CalendarDays className="size-3.5" />
              {workspaceName ?? "Tu espacio"} <span className="text-white/30">/</span> RESUMEN
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em] sm:text-4xl">
              Hola, {profile?.displayName.split(" ")[0] ?? "bienvenida"}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
              Consultá los movimientos y montos registrados para el período seleccionado.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2">
              <Select
                aria-label="Mes del inicio"
                value={activeMonth}
                onChange={(event) => setMonth(event.target.value)}
                className="h-11 border-white/25 bg-[#f8f7ef] font-bold text-[#244632] shadow-[0_4px_12px_rgba(0,0,0,.08)]"
              >
                {monthNames.map((name, index) => (
                  <option key={name} value={String(index + 1).padStart(2, "0")}>
                    {name}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Año del inicio"
                value={activeYear}
                onChange={(event) => setYear(event.target.value)}
                className="h-11 border-white/25 bg-[#f8f7ef] font-bold text-[#244632] shadow-[0_4px_12px_rgba(0,0,0,.08)]"
              >
                {years.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </div>
            <Button
              onClick={() => setDialogOpen(true)}
              className="h-11 bg-[#dfc773] font-extrabold text-[#173d2f] shadow-[0_5px_14px_rgba(0,0,0,.13)] hover:bg-[#ecd78c]"
            >
              <Plus className="size-4" />
              Cargar movimiento
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((type) => (
          <div
            key={type.id}
            className="group relative overflow-hidden rounded-[22px] border p-5 shadow-[0_5px_18px_rgba(19,49,31,.045)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(19,49,31,.1)]"
            style={{
              borderColor: `color-mix(in srgb, ${type.color} 34%, #dfe7df)`,
              background: `linear-gradient(135deg, color-mix(in srgb, ${type.color} 13%, white), #fff 78%)`,
            }}
          >
            <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: type.color }} />
            <span
              aria-hidden="true"
              className="absolute -right-5 -top-5 grid size-24 place-items-center rounded-full"
              style={{
                color: `color-mix(in srgb, ${type.color} 30%, white)`,
                backgroundColor: `color-mix(in srgb, ${type.color} 9%, white)`,
              }}
            >
              <ReceiptText className="size-9" />
            </span>
            <p className="relative flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.12em]" style={{ color: `color-mix(in srgb, ${type.color} 78%, #10251b)` }}>
              <span className="size-2 rounded-full ring-4 ring-white/70" style={{ backgroundColor: type.color }} />
              {type.name}
            </p>
            <p
              className="relative mt-4 text-2xl font-extrabold tracking-[-.045em] sm:text-[1.7rem]"
              style={{ color: `color-mix(in srgb, ${type.color} 82%, #10251b)` }}
            >
              {formatPyg(type.total)}
            </p>
            <p className="relative mt-2 flex items-center justify-between gap-2 text-[10px] font-semibold text-[#6e7d71]">
              <span>{type.count} {type.count === 1 ? "movimiento registrado" : "movimientos registrados"}</span>
              {type.count > 0 && <span className="rounded-full px-2 py-1 font-extrabold" style={{ color: type.color, backgroundColor: `color-mix(in srgb, ${type.color} 12%, white)` }}>ACTIVO</span>}
            </p>
          </div>
        ))}
        <div className="relative overflow-hidden rounded-[22px] bg-[#173d2f] p-5 text-white shadow-[0_8px_20px_rgba(23,61,47,.14)]">
          <span className="absolute -right-5 -top-5 grid size-24 place-items-center rounded-full border border-white/[.06] bg-white/[.06] text-[#e2ca7d]/50">
            <CircleDollarSign className="size-10" />
          </span>
          <p className="relative flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#e0c982]">
            <span className="size-2 rounded-full bg-[#d6bd79]" />
            Monto total registrado
          </p>
          <p className="relative mt-4 text-2xl font-extrabold tracking-[-.045em] sm:text-[1.7rem]">
            {formatPyg(total)}
          </p>
          <p className="relative mt-2 flex items-center justify-between gap-2 text-[10px] font-semibold text-white/65">
            <span>{selected.length} {selected.length === 1 ? "registro" : "registros"}</span>
            <span className="rounded-full border border-white/15 bg-white/[.08] px-2 py-1 text-white/80">{periodName}</span>
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#dce6dc] bg-white shadow-[0_8px_24px_rgba(18,52,34,.045)]">
        <div className="flex flex-col justify-between gap-3 border-b border-[#e5ece6] bg-[#f7f8f3] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#8a7442]">
              {periodName}
            </p>
            <h2 className="mt-0.5 text-lg font-extrabold text-[#173d2f]">
              Movimientos recientes
            </h2>
          </div>
          <Link
            href="/registros"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#315b3c] hover:underline"
          >
            Ver el libro completo
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {recent.length ? (
          <div className="divide-y divide-[#e5ece6]">
            {recent.map((record, index) => (
              <div
                key={record.id}
                className={`group flex items-center gap-3 border-l-[3px] px-5 py-3.5 transition hover:bg-[#f3f7f2] sm:px-6 ${index % 2 ? "bg-[#fbfcfa]" : "bg-white"}`}
                style={{ borderLeftColor: record.movementTypeColor }}
              >
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-xl"
                  style={{
                    color: record.movementTypeColor,
                    backgroundColor: `color-mix(in srgb, ${record.movementTypeColor} 17%, white)`,
                  }}
                >
                  <ReceiptText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#344b3c]">
                    {record.description}
                  </p>
                  <p className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] font-medium text-[#7b887d]">
                    <span>{formatDate(record.date)}</span>
                    <span className="text-[#c0c8c0]">·</span>
                    <span className="rounded-full px-2 py-0.5 font-bold" style={{ color: `color-mix(in srgb, ${record.movementTypeColor} 78%, #10251b)`, backgroundColor: `color-mix(in srgb, ${record.movementTypeColor} 14%, white)` }}>{record.movementTypeName}</span>
                    {record.category && <span className="truncate">· {record.category}</span>}
                  </p>
                </div>
                <p className="shrink-0 rounded-lg bg-[#edf3ed] px-2.5 py-1.5 text-xs font-extrabold tabular-nums text-[#244632]">
                  {formatPyg(record.amount)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-bold text-[#344b3c]">
              No hay movimientos en {periodName.toLowerCase()}.
            </p>
            <p className="mt-1 text-xs text-muted">
              Elegí otro mes para consultar los registros anteriores.
            </p>
            <Link
              href="/registros"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand"
            >
              Explorar registros
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function OnboardingNote({
  number,
  title,
  detail,
}: {
  number: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#e1e8e0] bg-white p-4">
      <span className="text-[10px] font-extrabold tracking-[.14em] text-[#aa8e4b]">
        PASO {number}
      </span>
      <h2 className="mt-2 text-sm font-extrabold text-[#244632]">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
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

"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FileSpreadsheet,
  Plus,
  ReceiptText,
  ShieldCheck,
  Upload,
  WalletCards,
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
    ]),
  ).sort((a, b) => Number(b) - Number(a));
  const selected = records.filter((record) => {
    if (!record.date)
      return (
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
      <section className="relative isolate overflow-hidden rounded-[26px] bg-[#173d2f] px-5 py-6 text-white shadow-[0_12px_30px_rgba(17,63,45,.15)] sm:px-7 sm:py-7">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-36 -z-10 size-80 rounded-full border border-white/[.08]"
        />
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#d6bd79]">
              <CalendarDays className="size-3.5" />
              Tu espacio · Resumen mensual
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-.05em] sm:text-4xl">
              Hola, {profile?.displayName.split(" ")[0] ?? "bienvenida"}.
            </h1>
            <p className="mt-2 text-sm text-white/65">
              Este es el resumen de lo que ya está registrado.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2">
              <Select
                aria-label="Mes del inicio"
                value={activeMonth}
                onChange={(event) => setMonth(event.target.value)}
                className="border-white/20 bg-[#f6f5eb] font-bold text-[#244632]"
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
                className="border-white/20 bg-[#f6f5eb] font-bold text-[#244632]"
              >
                {years.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </div>
            <Button
              onClick={() => setDialogOpen(true)}
              className="h-11 bg-[#d9c276] text-[#173d2f] shadow-none hover:bg-[#e5d18c]"
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
            className="relative overflow-hidden rounded-[22px] border p-5"
            style={{
              borderColor: `color-mix(in srgb, ${type.color} 24%, white)`,
              backgroundColor: `color-mix(in srgb, ${type.color} 9%, white)`,
            }}
          >
            <span
              className="absolute -right-4 -top-5 grid size-20 place-items-center rounded-full bg-white/55 text-3xl font-black"
              style={{ color: `color-mix(in srgb, ${type.color} 45%, white)` }}
            >
              {type.name.slice(0, 1).toUpperCase()}
            </span>
            <p
              className="relative text-[10px] font-extrabold uppercase tracking-[.12em]"
              style={{ color: type.color }}
            >
              {type.name}
            </p>
            <p
              className="relative mt-3 text-xl font-extrabold tracking-[-.035em] sm:text-2xl"
              style={{ color: type.color }}
            >
              {formatPyg(type.total)}
            </p>
            <p className="relative mt-1 text-[10px] font-semibold text-[#78857b]">
              {type.count} {type.count === 1 ? "movimiento" : "movimientos"}
            </p>
          </div>
        ))}
        <div className="relative overflow-hidden rounded-[22px] bg-[#173d2f] p-5 text-white shadow-[0_8px_20px_rgba(23,61,47,.14)]">
          <span className="absolute -right-4 -top-5 grid size-20 place-items-center rounded-full bg-white/[.08] text-white/40">
            <WalletCards className="size-8" />
          </span>
          <p className="relative text-[10px] font-extrabold uppercase tracking-[.12em] text-[#e0c982]">
            Total de movimientos
          </p>
          <p className="relative mt-3 text-xl font-extrabold tracking-[-.035em] sm:text-2xl">
            {formatPyg(total)}
          </p>
          <p className="relative mt-1 text-[10px] font-semibold text-white/55">
            {selected.length} registros · {periodName}
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
                className={`flex items-center gap-3 px-5 py-3.5 transition hover:bg-[#f7f9f5] sm:px-6 ${index % 2 ? "bg-[#fbfcfa]" : "bg-white"}`}
              >
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-xl"
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
                  <p className="mt-1 truncate text-[10px] font-medium text-[#7b887d]">
                    {formatDate(record.date)} · {record.movementTypeName}
                    {record.category ? ` · ${record.category}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-extrabold tabular-nums text-[#244632]">
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

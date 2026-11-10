"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  Plus,
  ReceiptText,
  X,
} from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { useDemoApp } from "./demo-app-provider";

const schema = z.object({
  date: z.string().min(1, "Seleccioná una fecha"),
  description: z.string().trim().min(3, "Escribí una descripción más clara"),
  movementTypeId: z.string().min(1, "Seleccioná un tipo de movimiento"),
  amount: z.coerce.number().int().positive("El monto debe ser mayor a cero"),
  category: z.string().optional(),
  notes: z.string().optional(),
  reference: z.string().optional(),
  method: z.string().optional(),
});

type FormValues = z.output<typeof schema>;
type FormInput = z.input<typeof schema>;

function todayInAsuncion() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Asuncion",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function NewRecordDialog() {
  const { dialogOpen, setDialogOpen, addRecord, categories, movementTypes } =
    useDemoApp();
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [selectedMovementTypeId, setSelectedMovementTypeId] =
    React.useState("");
  const selectedTypeId = selectedMovementTypeId || movementTypes[0]?.id || "";
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: "",
      movementTypeId: "",
      description: "",
      amount: 0,
      category: "",
      notes: "",
      reference: "",
      method: "",
    },
  });

  React.useEffect(() => {
    if (dialogOpen) setValue("date", todayInAsuncion());
  }, [dialogOpen, setValue]);

  React.useEffect(() => {
    if (dialogOpen && selectedTypeId) {
      setValue("movementTypeId", selectedTypeId, { shouldValidate: true });
    }
  }, [dialogOpen, selectedTypeId, setValue]);

  async function save(values: FormValues, keepOpen = false) {
    setSaveError(null);
    try {
      await addRecord(values);
      setSelectedMovementTypeId(values.movementTypeId);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
      reset({
        date: todayInAsuncion(),
        movementTypeId: values.movementTypeId,
        description: "",
        amount: 0,
        category: values.category,
        notes: "",
        reference: "",
        method: values.method,
      });
      if (!keepOpen) setDialogOpen(false);
    } catch {
      setSaveError(
        "No se pudo guardar el registro. Revisá tu acceso y volvé a intentar.",
      );
    }
  }

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#102119]/55 backdrop-blur-[3px] data-[state=open]:animate-in" />
        <Dialog.Content className="fixed inset-x-3 bottom-3 top-3 z-50 mx-auto flex max-w-[680px] flex-col overflow-hidden rounded-[26px] border border-[#c9b77d] bg-[#fbfcfa] shadow-[0_28px_90px_rgba(5,26,17,.32)] outline-none sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:max-h-[92vh] sm:w-[calc(100%-32px)] sm:-translate-y-1/2">
          <div className="relative flex items-start justify-between overflow-hidden border-b border-white/10 bg-[#173d2f] px-5 py-5 sm:px-7">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-24 size-52 rounded-full border border-white/[.08]"
            />
            <div className="flex items-center gap-3">
              <span className="relative grid size-11 place-items-center rounded-2xl bg-[#d9c276] text-[#173d2f] shadow-sm">
                <ReceiptText className="size-5" />
              </span>
              <div className="relative">
                <Dialog.Title className="text-xl font-extrabold tracking-[-.03em] text-white">
                  Nuevo movimiento
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-xs text-white/65">
                  Fecha, concepto y monto. Podés completar detalles después.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close
              className="relative grid size-9 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleSubmit((values) => save(values))}
          >
            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="record-date">Fecha</Label>
                  <Input
                    id="record-date"
                    type="date"
                    autoFocus
                    {...register("date")}
                  />
                  {errors.date && (
                    <p className="mt-1.5 text-xs font-medium text-danger">
                      {errors.date.message}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="record-description">Descripción</Label>
                  <Input
                    id="record-description"
                    placeholder="Ej.: Pago de servicio de internet"
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="mt-1.5 text-xs font-medium text-danger">
                      {errors.description.message}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label>Tipo de movimiento</Label>
                  <input
                    type="hidden"
                    {...register("movementTypeId")}
                    value={selectedTypeId}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {movementTypes.map((type) => {
                      const selected = selectedTypeId === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setSelectedMovementTypeId(type.id);
                            setValue("movementTypeId", type.id, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                          style={{
                            borderColor: selected ? type.color : undefined,
                            backgroundColor: selected
                              ? `color-mix(in srgb, ${type.color} 9%, white)`
                              : undefined,
                          }}
                          className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? "ring-2 ring-black/5" : "border-[#e0e7e2] bg-white hover:bg-[#f8fbf8]"}`}
                        >
                          <span
                            className="grid size-10 place-items-center rounded-xl"
                            style={{
                              color: type.color,
                              backgroundColor: `color-mix(in srgb, ${type.color} 14%, white)`,
                            }}
                          >
                            {type.code === "monthly_transfer" ? (
                              <ArrowLeftRight className="size-5" />
                            ) : (
                              <ReceiptText className="size-5" />
                            )}
                          </span>
                          <span>
                            <span
                              className="block text-sm font-bold"
                              style={{ color: type.color }}
                            >
                              {type.name}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-muted">
                              Columna propia en tu libro
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.movementTypeId && (
                    <p className="mt-1 text-xs text-danger">
                      {errors.movementTypeId.message}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="record-amount">Monto en guaraníes</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
                      Gs.
                    </span>
                    <Input
                      id="record-amount"
                      type="number"
                      min="1"
                      step="1"
                      className="h-14 border-[#bfd0c1] bg-[#f2f7f1] pl-11 text-xl font-extrabold tabular-nums text-[#173d2f]"
                      placeholder="0"
                      {...register("amount")}
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1.5 text-xs font-medium text-danger">
                      {errors.amount.message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="mt-6 flex w-full items-center justify-between rounded-2xl border border-[#dce7de] bg-white px-4 py-3.5 text-sm font-bold text-[#294634] transition hover:bg-[#f5f9f5]"
                onClick={() => setDetailsOpen((open) => !open)}
                aria-expanded={detailsOpen}
              >
                <span className="flex items-center gap-2">
                  <Plus className="size-4 text-brand" />
                  Más detalles{" "}
                  <span className="font-normal text-muted">(opcional)</span>
                </span>
                <ChevronDown
                  className={`size-4 text-muted transition ${detailsOpen ? "rotate-180" : ""}`}
                />
              </button>
              {detailsOpen && (
                <div className="animate-enter mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="record-category">Categoría</Label>
                    <Select id="record-category" {...register("category")}>
                      <option value="">Sin categoría</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="record-method">Método de pago</Label>
                    <Select id="record-method" {...register("method")}>
                      <option value="">No especificado</option>
                      <option>Transferencia</option>
                      <option>Efectivo</option>
                      <option>Cheque</option>
                      <option>Tarjeta</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="record-reference">Referencia</Label>
                    <Input
                      id="record-reference"
                      placeholder="N.º de operación o referencia"
                      {...register("reference")}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="record-notes">Observaciones</Label>
                    <Textarea
                      id="record-notes"
                      placeholder="Información adicional que ayude a comprender el registro"
                      {...register("notes")}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#e1e9e2] bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              {saveError && (
                <p
                  role="alert"
                  className="mr-auto self-center text-xs font-medium text-danger"
                >
                  {saveError}
                </p>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={handleSubmit((values) => save(values, true))}
                disabled={isSubmitting}
              >
                Guardar y crear otro
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {saved ? <Check className="size-4" /> : null}
                {saved ? "Guardado" : "Guardar registro"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

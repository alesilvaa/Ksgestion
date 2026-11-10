"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { ArrowLeftRight, Check, ReceiptText, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import type { RecordItem } from "@/features/records/types";
import { useDemoApp } from "./demo-app-provider";

export function EditRecordDialog({
  record,
  onClose,
}: {
  record: RecordItem | null;
  onClose: () => void;
}) {
  if (!record) return null;
  return <EditRecordForm key={record.id} record={record} onClose={onClose} />;
}

function EditRecordForm({
  record,
  onClose,
}: {
  record: RecordItem;
  onClose: () => void;
}) {
  const { categories, movementTypes, updateRecord } = useDemoApp();
  const [date, setDate] = React.useState(record.date ?? "");
  const [description, setDescription] = React.useState(record.description);
  const [movementTypeId, setMovementTypeId] = React.useState(
    record.movementTypeId,
  );
  const [amount, setAmount] = React.useState(String(record.amount));
  const [category, setCategory] = React.useState(record.category ?? "");
  const [method, setMethod] = React.useState(record.method ?? "");
  const [reference, setReference] = React.useState(record.reference ?? "");
  const [notes, setNotes] = React.useState(record.notes ?? "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (description.trim().length < 3) {
      setError("La descripción debe tener al menos 3 caracteres.");
      return;
    }
    if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0) {
      setError("El monto debe ser un número entero mayor a cero.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateRecord(record.id, {
        date: date || null,
        description: description.trim(),
        movementTypeId,
        amount: numericAmount,
        category: category || undefined,
        method: method || undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch {
      setError("No se pudo guardar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
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
                  Editar movimiento
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-xs text-white/65">
                  Corregí los datos. La fecha puede quedar vacía.
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
            onSubmit={(event) => void save(event)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="edit-record-date">Fecha (opcional)</Label>
                  <Input
                    id="edit-record-date"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Tipo de movimiento</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {movementTypes.map((type) => {
                      const selected = movementTypeId === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setMovementTypeId(type.id)}
                          style={{
                            borderColor: selected ? type.color : undefined,
                            backgroundColor: selected
                              ? `color-mix(in srgb, ${type.color} 9%, white)`
                              : undefined,
                          }}
                          className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${selected ? "ring-2 ring-black/5" : "border-[#e0e7e2] bg-white hover:bg-[#f8fbf8]"}`}
                        >
                          <span
                            className="grid size-9 place-items-center rounded-xl"
                            style={{
                              color: type.color,
                              backgroundColor: `color-mix(in srgb, ${type.color} 14%, white)`,
                            }}
                          >
                            {type.code === "monthly_transfer" ? (
                              <ArrowLeftRight className="size-4" />
                            ) : (
                              <ReceiptText className="size-4" />
                            )}
                          </span>
                          <span
                            className="text-sm font-bold"
                            style={{ color: type.color }}
                          >
                            {type.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="edit-record-description">Descripción</Label>
                  <Input
                    id="edit-record-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-record-amount">Monto en guaraníes</Label>
                  <Input
                    id="edit-record-amount"
                    className="h-14 border-[#bfd0c1] bg-[#f2f7f1] text-xl font-extrabold tabular-nums text-[#173d2f]"
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-record-category">Categoría</Label>
                  <Select
                    id="edit-record-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                  {categories.length === 0 && (
                    <p className="mt-1.5 text-xs text-muted">
                      Todavía no hay categorías. Podés crearlas desde{" "}
                      <Link
                        href="/configuracion"
                        className="font-semibold text-brand underline"
                      >
                        Configuración
                      </Link>
                      .
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="edit-record-method">Medio de pago</Label>
                  <Select
                    id="edit-record-method"
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                  >
                    <option value="">No especificado</option>
                    <option>Transferencia</option>
                    <option>Efectivo</option>
                    <option>Cheque</option>
                    <option>Tarjeta</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-record-reference">Referencia</Label>
                  <Input
                    id="edit-record-reference"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="edit-record-notes">Observaciones</Label>
                  <Textarea
                    id="edit-record-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>
              </div>
              {error && (
                <p
                  role="alert"
                  className="mt-4 text-sm font-medium text-danger"
                >
                  {error}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t bg-white px-5 py-4 sm:px-7">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {!saving && <Check className="size-4" />}
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

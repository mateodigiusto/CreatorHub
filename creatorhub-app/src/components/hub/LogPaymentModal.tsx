"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/lib/store";
import { useClients, formatMoney } from "@/lib/demo/clients";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LogPaymentModal({
  open,
  onClose,
  presetClientId,
}: {
  open: boolean;
  onClose: () => void;
  presetClientId?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { clients, logPayment } = useClients();
  const { showToast, theme } = useAppState();

  const [clientId, setClientId] = useState(presetClientId ?? clients[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!clientId || !n) return;
    logPayment({
      clientId,
      amount: n,
      date: new Date(date + "T12:00:00").toISOString(),
      note: note.trim() || undefined,
    });
    showToast(`Logged ${formatMoney(n)}`);
    setAmount("");
    setNote("");
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="bg-transparent p-0 backdrop:bg-text/40 backdrop:backdrop-blur-sm"
    >
      <form
        onSubmit={submit}
        style={{ colorScheme: theme }}
        className="bg-surface border border-border rounded-[16px] w-[min(440px,92vw)] shadow-[0_24px_60px_rgba(11,18,32,0.22)]"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border">
          <h2 className="text-[16px] font-semibold text-text">Log a payment</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-md text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {!presetClientId && (
            <Field label="Client">
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={inputCls}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[13px]">
                  $
                </span>
                <input
                  autoFocus
                  type="number"
                  min={0}
                  step={50}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1200"
                  className={inputCls + " pl-6"}
                />
              </div>
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Note (optional)">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Launch week rush edit"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            <Check className="w-3.5 h-3.5" /> Log payment
          </Button>
        </div>
      </form>
    </dialog>
  );
}

const inputCls =
  "w-full h-9 rounded-[10px] border border-border bg-surface px-3 text-[13px] text-text placeholder:text-muted focus:outline-none focus:border-accent/50";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-text-2 mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}

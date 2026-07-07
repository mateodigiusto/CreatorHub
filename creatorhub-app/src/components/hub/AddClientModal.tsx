"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/lib/store";
import {
  useClients,
  formatMoney,
  type Cadence,
  type ClientStatus,
} from "@/lib/demo/clients";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddClientModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { addClient } = useClients();
  const { showToast, theme } = useAppState();

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [retainer, setRetainer] = useState("2000");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [status, setStatus] = useState<ClientStatus>("onboarding");
  const [startDate, setStartDate] = useState(today());

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function reset() {
    setName("");
    setCompany("");
    setEmail("");
    setRetainer("2000");
    setCadence("monthly");
    setStatus("onboarding");
    setStartDate(today());
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addClient({
      name: name.trim(),
      company: company.trim() || undefined,
      contactEmail: email.trim() || undefined,
      retainer: Number(retainer) || 0,
      cadence,
      startDate: new Date(startDate + "T12:00:00").toISOString(),
      status,
    });
    showToast(`${name.trim()} added`);
    reset();
    onClose();
  }

  const amount = Number(retainer) || 0;

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
        className="bg-surface border border-border rounded-[16px] w-[min(520px,92vw)] max-h-[88vh] overflow-y-auto shadow-[0_24px_60px_rgba(11,18,32,0.22)]"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 sticky top-0 bg-surface border-b border-border">
          <h2 className="text-[16px] font-semibold text-text">Add a client</h2>
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
          <Field label="Client name">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aria Wellness"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Company (optional)">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Aria Wellness Co."
                className={inputCls}
              />
            </Field>
            <Field label="Contact email (optional)">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maya@aria.com"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Retainer"
              hint={cadence === "monthly" ? `${formatMoney(amount)}/mo` : formatMoney(amount)}
            >
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[13px]">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={retainer}
                  onChange={(e) => setRetainer(e.target.value)}
                  className={inputCls + " pl-6"}
                />
              </div>
            </Field>
            <Field label="Billing">
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value as Cadence)}
                className={inputCls}
              >
                <option value="monthly">Monthly retainer</option>
                <option value="one_time">One-time project</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ClientStatus)}
                className={inputCls}
              >
                <option value="onboarding">Onboarding</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </Field>
            <Field label="Start date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <p className="text-[11.5px] text-muted -mt-1">
            Active monthly clients back-fill retainer payments from their start
            date, so revenue shows up right away.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border sticky bottom-0 bg-surface">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            <Plus className="w-3.5 h-3.5" /> Add client
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
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium text-text-2">{label}</span>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Plus,
  Link2,
  Copy,
  Mail,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AreaChart } from "@/components/charts/AreaChart";
import { LogPaymentModal } from "@/components/hub/LogPaymentModal";
import { StatusBadge } from "@/components/team/bits";
import { useDemoTeam, dueLabel } from "@/lib/demo/team";
import { useAppState } from "@/lib/store";
import {
  useClients,
  formatMoney,
  totalCollected,
  monthlyRevenueSeries,
  CLIENT_STATUS_LABEL,
  CLIENT_STATUS_TONE,
  type ClientStatus,
} from "@/lib/demo/clients";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    clientById,
    paymentsForClient,
    setClientStatus,
    toggleOnboardingStep,
    removeClient,
  } = useClients();
  const { tasks } = useDemoTeam();
  const { showToast } = useAppState();
  const [logOpen, setLogOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const client = clientById(params.id);

  if (!client) {
    return (
      <div className="py-20 text-center">
        <p className="text-[14px] text-muted">This client doesn&apos;t exist.</p>
        <Link href="/hub" className="text-accent text-[13px] mt-2 inline-block">
          ← Back to Clients &amp; Revenue
        </Link>
      </div>
    );
  }

  const payments = paymentsForClient(client.id);
  const collected = totalCollected(payments);
  const series = monthlyRevenueSeries(payments, 6);
  const wip = tasks.filter(
    (t) => t.client === client.name && t.status !== "done",
  );
  const onboardDone = client.onboarding.filter((o) => o.done).length;
  const portalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/client-portal?c=${client.id}`
      : "";

  function copyPortal() {
    navigator.clipboard?.writeText(portalUrl).catch(() => {});
    showToast("Client portal link copied");
  }

  function doRemove() {
    if (!client) return;
    removeClient(client.id);
    showToast(`${client.name} removed`);
    router.push("/hub");
  }

  return (
    <>
      <Link
        href="/hub"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-text mb-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Clients &amp; Revenue
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span
              className="w-9 h-9 rounded-[10px] grid place-items-center text-white text-[14px] font-semibold"
              style={{ background: client.avatar }}
            >
              {client.name.slice(0, 2).toUpperCase()}
            </span>
            {client.name}
            <Badge tone={CLIENT_STATUS_TONE[client.status]}>
              {CLIENT_STATUS_LABEL[client.status]}
            </Badge>
          </span>
        }
        description={client.company}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={client.status}
              onChange={(e) =>
                setClientStatus(client.id, e.target.value as ClientStatus)
              }
              className="h-9 rounded-[10px] border border-border bg-surface px-3 text-[13px] text-text cursor-pointer focus:outline-none focus:border-accent/50"
            >
              <option value="active">Active</option>
              <option value="onboarding">Onboarding</option>
              <option value="paused">Paused</option>
            </select>
            <Button onClick={() => setLogOpen(true)}>
              <Plus className="w-4 h-4" /> Log payment
            </Button>
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-surface text-[13px] text-text-2 hover:text-error hover:border-error/40 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
        {/* left column */}
        <div className="flex flex-col gap-5">
          {/* revenue */}
          <div className="bg-surface border border-border rounded-[14px] card-base overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4">
              <div>
                <div className="text-[12px] text-muted">Collected from this client</div>
                <div
                  className="text-[26px] font-semibold text-text tracking-[-0.02em]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatMoney(collected)}
                </div>
              </div>
              {client.retainer > 0 && (
                <div className="text-right">
                  <div className="text-[12px] text-muted">Retainer</div>
                  <div className="text-[15px] font-semibold text-accent">
                    {formatMoney(client.retainer)}
                    {client.cadence === "monthly" ? "/mo" : ""}
                  </div>
                </div>
              )}
            </div>
            <div className="px-2 pb-1">
              <AreaChart data={series} height={150} />
            </div>
          </div>

          {/* work in progress */}
          <div className="bg-surface border border-border rounded-[14px] card-base p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-text">
                Work in progress
              </h3>
              <span className="text-[11.5px] text-muted">
                {wip.length} active
              </span>
            </div>
            {wip.length === 0 ? (
              <p className="text-[12.5px] text-muted py-2">
                Nothing in flight for {client.name} right now.
              </p>
            ) : (
              <ul className="list-none m-0 p-0 flex flex-col divide-y divide-border">
                {wip.map((t) => {
                  const due = dueLabel(t.dueDate);
                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <span className="flex-1 text-[13px] text-text truncate">
                        {t.title}
                      </span>
                      <StatusBadge status={t.status} />
                      <span
                        className={
                          "text-[11.5px] w-24 text-right " +
                          (due.overdue ? "text-error" : "text-muted")
                        }
                      >
                        {due.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              href="/production"
              className="inline-block mt-3 text-[12.5px] text-accent hover:underline"
            >
              Open in Production →
            </Link>
          </div>

          {/* payment history */}
          <div className="bg-surface border border-border rounded-[14px] card-base p-5">
            <h3 className="text-[14px] font-semibold text-text mb-3">
              Payment history
            </h3>
            {payments.length === 0 ? (
              <p className="text-[12.5px] text-muted py-2">No payments yet.</p>
            ) : (
              <ul className="list-none m-0 p-0 flex flex-col divide-y divide-border">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <span
                      className={
                        "w-1.5 h-1.5 rounded-full shrink-0 " +
                        (p.kind === "retainer" ? "bg-success" : "bg-accent")
                      }
                    />
                    <span className="flex-1 min-w-0">
                      <span className="text-[13px] text-text">
                        {p.kind === "retainer" ? "Monthly retainer" : "One-off"}
                      </span>
                      {p.note && (
                        <span className="text-[12px] text-muted"> · {p.note}</span>
                      )}
                    </span>
                    <span className="text-[12px] text-muted">
                      {new Date(p.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span
                      className="text-[13px] font-medium text-text w-20 text-right"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatMoney(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* right column */}
        <div className="flex flex-col gap-5">
          {/* onboarding */}
          <div className="bg-surface border border-border rounded-[14px] card-base p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-text">Onboarding</h3>
              <span className="text-[11.5px] text-muted">
                {onboardDone}/{client.onboarding.length}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mb-3">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{
                  width: `${(onboardDone / client.onboarding.length) * 100}%`,
                }}
              />
            </div>
            <ul className="list-none m-0 p-0 flex flex-col gap-1">
              {client.onboarding.map((o) => (
                <li key={o.id}>
                  <button
                    onClick={() => toggleOnboardingStep(client.id, o.id)}
                    className="w-full flex items-center gap-2.5 py-1.5 px-1.5 rounded-[8px] hover:bg-surface-2 cursor-pointer text-left"
                  >
                    <span
                      className={
                        "w-4 h-4 shrink-0 rounded-[5px] border grid place-items-center transition-colors " +
                        (o.done
                          ? "bg-accent border-accent text-white"
                          : "border-border")
                      }
                    >
                      {o.done && <Check className="w-3 h-3" />}
                    </span>
                    <span
                      className={
                        "text-[13px] " +
                        (o.done ? "text-muted line-through" : "text-text")
                      }
                    >
                      {o.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* client portal link */}
          <div className="bg-surface border border-border rounded-[14px] card-base p-5">
            <h3 className="text-[14px] font-semibold text-text flex items-center gap-2">
              <Link2 className="w-4 h-4 text-accent" /> Client portal
            </h3>
            <p className="text-[12.5px] text-muted mt-1 mb-3">
              Share this link — your client sees a calm, read-only view of what&apos;s
              in progress. No sign-in, no other clients, no numbers.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={portalUrl}
                className="flex-1 h-9 rounded-[10px] border border-border bg-surface-2 px-3 text-[12px] text-text-2 focus:outline-none"
              />
              <button
                onClick={copyPortal}
                className="h-9 px-3 shrink-0 inline-flex items-center gap-1.5 rounded-[10px] btn-primary text-white text-[13px] cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
            <Link
              href={`/client-portal?c=${client.id}`}
              className="inline-block mt-3 text-[12.5px] text-accent hover:underline"
            >
              Preview the client&apos;s view →
            </Link>
          </div>

          {/* contact */}
          {client.contactEmail && (
            <div className="bg-surface border border-border rounded-[14px] card-base p-5">
              <h3 className="text-[14px] font-semibold text-text mb-2">
                Contact
              </h3>
              <a
                href={`mailto:${client.contactEmail}`}
                className="inline-flex items-center gap-2 text-[13px] text-accent hover:underline"
              >
                <Mail className="w-3.5 h-3.5" /> {client.contactEmail}
              </a>
            </div>
          )}
        </div>
      </div>

      <LogPaymentModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        presetClientId={client.id}
      />

      {confirmRemove && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-text/40 backdrop-blur-sm px-4"
          onClick={() => setConfirmRemove(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-border rounded-[16px] w-[min(420px,92vw)] p-5 shadow-[0_24px_60px_rgba(11,18,32,0.22)]"
          >
            <div className="w-10 h-10 rounded-[11px] bg-error/10 grid place-items-center mb-3">
              <Trash2 className="w-4.5 h-4.5 text-error" />
            </div>
            <h2 className="text-[16px] font-semibold text-text">
              Remove {client.name}?
            </h2>
            <p className="text-[13px] text-muted mt-1.5">
              This off-boards {client.name} and deletes their payment history from
              your dashboard. Tasks on the Production board stay. This can&apos;t be
              undone.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <Button variant="ghost" onClick={() => setConfirmRemove(false)}>
                Cancel
              </Button>
              <Button onClick={doRemove} className="!bg-error !text-white">
                <Trash2 className="w-3.5 h-3.5" /> Remove client
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAppState } from "@/lib/store";
import { Sun, Moon, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  displayNameFor,
  handleFor,
  creatorTypeLabel,
} from "@/lib/onboarding/personalize";
import type { Trial } from "@/lib/onboarding/types";

const PLAN_PRICING = {
  standard: { monthly: 67, annual: 27 },
  pro:      { monthly: 149, annual: 60 },
} as const;

function planDescription(trial: Trial | undefined): string {
  if (!trial) return "Standard · monthly";
  const name = trial.plan === "pro" ? "Pro" : "Standard";
  const cycle = trial.cycle === "annual" ? "annual" : "monthly";
  return `${name} · ${cycle}`;
}

function planPrice(trial: Trial | undefined): number {
  if (!trial) return PLAN_PRICING.standard.monthly;
  return PLAN_PRICING[trial.plan][trial.cycle];
}

function planFeatures(trial: Trial | undefined): string[] {
  const isPro = trial?.plan === "pro";
  if (isPro) {
    return [
      "Unlimited users",
      "Multi-client workspaces",
      "Client-ready reports",
      "Priority support",
    ];
  }
  return [
    "1 user",
    "All Sequence Studio features",
    "Calendar + Reports",
    "AI ideas & insights",
  ];
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme, profile, setProfile, clearProfile, showToast } = useAppState();
  const initialName = displayNameFor(profile);
  const initialHandle = handleFor(profile);
  const ct = creatorTypeLabel(profile);

  /* Controlled drafts so the inputs work + the save button has something to send. */
  const [nameDraft, setNameDraft] = useState(initialName);
  const [handleDraft, setHandleDraft] = useState(initialHandle);
  const [savingProfile, setSavingProfile] = useState(false);
  const dirty = nameDraft !== initialName || handleDraft !== initialHandle;

  function restartSetup() {
    clearProfile();
    router.push("/onboarding");
  }

  function cancelEdit() {
    setNameDraft(initialName);
    setHandleDraft(initialHandle);
  }

  async function saveProfile() {
    if (!dirty || savingProfile) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          displayName: nameDraft,
          handle: handleDraft,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(`Couldn't save: ${err.error ?? res.status}`);
        setSavingProfile(false);
        return;
      }
      /* Update local state so the Sidebar reflects immediately. */
      if (profile) {
        setProfile({
          ...profile,
          displayName: nameDraft.trim() || undefined,
          handle: handleDraft.trim() || undefined,
        });
      }
      showToast("Profile saved");
    } catch {
      showToast("Network error. Try again.");
    } finally {
      setSavingProfile(false);
    }
  }

  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [openingPortal, setOpeningPortal] = useState(false);

  async function openPortal() {
    setOpeningPortal(true);
    try {
      const res = await fetch("/api/stripe/portal-session", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const json = (await res.json()) as { url: string };
        window.location.href = json.url;
        return;
      }
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      if (err.error === "stripe_not_configured") {
        showToast("Billing not set up yet — coming soon.");
      } else if (err.error === "no_customer") {
        showToast("No subscription on file. Restart setup to start a trial.");
      } else {
        showToast(`Couldn't open billing: ${err.error ?? res.status}`);
      }
    } catch {
      showToast("Network error. Try again.");
    } finally {
      setOpeningPortal(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setDeleteError(err.error ?? `Failed (${res.status})`);
        setDeleting(false);
        return;
      }
      const json = (await res.json()) as { confirmationCode: string };
      clearProfile();
      router.replace(`/data-deletion-status?code=${json.confirmationCode}`);
    } catch {
      setDeleteError("Network error. Try again.");
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Account, workspace, and preferences."
      />

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader title="Profile" description="How you appear in CreatorHub" />
          <div className="space-y-4">
            <Field
              label="Name"
              value={nameDraft}
              onChange={setNameDraft}
              placeholder="Your full name"
            />
            <Field
              label="Handle"
              value={handleDraft}
              onChange={setHandleDraft}
              placeholder="creatorhandle"
              prefix="@"
            />
            <Field label="Workspace" value={ct} readOnly />
          </div>
          <div className="flex items-center justify-between gap-2 mt-6 pt-5 border-t border-border">
            <div className="flex items-center gap-2">
              <Button onClick={saveProfile} disabled={!dirty || savingProfile}>
                {savingProfile ? "Saving…" : "Save changes"}
              </Button>
              <Button variant="ghost" onClick={cancelEdit} disabled={!dirty || savingProfile}>
                Cancel
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={restartSetup}>
              <RefreshCw className="w-3.5 h-3.5" /> Restart workspace setup
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Plan" description={planDescription(profile?.trial)} />
          <div className="text-[26px] font-semibold tracking-tight text-text">
            ${planPrice(profile?.trial)}
            <span className="text-[14px] text-muted font-normal">/mo</span>
          </div>
          {profile?.trial?.cycle === "annual" && (
            <div className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase text-accent bg-accent-soft border border-accent-border px-1.5 py-0.5 rounded tracking-wide">
              60% off · billed yearly
            </div>
          )}
          <ul className="mt-4 space-y-2 text-[13px] text-muted">
            {planFeatures(profile?.trial).map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
          <Button
            variant="outline"
            className="mt-5 w-full"
            onClick={openPortal}
            disabled={openingPortal}
          >
            {openingPortal ? "Opening…" : "Manage subscription"}
          </Button>
        </Card>

        <Card className="col-span-2">
          <CardHeader
            title="Appearance"
            description="Choose how CreatorHub looks on this device"
          />
          <div className="grid grid-cols-2 gap-2.5">
            <ThemeOption
              label="Light"
              hint="Warm off-white surfaces, navy text"
              icon={<Sun className="w-4 h-4" />}
              active={theme === "light"}
              onClick={() => setTheme("light")}
              preview="light"
            />
            <ThemeOption
              label="Dark"
              hint="Premium midnight navy"
              icon={<Moon className="w-4 h-4" />}
              active={theme === "dark"}
              onClick={() => setTheme("dark")}
              preview="dark"
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Workspace" />
          <div className="text-[13px] text-muted leading-relaxed">
            Single workspace.{" "}
            <span className="text-text font-medium">Team mode</span> coming soon.
          </div>
          <div className="mt-4">
            <Badge tone="neutral">v0.1 · Demo</Badge>
          </div>
        </Card>

        <Card className="col-span-2">
          <CardHeader title="Notifications" description="Choose what you hear about" />
          <div className="space-y-3.5">
            <Toggle label="Weekly report ready" checked />
            <Toggle label="Top post detected" checked />
            <Toggle label="Content overdue" checked />
            <Toggle label="New AI ideas available" />
          </div>
        </Card>

        <Card className="col-span-3 border-red-500/30">
          <CardHeader
            title="Danger zone"
            description="Permanent account actions"
          />
          {!confirmingDelete ? (
            <div className="flex items-center justify-between gap-4">
              <div className="text-[13px] text-muted leading-relaxed max-w-prose">
                Delete your CreatorHub account. We&apos;ll soft-delete
                immediately (you can&apos;t sign back in) and hard-delete
                all data within 30 days, including connected platform
                tokens, uploaded assets, and saved sequences. This cannot
                be undone.
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmingDelete(true)}
                className="border-red-500/40 text-red-600 hover:bg-red-500/5 dark:text-red-400 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete account
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-[10px] border border-red-500/30 bg-red-500/5 text-[12.5px] text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Confirm deletion. You&apos;ll be signed out immediately
                  and all data scheduled for hard-delete in 30 days.
                </span>
              </div>
              {deleteError && (
                <div className="text-[12px] text-red-600 dark:text-red-400">
                  {deleteError}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="!bg-red-600 hover:!bg-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleting ? "Deleting…" : "Yes, delete my account"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteError(null);
                  }}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <div className="text-[12px] text-muted mb-1">{label}</div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13.5px] text-muted pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          readOnly={readOnly || !onChange}
          placeholder={placeholder}
          className={cn(
            "w-full h-10 pr-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20",
            prefix ? "pl-7" : "pl-3",
            (readOnly || !onChange) && "text-muted",
          )}
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked = false,
}: {
  label: string;
  checked?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-[13.5px] text-text">{label}</span>
      <span
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-surface-3"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-4"
          )}
        />
      </span>
    </label>
  );
}

function ThemeOption({
  label,
  hint,
  icon,
  active,
  onClick,
  preview,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  preview: "light" | "dark";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "lift text-left rounded-[12px] border p-3 bg-surface card-base flex items-center gap-3 transition-colors",
        active
          ? "border-accent/40 ring-2 ring-accent/15"
          : "border-border"
      )}
    >
      <div
        className="w-12 h-9 rounded-md shrink-0 flex flex-col overflow-hidden"
        style={{
          background:
            preview === "light"
              ? "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 60%)"
              : "linear-gradient(180deg, #070B14 0%, #0B1220 60%)",
          border:
            preview === "light"
              ? "1px solid #D8E0EA"
              : "1px solid #1F2A3D",
        }}
      >
        <div
          className="h-2"
          style={{
            background: preview === "light" ? "#0B1220" : "#172033",
          }}
        />
        <div className="flex-1 flex items-center gap-1 px-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "#2563EB" }}
          />
          <div
            className="flex-1 h-1 rounded-full"
            style={{
              background: preview === "light" ? "#E2E8F0" : "#1F2A3D",
            }}
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-text/70">{icon}</span>
          <span className="text-[13px] font-medium text-text">{label}</span>
        </div>
        <div className="text-[11.5px] text-muted mt-0.5 leading-snug">
          {hint}
        </div>
      </div>
    </button>
  );
}

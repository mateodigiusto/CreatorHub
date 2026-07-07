"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/lib/store";
import { RefreshCw, Trash2, AlertTriangle, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  displayNameFor,
  handleFor,
  creatorTypeLabel,
} from "@/lib/onboarding/personalize";
import { creatorTypes } from "@/lib/onboarding/options";
import type { CreatorType, Trial, Platform } from "@/lib/onboarding/types";

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
  const { profile, setProfile, clearProfile, showToast } = useAppState();
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

        <DashboardModeCard />


        <Card className="col-span-2">
          <CardHeader title="Notifications" description="Choose what you hear about" />
          <div className="space-y-3.5">
            <Toggle
              label="Email me about invites, messages, and tasks"
              checked={profile?.emailNotifications ?? true}
              onChange={async (next) => {
                /* Optimistic UI — flip immediately, persist after. */
                if (profile) setProfile({ ...profile, emailNotifications: next });
                try {
                  const res = await fetch("/api/profile/update", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ emailNotifications: next }),
                  });
                  if (!res.ok) throw new Error("non_ok");
                } catch {
                  /* Rollback on failure. */
                  if (profile) {
                    setProfile({ ...profile, emailNotifications: !next });
                  }
                  showToast("Couldn't save preference. Try again.");
                }
              }}
            />
            <div className="text-[12px] text-muted leading-relaxed pt-1">
              In-app notifications (the bell) always fire. This toggle controls
              whether we also email you. More notification types coming soon.
            </div>
          </div>
        </Card>

        <ScriptPreferencesCard />

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
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange?: (next: boolean) => void | Promise<void>;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-[13.5px] text-text">{label}</span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => {
          if (onChange) void onChange(e.target.checked);
        }}
      />
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

/* ─── Dashboard mode (role picker) ───────────────────────────────── */

function DashboardModeCard() {
  const { profile, setProfile, showToast } = useAppState();
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState<CreatorType | null>(null);

  const current = profile?.creatorType;
  const currentLabel = current
    ? creatorTypes.find((c) => c.key === current)?.label ?? current
    : "Not set";

  async function pickRole(next: CreatorType) {
    if (!profile || saving || next === current) {
      setPicking(false);
      return;
    }
    setSaving(next);
    /* Optimistic — swap immediately so the sidebar reorders. Revert on failure. */
    const prev = profile.creatorType;
    setProfile({ ...profile, creatorType: next });
    try {
      const res = await fetch("/api/profile/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ creatorType: next }),
      });
      if (!res.ok) throw new Error("non_ok");
      showToast("Dashboard mode updated");
      setPicking(false);
    } catch {
      setProfile({ ...profile, creatorType: prev });
      showToast("Couldn't change role. Try again.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Dashboard mode"
        description="Reorders the sidebar + dashboard around how you work"
      />
      <div className="text-[13.5px] text-text font-medium">{currentLabel}</div>
      <div className="text-[12px] text-muted mt-1 leading-relaxed">
        Switch any time — your data stays.
      </div>
      {!picking ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setPicking(true)}
        >
          Change role
        </Button>
      ) : (
        <div className="mt-4 space-y-1.5">
          {creatorTypes.map((c) => {
            const isCurrent = c.key === current;
            const isSaving = saving === c.key;
            return (
              <button
                key={c.key}
                onClick={() => pickRole(c.key)}
                disabled={!!saving}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-md border text-[12.5px] transition-colors flex items-center justify-between gap-2",
                  isCurrent
                    ? "border-accent/40 bg-accent-soft text-text"
                    : "border-border bg-surface text-text hover:border-accent/30 hover:bg-accent-soft cursor-pointer",
                  saving && !isSaving && "opacity-50",
                )}
              >
                <span className="font-medium truncate">{c.label}</span>
                {isCurrent && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                {isSaving && <span className="text-[10px] text-muted">saving…</span>}
              </button>
            );
          })}
          <button
            onClick={() => setPicking(false)}
            disabled={!!saving}
            className="w-full text-center text-[11.5px] text-muted hover:text-text mt-1 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </Card>
  );
}

/* ─── Script preferences (defaults for /scripts generation) ──────── */

type ScriptFormat = "reel" | "longform" | "vsl" | "story_sequence" | "email";
type ScriptFrequency =
  | "daily" | "three_x_week" | "weekly" | "biweekly" | "monthly" | "custom";

type ScriptPrefs = {
  scripts_per_period: number;
  frequency: ScriptFrequency;
  custom_cron: string | null;
  default_format: ScriptFormat;
  default_platforms: Platform[];
  monthly_cap: number | null;
};

const FORMAT_LABELS: Record<ScriptFormat, string> = {
  reel: "Short-form Reel",
  longform: "Long-form video",
  vsl: "VSL",
  story_sequence: "Story sequence",
  email: "Email script",
};
const FREQUENCY_LABELS: Record<ScriptFrequency, string> = {
  daily: "Daily",
  three_x_week: "3× / week",
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  custom: "Custom (cron)",
};
const PLATFORM_OPTIONS: Platform[] = [
  "instagram", "tiktok", "youtube", "linkedin", "x", "facebook",
];

function ScriptPreferencesCard() {
  const { profile, showToast } = useAppState();
  const [prefs, setPrefs] = useState<ScriptPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ScriptPrefs | null>(null);

  /* Editor role doesn't generate scripts (they edit, not write) — hide the
     card entirely for them. Same for users who haven't onboarded yet. */
  const visible = profile?.creatorType !== "editor" && !!profile;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/script-preferences", { credentials: "include" });
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json = (await res.json()) as { preferences: ScriptPrefs };
      setPrefs(json.preferences);
      setDraft(json.preferences);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void load();
  }, [load, visible]);

  if (!visible) return null;

  const dirty =
    !!draft && !!prefs && JSON.stringify(draft) !== JSON.stringify(prefs);

  async function save() {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/script-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scriptsPerPeriod: draft.scripts_per_period,
          frequency: draft.frequency,
          customCron: draft.custom_cron,
          defaultFormat: draft.default_format,
          defaultPlatforms: draft.default_platforms,
          monthlyCap: draft.monthly_cap,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(`Couldn't save: ${err.error ?? res.status}`);
        return;
      }
      const json = (await res.json()) as { preferences: ScriptPrefs };
      setPrefs(json.preferences);
      setDraft(json.preferences);
      showToast("Script preferences saved");
    } catch {
      showToast("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function togglePlatform(p: Platform) {
    if (!draft) return;
    const has = draft.default_platforms.includes(p);
    const next = has
      ? draft.default_platforms.filter((x) => x !== p)
      : [...draft.default_platforms, p];
    /* Don't allow zero platforms — at least one required. */
    if (next.length === 0) return;
    setDraft({ ...draft, default_platforms: next });
  }

  return (
    <Card className="col-span-3">
      <CardHeader
        title="Script preferences"
        description="Defaults for the AI Script Generator. Per-script overrides live in /scripts."
      />
      {loading || !draft ? (
        <div className="h-24 rounded-md bg-surface-2 animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-[12px] text-muted mb-1">Scripts per period</div>
              <input
                type="number"
                min={1}
                max={100}
                value={draft.scripts_per_period}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                  setDraft({ ...draft, scripts_per_period: n });
                }}
                className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <div className="text-[12px] text-muted mb-1">Frequency</div>
              <select
                value={draft.frequency}
                onChange={(e) =>
                  setDraft({ ...draft, frequency: e.target.value as ScriptFrequency })
                }
                className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20 cursor-pointer"
              >
                {(Object.keys(FREQUENCY_LABELS) as ScriptFrequency[]).map((f) => (
                  <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[12px] text-muted mb-1">Default format</div>
              <select
                value={draft.default_format}
                onChange={(e) =>
                  setDraft({ ...draft, default_format: e.target.value as ScriptFormat })
                }
                className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20 cursor-pointer"
              >
                {(Object.keys(FORMAT_LABELS) as ScriptFormat[]).map((f) => (
                  <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
                ))}
              </select>
            </div>
          </div>

          {draft.frequency === "custom" && (
            <div className="mt-4">
              <div className="text-[12px] text-muted mb-1">Cron expression</div>
              <input
                type="text"
                value={draft.custom_cron ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, custom_cron: e.target.value || null })
                }
                placeholder="0 9 * * 1   (Mondays 9am)"
                className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text font-mono focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
              />
            </div>
          )}

          <div className="mt-4">
            <div className="text-[12px] text-muted mb-1.5">Default platforms</div>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORM_OPTIONS.map((p) => {
                const active = draft.default_platforms.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "px-2.5 py-1 rounded-full border text-[12px] capitalize transition-colors cursor-pointer",
                      active
                        ? "border-accent/40 bg-accent-soft text-accent"
                        : "border-border bg-surface text-muted hover:border-accent/30 hover:text-text",
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border">
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save preferences"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => prefs && setDraft(prefs)}
              disabled={!dirty || saving}
            >
              Cancel
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

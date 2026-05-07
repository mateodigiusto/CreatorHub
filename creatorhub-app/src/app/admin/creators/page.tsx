"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Database,
  AlertCircle,
  Check,
  ArrowLeft,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/cn";

type DirectoryRow = {
  id: string;
  handle: string;
  display_name: string | null;
  primary_platform: string;
  niche: string;
  follower_range: string | null;
  platforms: string[];
  posting_frequency: string | null;
  bio: string | null;
  curated_by: string | null;
  created_at: string;
};

type ParsedRow = {
  handle: string;
  display_name?: string;
  primary_platform: string;
  niche: string;
  follower_range?: string;
  platforms?: string[];
  posting_frequency?: string;
  bio?: string;
};

const SAMPLE_CSV = `handle,display_name,primary_platform,niche,follower_range,posting_frequency,bio
@hubermanlab,Andrew Huberman,youtube,Health & Science,over_1m,weekly,Neuroscientist breaking down protocols
@thedailystoic,Ryan Holiday,instagram,Philosophy,250k_1m,daily,Stoic wisdom for modern life`;

export default function AdminCreatorsPage() {
  const router = useRouter();
  const { showToast } = useAppState();
  const [creators, setCreators] = useState<DirectoryRow[] | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState<{
    inserted: number;
    attempted: number;
    skipped: Array<{ handle: string; reason: string }>;
  } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/creators", { credentials: "include" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setError(err.error ?? `Failed (${res.status})`);
        setCreators([]);
        return;
      }
      const json = (await res.json()) as {
        creators: DirectoryRow[];
        adminEmail: string;
      };
      setCreators(json.creators);
      setAdminEmail(json.adminEmail);
    } catch {
      setError("network_error");
      setCreators([]);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void load();
  }, [load]);

  const parsedRows = parseCsv(csvText);
  const parseError = csvText.trim().length > 0 && parsedRows.length === 0;

  async function runImport() {
    if (parsedRows.length === 0 || importing) return;
    setImporting(true);
    setLastImport(null);
    try {
      const res = await fetch("/api/admin/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rows: parsedRows }),
      });
      const json = (await res.json()) as {
        inserted?: number;
        attempted?: number;
        skipped?: Array<{ handle: string; reason: string }>;
        error?: string;
      };
      if (!res.ok) {
        showToast(`Import failed: ${json.error ?? res.status}`);
        if (json.skipped) {
          setLastImport({
            inserted: 0,
            attempted: json.attempted ?? 0,
            skipped: json.skipped,
          });
        }
        return;
      }
      setLastImport({
        inserted: json.inserted ?? 0,
        attempted: json.attempted ?? 0,
        skipped: json.skipped ?? [],
      });
      setCsvText("");
      showToast(`Imported ${json.inserted ?? 0} creator${(json.inserted ?? 0) === 1 ? "" : "s"}.`);
      void load();
    } catch {
      showToast("Network error. Try again.");
    } finally {
      setImporting(false);
    }
  }

  if (error) {
    const isAuth = error === "unauthorized" || error === "not_admin" || error === "admin_disabled_in_prod";
    return (
      <>
        <PageHeader
          title="Admin · Creators"
          description="Bulk import + manage the global creator directory."
        />
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[14px] font-semibold text-text">
                {isAuth ? "Not authorized" : "Couldn't load admin tool"}
              </div>
              <div className="text-[12.5px] text-muted mt-1 leading-relaxed">
                {isAuth
                  ? "Your email isn't in the ADMIN_EMAILS allowlist. Add it in env config and redeploy, or sign in with an allowed account."
                  : `Error: ${error}`}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => router.push("/dashboard")}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
              </Button>
            </div>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Admin · Creators"
        description={
          adminEmail
            ? `Bulk-import + browse the global creator directory · signed in as ${adminEmail}`
            : "Bulk-import + browse the global creator directory."
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push("/creators")}>
            View public directory
          </Button>
        }
      />

      <Card className="mb-5">
        <CardHeader
          title="Bulk import from CSV"
          description="Paste a CSV with a header row. Required columns: handle, primary_platform, niche."
        />

        <div className="text-[12px] text-muted mb-2 leading-relaxed">
          <strong className="text-text font-semibold">primary_platform</strong>:{" "}
          instagram | tiktok | youtube | linkedin | x | facebook
          <br />
          <strong className="text-text font-semibold">follower_range</strong>:{" "}
          under_10k | 10k_50k | 50k_250k | 250k_1m | over_1m (optional)
          <br />
          <strong className="text-text font-semibold">posting_frequency</strong>:{" "}
          rarely | weekly | few_per_week | daily | multi_daily (optional)
          <br />
          <strong className="text-text font-semibold">platforms</strong>:{" "}
          pipe-separated, e.g. <code className="text-text">instagram|tiktok</code> (optional, defaults to primary)
          <br />
          Re-running the same handle is safe — duplicates on (handle, primary_platform) skip silently.
        </div>

        <textarea
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setLastImport(null);
          }}
          placeholder={SAMPLE_CSV}
          rows={8}
          className="w-full px-3 py-2 rounded-[10px] bg-surface-2 border border-border text-[12.5px] text-text font-mono focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20 resize-y"
        />

        <div className="flex items-center justify-between gap-3 mt-3">
          <div className="text-[12px] text-muted">
            {parseError && (
              <span className="text-red-600 dark:text-red-400">
                Couldn&apos;t parse CSV. Check the header row + required columns.
              </span>
            )}
            {!parseError && parsedRows.length > 0 && (
              <span>
                {parsedRows.length} row{parsedRows.length === 1 ? "" : "s"} ready to import.
              </span>
            )}
            {!parseError && parsedRows.length === 0 && csvText.trim().length === 0 && (
              <button
                type="button"
                onClick={() => setCsvText(SAMPLE_CSV)}
                className="text-accent hover:text-accent-2 cursor-pointer font-medium"
              >
                Load sample
              </button>
            )}
          </div>
          <Button
            onClick={runImport}
            disabled={parsedRows.length === 0 || importing}
          >
            <Upload className="w-3.5 h-3.5" />
            {importing ? "Importing…" : `Import ${parsedRows.length || ""}`}
          </Button>
        </div>

        {lastImport && (
          <div className="mt-4 rounded-[10px] border border-border bg-surface-2 px-3 py-2.5">
            <div className="flex items-center gap-2 text-[12.5px] text-text">
              <Check className="w-4 h-4 text-green-600" />
              Imported <strong>{lastImport.inserted}</strong> of{" "}
              <strong>{lastImport.attempted}</strong> rows.
            </div>
            {lastImport.skipped.length > 0 && (
              <div className="mt-2 text-[11.5px] text-muted leading-relaxed">
                <div className="font-semibold text-text mb-1">
                  Skipped {lastImport.skipped.length} row
                  {lastImport.skipped.length === 1 ? "" : "s"}:
                </div>
                <ul className="space-y-0.5">
                  {lastImport.skipped.slice(0, 20).map((s, i) => (
                    <li key={i} className="font-mono">
                      <span className="text-text">{s.handle}</span> — {s.reason}
                    </li>
                  ))}
                  {lastImport.skipped.length > 20 && (
                    <li className="italic">
                      …and {lastImport.skipped.length - 20} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card padded={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.005em] text-text flex items-center gap-2">
              <Database className="w-4 h-4 text-muted" />
              Directory
            </div>
            <div className="text-[12.5px] text-muted mt-0.5">
              {creators === null
                ? "Loading…"
                : `${creators.length} creator${creators.length === 1 ? "" : "s"} (newest 200 shown)`}
            </div>
          </div>
        </div>

        {creators === null ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-md bg-surface-2 border border-border animate-pulse"
              />
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-[13.5px] text-text font-medium">
              No creators yet.
            </div>
            <div className="text-[12px] text-muted mt-1 max-w-[420px] mx-auto">
              Paste a CSV above to seed the directory.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="text-muted text-[11px] uppercase tracking-wide">
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-2.5 font-semibold">Handle</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Niche</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Platform</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Followers</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Frequency</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Curated by</th>
                </tr>
              </thead>
              <tbody>
                {creators.map((c) => (
                  <tr
                    key={c.id}
                    className={cn("border-b border-border last:border-0 hover:bg-accent/[0.04]")}
                  >
                    <td className="px-5 py-2.5">
                      <div className="font-medium text-text">
                        {c.display_name ?? c.handle}
                      </div>
                      {c.display_name && (
                        <div className="text-[11px] text-muted">{c.handle}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-text">{c.niche}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone="neutral">{c.primary_platform}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-muted">
                      {c.follower_range ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-muted">
                      {c.posting_frequency ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-muted truncate max-w-[180px]">
                      {c.curated_by ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/** Parse a CSV with a header row. Naive — doesn't handle quoted commas in
 *  fields, but the seed data shouldn't need them. Pipe-separated for
 *  array fields (platforms). */
function parseCsv(text: string): ParsedRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lines = trimmed.split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const requiredCols = ["handle", "primary_platform", "niche"];
  for (const col of requiredCols) {
    if (!header.includes(col)) return [];
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = parseCsvRow(line);
    const row: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = (cells[j] ?? "").trim();
    }
    if (!row.handle || !row.primary_platform || !row.niche) continue;
    const parsed: ParsedRow = {
      handle: row.handle,
      primary_platform: row.primary_platform,
      niche: row.niche,
    };
    if (row.display_name) parsed.display_name = row.display_name;
    if (row.follower_range) parsed.follower_range = row.follower_range;
    if (row.posting_frequency) parsed.posting_frequency = row.posting_frequency;
    if (row.bio) parsed.bio = row.bio;
    if (row.platforms) {
      parsed.platforms = row.platforms.split("|").map((s) => s.trim()).filter(Boolean);
    }
    rows.push(parsed);
  }
  return rows;
}

/** Minimal CSV cell splitter — supports double-quoted fields with embedded
 *  commas, but not escaped quotes. Good enough for the seed-import use case. */
function parseCsvRow(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  out.push(current);
  return out;
}

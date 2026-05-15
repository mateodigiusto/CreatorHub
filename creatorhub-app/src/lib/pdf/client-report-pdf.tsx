/**
 * @react-pdf/renderer document for an editor → client monthly recap.
 *
 * Mirrors the in-app ReportPanel — 4 stat tiles + top 5 published posts.
 * Used by GET /api/clients/[id]/report/export-pdf.
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

void Font;

const NAVY = "#0B1F3A";
const ACCENT = "#2563EB";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#0F172A",
    lineHeight: 1.5,
  },
  brand: {
    fontSize: 9,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    color: NAVY,
    fontWeight: 700,
    marginBottom: 4,
    lineHeight: 1.2,
  },
  windowLabel: {
    fontSize: 11,
    color: MUTED,
    marginBottom: 22,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    marginBottom: 24,
  },
  statCard: {
    width: "50%",
    padding: 6,
  },
  statInner: {
    border: `1pt solid ${BORDER}`,
    borderRadius: 8,
    padding: 14,
  },
  statLabel: {
    fontSize: 9,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 28,
    color: NAVY,
    fontWeight: 700,
    marginTop: 4,
  },
  statHint: {
    fontSize: 10,
    color: MUTED,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 10,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  postRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottom: `1pt solid ${BORDER}`,
    gap: 10,
  },
  postCaption: {
    fontSize: 11,
    color: "#0F172A",
    flex: 1,
  },
  postMeta: {
    fontSize: 9.5,
    color: MUTED,
    marginTop: 2,
  },
  postValue: {
    fontSize: 11,
    color: ACCENT,
    fontWeight: 700,
    width: 60,
    textAlign: "right",
  },
  emptyHint: {
    fontSize: 10,
    color: MUTED,
    textAlign: "center",
    paddingVertical: 24,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    fontSize: 9,
    color: MUTED,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export type ClientReportPdfData = {
  clientName: string;
  period: "weekly" | "monthly";
  windowStart: string;
  windowEnd: string;
  scripts: { total: number; draft: number; approved: number; used: number };
  sequences: { total: number; draft: number; scheduled: number; published: number };
  postsPublished: number;
  tasksCompleted: number;
  topPosts: Array<{
    caption: string | null;
    platform: string;
    reach: number | null;
    likes: number | null;
    engagementRate: number | null;
    publishedAt: string | null;
  }>;
};

export function ClientReportPdf({ report }: { report: ClientReportPdfData }) {
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const periodLabel = report.period === "weekly" ? "Last 7 days" : "Last 30 days";
  const windowLabel = `${periodLabel} · ${fmtDate(report.windowStart)} → ${fmtDate(
    report.windowEnd,
  )}`;

  return (
    <Document title={`${report.clientName} · Recap`} author="CreatorHub">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.brand}>CreatorHub · Client recap</Text>
        <Text style={styles.title}>{report.clientName}</Text>
        <Text style={styles.windowLabel}>{windowLabel}</Text>

        <View style={styles.grid}>
          <Stat
            label="Scripts"
            value={report.scripts.total}
            hint={`${report.scripts.approved} approved · ${report.scripts.used} used`}
          />
          <Stat
            label="Sequences"
            value={report.sequences.total}
            hint={`${report.sequences.scheduled} scheduled · ${report.sequences.published} published`}
          />
          <Stat
            label="Posts published"
            value={report.postsPublished}
            hint="In window"
          />
          <Stat
            label="Tasks completed"
            value={report.tasksCompleted}
            hint="In window"
          />
        </View>

        <Text style={styles.sectionLabel}>Top performing posts</Text>
        {report.topPosts.length === 0 ? (
          <Text style={styles.emptyHint}>
            Nothing published in this window yet.
          </Text>
        ) : (
          report.topPosts.map((p, i) => (
            <View key={i} style={styles.postRow} wrap={false}>
              <View style={{ flex: 1 }}>
                <Text style={styles.postCaption}>
                  {p.caption ?? "Untitled post"}
                </Text>
                <Text style={styles.postMeta}>
                  {p.platform}
                  {p.publishedAt
                    ? ` · ${new Date(p.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : ""}
                  {p.reach !== null ? ` · ${formatNum(p.reach)} reach` : ""}
                  {p.likes !== null ? ` · ${formatNum(p.likes)} likes` : ""}
                </Text>
              </View>
              <Text style={styles.postValue}>{formatPct(p.engagementRate)}</Text>
            </View>
          ))
        )}

        <View style={styles.footer} fixed>
          <Text>CreatorHub · Generated {fmtDate(new Date().toISOString())}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statInner}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statHint}>{hint}</Text>
      </View>
    </View>
  );
}

function formatNum(v: number | null): string {
  if (v === null || v === undefined) return "—";
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

function formatPct(v: number | null): string {
  if (v === null || v === undefined) return "—";
  const num = Number(v);
  if (Number.isNaN(num)) return "—";
  return `${(num * 100).toFixed(1)}%`;
}

/**
 * @react-pdf/renderer document for a single generated script.
 *
 * Component-driven, server-rendered. Returned by /api/scripts/[id]/export-pdf
 * as a Buffer with a download Content-Disposition header.
 *
 * Layout intentionally minimal — title, status badge, then each section as
 * a labeled block. Brand-tinted accents but no logos until brand assets land.
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

/* @react-pdf bundles Helvetica by default. Skipping custom font registration
   keeps the cold-start fast — Inter would need a network round trip per
   render. Helvetica looks fine for a scripted PDF. */
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
    fontSize: 24,
    color: NAVY,
    fontWeight: 700,
    marginBottom: 12,
    lineHeight: 1.2,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 24,
  },
  badge: {
    fontSize: 9,
    color: ACCENT,
    backgroundColor: "#EBF1FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    border: `1pt solid ${BORDER}`,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  badgeNeutral: {
    fontSize: 9,
    color: MUTED,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    border: `1pt solid ${BORDER}`,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 9,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: 12,
    color: "#0F172A",
    lineHeight: 1.55,
  },
  hookBody: {
    fontSize: 14,
    color: NAVY,
    fontWeight: 700,
    lineHeight: 1.4,
  },
  keyPoint: {
    marginBottom: 10,
    paddingLeft: 12,
    borderLeft: `2pt solid ${ACCENT}`,
  },
  keyPointTitle: {
    fontSize: 11,
    color: NAVY,
    fontWeight: 700,
    marginBottom: 2,
  },
  keyPointBody: {
    fontSize: 11,
    color: "#0F172A",
    lineHeight: 1.5,
  },
  bRoll: {
    backgroundColor: "#F8FAFC",
    border: `1pt solid ${BORDER}`,
    borderRadius: 6,
    padding: 12,
    marginTop: 4,
    fontSize: 10.5,
    color: "#475569",
    lineHeight: 1.5,
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

const FORMAT_LABELS: Record<string, string> = {
  reel: "Reel",
  longform: "Long-form",
  vsl: "VSL",
  story_sequence: "Story sequence",
  email: "Email",
};

export type ScriptPdfData = {
  title: string | null;
  hook: string | null;
  setup: string | null;
  keyPoints: Array<{ title: string; body: string }>;
  cta: string | null;
  bRollNotes: string | null;
  format: string;
  platform: string;
  status: string;
  createdAt: string;
};

function ScriptPage({ script }: { script: ScriptPdfData }) {
  const created = new Date(script.createdAt);
  const dateLabel = created.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.brand}>CreatorHub · Script</Text>
      <Text style={styles.title}>{script.title ?? "Untitled script"}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.badge}>
          {FORMAT_LABELS[script.format] ?? script.format}
        </Text>
        <Text style={styles.badgeNeutral}>{script.platform}</Text>
        <Text style={styles.badgeNeutral}>{script.status}</Text>
        <Text style={styles.badgeNeutral}>{dateLabel}</Text>
      </View>

      {script.hook && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Hook · 0–3s</Text>
          <Text style={styles.hookBody}>{script.hook}</Text>
        </View>
      )}

      {script.setup && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Setup</Text>
          <Text style={styles.sectionBody}>{script.setup}</Text>
        </View>
      )}

      {script.keyPoints.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Key points</Text>
          {script.keyPoints.map((kp, i) => (
            <View key={i} style={styles.keyPoint}>
              <Text style={styles.keyPointTitle}>{kp.title}</Text>
              <Text style={styles.keyPointBody}>{kp.body}</Text>
            </View>
          ))}
        </View>
      )}

      {script.cta && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Call to action</Text>
          <Text style={styles.sectionBody}>{script.cta}</Text>
        </View>
      )}

      {script.bRollNotes && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>B-roll notes</Text>
          <View style={styles.bRoll}>
            <Text>{script.bRollNotes}</Text>
          </View>
        </View>
      )}

      <View style={styles.footer} fixed>
        <Text>CreatorHub</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

export function ScriptPdf({ script }: { script: ScriptPdfData }) {
  return (
    <Document
      title={script.title ?? "CreatorHub script"}
      author="CreatorHub"
    >
      <ScriptPage script={script} />
    </Document>
  );
}

/** Multi-script PDF — one Page per script, in the order supplied.
 *  Used by GET /api/scripts/export-batch. */
export function ScriptBatchPdf({ scripts }: { scripts: ScriptPdfData[] }) {
  const title = scripts.length === 1
    ? scripts[0].title ?? "CreatorHub script"
    : `CreatorHub · ${scripts.length} scripts`;
  return (
    <Document title={title} author="CreatorHub">
      {scripts.map((s, i) => (
        <ScriptPage key={i} script={s} />
      ))}
    </Document>
  );
}

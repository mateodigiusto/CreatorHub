/**
 * @react-pdf/renderer document for a single content_analyses row
 * (competitor breakdown). Mirrors ScriptPdf in tone — plain Helvetica,
 * branded color tokens, no custom fonts so the cold start stays cheap.
 *
 * Sections render conditionally — legacy rows analyzed before v21 won't
 * have hook_analysis / themes / tone / cta / content_score / steal_notes
 * and we just skip those blocks.
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type {
  StructureBeat,
  WhyItWorked,
} from "@/lib/content-dna/types";

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
    marginBottom: 6,
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 11,
    color: MUTED,
    marginBottom: 18,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 22,
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
  scoreBadge: {
    fontSize: 9,
    color: "#FFFFFF",
    backgroundColor: ACCENT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: 700,
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
    fontSize: 11,
    color: "#0F172A",
    lineHeight: 1.55,
  },
  hookBody: {
    fontSize: 14,
    color: NAVY,
    fontWeight: 700,
    lineHeight: 1.4,
  },
  beatRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    paddingLeft: 10,
    borderLeft: `2pt solid ${ACCENT}`,
  },
  beatTime: {
    fontSize: 10,
    color: ACCENT,
    fontWeight: 700,
    width: 56,
  },
  beatBody: {
    fontSize: 11,
    color: "#0F172A",
    flex: 1,
    lineHeight: 1.45,
  },
  themePill: {
    fontSize: 9,
    color: NAVY,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    border: `1pt solid ${BORDER}`,
    marginRight: 4,
    marginBottom: 4,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  whyBlock: {
    backgroundColor: "#F8FAFC",
    border: `1pt solid ${BORDER}`,
    borderRadius: 6,
    padding: 12,
    marginTop: 4,
  },
  whyBlockBody: {
    fontSize: 10.5,
    color: "#475569",
    lineHeight: 1.5,
  },
  stealBlock: {
    backgroundColor: "#FFFBEB",
    border: `1pt solid #FDE68A`,
    borderRadius: 6,
    padding: 12,
    marginTop: 4,
  },
  stealBlockBody: {
    fontSize: 11,
    color: "#78350F",
    lineHeight: 1.55,
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

export type ContentDnaPdfData = {
  sourceTitle: string | null;
  sourceCreator: string | null;
  sourceUrl: string;
  sourcePlatform: string;
  hook: string | null;
  hookAnalysis: {
    text: string;
    why_it_works: string;
    attention_arc: string[];
  } | null;
  structure: StructureBeat[] | null;
  whyItWorked: WhyItWorked | null;
  themes: string[] | null;
  tone: string | null;
  cta: string | null;
  contentScore: number | null;
  stealNotes: string | null;
  transcription: string | null;
  createdAt: string;
};

export function ContentDnaPdf({ analysis }: { analysis: ContentDnaPdfData }) {
  const created = new Date(analysis.createdAt);
  const dateLabel = created.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const title = analysis.sourceTitle ?? "Untitled breakdown";
  const subtitle =
    analysis.sourceCreator ?? "Competitor video breakdown · CreatorHub";

  return (
    <Document title={title} author="CreatorHub">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.brand}>CreatorHub · Content DNA</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.badge}>{analysis.sourcePlatform}</Text>
          {analysis.tone && (
            <Text style={styles.badgeNeutral}>{analysis.tone}</Text>
          )}
          {analysis.contentScore !== null && (
            <Text style={styles.scoreBadge}>
              Score {analysis.contentScore.toFixed(1)} / 10
            </Text>
          )}
          <Text style={styles.badgeNeutral}>{dateLabel}</Text>
        </View>

        {analysis.hook && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>The hook · 0–6s</Text>
            <Text style={styles.hookBody}>{analysis.hook}</Text>
          </View>
        )}

        {analysis.hookAnalysis && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Why the hook earned the watch</Text>
            <Text style={styles.sectionBody}>
              {analysis.hookAnalysis.why_it_works}
            </Text>
            {analysis.hookAnalysis.attention_arc.length > 0 && (
              <View style={[styles.whyBlock, { marginTop: 8 }]}>
                {analysis.hookAnalysis.attention_arc.map((a, i) => (
                  <Text key={i} style={styles.whyBlockBody}>
                    {`${i + 1}. ${a}`}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {analysis.structure && analysis.structure.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Beat structure</Text>
            {analysis.structure.map((b, i) => (
              <View key={i} style={styles.beatRow}>
                <Text style={styles.beatTime}>
                  {b.timestamp || `Beat ${i + 1}`}
                </Text>
                <Text style={styles.beatBody}>
                  {b.name ? `${b.name}: ` : ""}
                  {b.description ?? ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {analysis.themes && analysis.themes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Themes</Text>
            <View style={styles.pillRow}>
              {analysis.themes.map((t, i) => (
                <Text key={i} style={styles.themePill}>{t}</Text>
              ))}
            </View>
          </View>
        )}

        {analysis.cta && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Call to action</Text>
            <Text style={styles.sectionBody}>{analysis.cta}</Text>
          </View>
        )}

        {analysis.whyItWorked && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionLabel}>Why this worked</Text>
            <View style={styles.whyBlock}>
              {analysis.whyItWorked.hook_psychology && (
                <Text style={styles.whyBlockBody}>
                  Hook psychology: {analysis.whyItWorked.hook_psychology}
                </Text>
              )}
              {analysis.whyItWorked.retention_triggers && (
                <Text style={[styles.whyBlockBody, { marginTop: 4 }]}>
                  Retention triggers: {analysis.whyItWorked.retention_triggers}
                </Text>
              )}
              {analysis.whyItWorked.emotional_pattern && (
                <Text style={[styles.whyBlockBody, { marginTop: 4 }]}>
                  Emotional pattern: {analysis.whyItWorked.emotional_pattern}
                </Text>
              )}
              {analysis.whyItWorked.story_structure && (
                <Text style={[styles.whyBlockBody, { marginTop: 4 }]}>
                  Story structure: {analysis.whyItWorked.story_structure}
                </Text>
              )}
            </View>
          </View>
        )}

        {analysis.stealNotes && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionLabel}>What to steal</Text>
            <View style={styles.stealBlock}>
              <Text style={styles.stealBlockBody}>{analysis.stealNotes}</Text>
            </View>
          </View>
        )}

        {analysis.transcription && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Transcription excerpt</Text>
            <Text style={[styles.sectionBody, { fontStyle: "italic", color: "#475569" }]}>
              {analysis.transcription.slice(0, 1200)}
              {analysis.transcription.length > 1200 ? "…" : ""}
            </Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>CreatorHub · Content DNA</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

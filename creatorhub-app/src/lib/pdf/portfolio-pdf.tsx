/**
 * @react-pdf/renderer document for an editor's portfolio.
 *
 * Public-facing artifact — used by the editor to share with prospects via
 * email/DM. Mirrors the visual hierarchy of /portfolio/[slug] (hero +
 * specialties + work samples + testimonials) but linearized for print.
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Link,
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
  hero: {
    marginBottom: 24,
  },
  name: {
    fontSize: 26,
    color: NAVY,
    fontWeight: 700,
    marginBottom: 8,
    lineHeight: 1.15,
  },
  bio: {
    fontSize: 12,
    color: "#0F172A",
    lineHeight: 1.55,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  pill: {
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
  pillNeutral: {
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
  contactRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  contactItem: {
    fontSize: 10,
    color: ACCENT,
  },
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 9,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  sample: {
    marginBottom: 12,
    paddingLeft: 12,
    borderLeft: `2pt solid ${ACCENT}`,
  },
  sampleDesc: {
    fontSize: 11.5,
    color: NAVY,
    fontWeight: 700,
    marginBottom: 2,
  },
  sampleResults: {
    fontSize: 10.5,
    color: "#475569",
    lineHeight: 1.5,
  },
  sampleLink: {
    fontSize: 10,
    color: ACCENT,
    marginTop: 2,
  },
  testimonialBlock: {
    backgroundColor: "#F8FAFC",
    border: `1pt solid ${BORDER}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  testimonialQuote: {
    fontSize: 11,
    color: "#0F172A",
    fontStyle: "italic",
    lineHeight: 1.5,
  },
  testimonialAttr: {
    fontSize: 10,
    color: MUTED,
    marginTop: 4,
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

export type PortfolioPdfData = {
  slug: string;
  bio: string | null;
  specialties: string[];
  platforms: string[];
  yearsExperience: number | null;
  contactEmail: string | null;
  contactLinks: Record<string, string>;
  workSamples: Array<{
    video_url?: string;
    description?: string;
    results?: string;
    thumbnail_url?: string;
  }>;
  nicheTags: string[];
  testimonials: Array<{
    quote?: string;
    attribution?: string;
    link?: string;
  }>;
  publishedAt: string | null;
};

export function PortfolioPdf({ portfolio }: { portfolio: PortfolioPdfData }) {
  const yearsLabel =
    portfolio.yearsExperience !== null
      ? `${portfolio.yearsExperience}+ year${portfolio.yearsExperience === 1 ? "" : "s"} editing`
      : null;

  return (
    <Document title={`Portfolio · ${portfolio.slug}`} author="CreatorHub">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.brand}>CreatorHub · Editor portfolio</Text>

        <View style={styles.hero}>
          <Text style={styles.name}>{`@${portfolio.slug}`}</Text>
          {portfolio.bio && <Text style={styles.bio}>{portfolio.bio}</Text>}

          {(portfolio.specialties.length > 0 || portfolio.platforms.length > 0 || yearsLabel) && (
            <View style={styles.metaRow}>
              {yearsLabel && <Text style={styles.pill}>{yearsLabel}</Text>}
              {portfolio.specialties.map((s, i) => (
                <Text key={`sp-${i}`} style={styles.pill}>{s}</Text>
              ))}
              {portfolio.platforms.map((p, i) => (
                <Text key={`pl-${i}`} style={styles.pillNeutral}>{p}</Text>
              ))}
            </View>
          )}

          {(portfolio.contactEmail ||
            Object.keys(portfolio.contactLinks ?? {}).length > 0) && (
            <View style={styles.contactRow}>
              {portfolio.contactEmail && (
                <Link
                  src={`mailto:${portfolio.contactEmail}`}
                  style={styles.contactItem}
                >
                  {portfolio.contactEmail}
                </Link>
              )}
              {Object.entries(portfolio.contactLinks ?? {}).map(([k, v], i) =>
                v ? (
                  <Link key={i} src={String(v)} style={styles.contactItem}>
                    {k}
                  </Link>
                ) : null,
              )}
            </View>
          )}
        </View>

        {portfolio.workSamples.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Recent work</Text>
            {portfolio.workSamples.slice(0, 8).map((s, i) => (
              <View key={i} style={styles.sample} wrap={false}>
                <Text style={styles.sampleDesc}>
                  {s.description ?? "Sample"}
                </Text>
                {s.results && (
                  <Text style={styles.sampleResults}>{s.results}</Text>
                )}
                {s.video_url && (
                  <Link src={s.video_url} style={styles.sampleLink}>
                    {s.video_url}
                  </Link>
                )}
              </View>
            ))}
          </View>
        )}

        {portfolio.nicheTags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Niches</Text>
            <View style={styles.metaRow}>
              {portfolio.nicheTags.map((t, i) => (
                <Text key={i} style={styles.pillNeutral}>{t}</Text>
              ))}
            </View>
          </View>
        )}

        {portfolio.testimonials.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Testimonials</Text>
            {portfolio.testimonials.slice(0, 6).map((t, i) => (
              <View key={i} style={styles.testimonialBlock} wrap={false}>
                {t.quote && (
                  <Text style={styles.testimonialQuote}>&ldquo;{t.quote}&rdquo;</Text>
                )}
                {t.attribution && (
                  <Text style={styles.testimonialAttr}>— {t.attribution}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>{`creatorhub.app/portfolio/${portfolio.slug}`}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/**
 * Public Privacy Policy. Required for Meta App Review.
 * Content is placeholder — replace with real privacy text before launch.
 */

export const metadata = {
  title: "Privacy Policy · CreatorHub",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen relative z-10 px-4 py-10 max-w-[760px] mx-auto">
      <div className="text-[11.5px] uppercase font-semibold text-muted tracking-wider mb-2">
        CreatorHub
      </div>
      <h1 className="text-[28px] font-semibold tracking-[-0.015em] text-text leading-tight">
        Privacy Policy
      </h1>
      <p className="text-[13px] text-muted mt-2">
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="prose prose-sm dark:prose-invert mt-8 text-[14px] leading-relaxed text-text/90 space-y-5">
        <p>
          <strong>Placeholder.</strong> This page exists to satisfy Meta App
          Review&apos;s requirement that we link a hosted Privacy Policy URL.
          Replace this content with your real policy (review with counsel)
          before public launch.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          What we collect
        </h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Email address and authentication identifiers (via Supabase Auth).</li>
          <li>
            Profile answers from the onboarding wizard (creator type, goals,
            audience description, etc.).
          </li>
          <li>
            Connected platform data: posts, metrics, account metadata for
            social accounts you choose to connect.
          </li>
          <li>Uploaded media (photos, videos) in your Asset Library.</li>
          <li>
            Operational logs (request paths, error traces) — secrets are
            redacted before logging.
          </li>
        </ul>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          What we don&apos;t collect
        </h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Your social-platform passwords. We use OAuth tokens.</li>
          <li>Browsing data outside CreatorHub.</li>
          <li>
            We never sell or share your data with third parties for
            advertising.
          </li>
        </ul>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          How we store it
        </h2>
        <p>
          Data lives in Supabase Postgres (US/EU regions, your choice on
          signup). Platform OAuth tokens are encrypted at rest using
          envelope encryption with keys held in Supabase Vault.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          Data deletion
        </h2>
        <p>
          You can delete your account at any time:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Via Settings → Danger zone → Delete account.</li>
          <li>Via Meta&apos;s data deletion request (if you connected via Facebook/Instagram).</li>
          <li>By email to <a className="text-accent" href="mailto:support@creatorhub.app">support@creatorhub.app</a>.</li>
        </ul>
        <p>
          Hard deletion completes within 30 days. Audit logs (anonymized)
          are retained for 12 months for security and dispute resolution.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          Contact
        </h2>
        <p>
          Privacy questions:{" "}
          <a className="text-accent" href="mailto:privacy@creatorhub.app">
            privacy@creatorhub.app
          </a>
          .
        </p>
      </div>
    </div>
  );
}

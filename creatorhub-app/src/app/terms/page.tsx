/**
 * Public Terms of Service page. Required for Meta App Review.
 * Content is placeholder — replace with real legal text before launch.
 */

export const metadata = {
  title: "Terms of Service · CreatorHub",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen relative z-10 px-4 py-10 max-w-[760px] mx-auto">
      <div className="text-[11.5px] uppercase font-semibold text-muted tracking-wider mb-2">
        CreatorHub
      </div>
      <h1 className="text-[28px] font-semibold tracking-[-0.015em] text-text leading-tight">
        Terms of Service
      </h1>
      <p className="text-[13px] text-muted mt-2">
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="prose prose-sm dark:prose-invert mt-8 text-[14px] leading-relaxed text-text/90 space-y-5">
        <p>
          <strong>Placeholder.</strong> This page exists to satisfy Meta App
          Review&apos;s requirement that we link a hosted Terms of Service URL.
          Replace this content with your real terms before public launch.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          1. Service description
        </h2>
        <p>
          CreatorHub is a content operations platform for creators. By using
          the service you agree to these terms.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          2. Account & access
        </h2>
        <p>
          You are responsible for safeguarding your account credentials. You
          may delete your account at any time via Settings → Danger zone, or
          by emailing support@creatorhub.app.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          3. Acceptable use
        </h2>
        <p>
          Don&apos;t use the service to publish content that violates the platform
          policies of the social networks you connect (Instagram, TikTok,
          etc.) or applicable law.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          4. Liability
        </h2>
        <p>
          The service is provided as-is. CreatorHub is not liable for losses
          arising from outages, deleted content, or platform-side actions on
          your social accounts.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          5. Contact
        </h2>
        <p>
          Questions: <a className="text-accent" href="mailto:support@creatorhub.app">support@creatorhub.app</a>.
        </p>
      </div>
    </div>
  );
}

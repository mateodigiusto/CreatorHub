/**
 * Public Terms of Service. Required for Meta App Review.
 *
 * Before launch, fill in the {{ENTITY_NAME}}, {{ENTITY_ADDRESS}},
 * {{CONTACT_EMAIL}}, and {{JURISDICTION}} placeholders. Have counsel
 * review before relying on this in court.
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
        Last updated:{" "}
        {new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <div className="prose prose-sm dark:prose-invert mt-8 text-[14px] leading-relaxed text-text/90 space-y-5">
        <p>
          These Terms govern your use of CreatorHub. By creating an account
          or using the service, you agree to be bound by them. If you
          don&apos;t agree, don&apos;t use the service.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          1. Definitions
        </h2>
        <p>
          &ldquo;CreatorHub,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo; means{" "}
          <strong>{`{{ENTITY_NAME}}`}</strong>, registered at{" "}
          {`{{ENTITY_ADDRESS}}`}. &ldquo;You&rdquo; means the person who creates
          an account or accesses the service. &ldquo;Service&rdquo; means the
          CreatorHub web application and its associated APIs.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          2. The service
        </h2>
        <p>
          CreatorHub is a content-operations platform for creators. It
          provides tools to plan, create, analyze, and grow content across
          social platforms you choose to connect. We may add or remove
          features over time. We are not affiliated with Instagram, TikTok,
          YouTube, X, LinkedIn, Facebook, Meta Platforms, or any other
          platform you connect.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          3. Eligibility and account
        </h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            You must be at least 16 years old (or the digital-consent age in
            your jurisdiction, whichever is higher).
          </li>
          <li>
            You are responsible for safeguarding your login credentials and
            for any activity under your account.
          </li>
          <li>
            One person, one account. If you operate multiple brands, contact
            us about a Pro plan.
          </li>
          <li>
            You can delete your account at any time via Settings → Danger
            zone, or by emailing{" "}
            <a className="text-accent" href="mailto:{{CONTACT_EMAIL}}">
              {`{{CONTACT_EMAIL}}`}
            </a>
            .
          </li>
        </ul>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          4. Acceptable use
        </h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Publish content that violates the policies of the social
            platforms you connect (Instagram, TikTok, YouTube, etc.) or
            applicable law.
          </li>
          <li>
            Use the service to harass, spam, defraud, or impersonate any
            person.
          </li>
          <li>
            Reverse-engineer, scrape, or attempt to circumvent our security
            controls or rate limits.
          </li>
          <li>
            Use the service to develop a competing product, or to retrain
            generative-AI models on our codebase or outputs.
          </li>
          <li>
            Upload content you don&apos;t own or have a license to use.
          </li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate these rules.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          5. Your content
        </h2>
        <p>
          You retain all rights to the content you upload or create in
          CreatorHub. You grant us a limited, non-exclusive license to host,
          process, transcode, and display that content solely to operate the
          service for you. We do not claim ownership and we do not use your
          content to train AI models outside your own account.
        </p>
        <p>
          Connected social platforms may also process your content per their
          own terms — we display data, we don&apos;t republish or rights-launder.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          6. Subscriptions and billing
        </h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Paid plans are billed in advance through Stripe. Prices are shown
            during sign-up.
          </li>
          <li>
            Trials, when offered, end automatically. You can cancel during
            the trial via Settings → Manage subscription with no charge.
          </li>
          <li>
            Cancellations take effect at the end of the current billing
            period. We don&apos;t pro-rate refunds for partial periods unless
            required by law.
          </li>
          <li>
            Taxes (VAT, GST, etc.) are added where applicable.
          </li>
          <li>
            We may change prices with 30 days&apos; notice. Changes take effect
            on your next renewal.
          </li>
        </ul>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          7. Termination
        </h2>
        <p>
          You may terminate at any time by deleting your account. We may
          terminate your account on notice if you violate these Terms,
          immediately if the violation is material (fraud, illegality,
          security threats), or if we discontinue the service. On
          termination, we hard-delete your data within 30 days as described
          in our Privacy Policy.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          8. Disclaimers
        </h2>
        <p>
          The service is provided &ldquo;as is&rdquo; and &ldquo;as
          available.&rdquo; We don&apos;t warrant that it will be uninterrupted,
          error-free, or fit for a particular purpose. AI-generated content
          (Sequence Studio drafts, Content DNA analyses) may contain
          inaccuracies — review before publishing.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          9. Limitation of liability
        </h2>
        <p>
          To the fullest extent permitted by law, our total liability for any
          claim arising from your use of the service is limited to the
          amount you paid us in the 12 months before the claim arose. We are
          not liable for indirect, incidental, consequential, or punitive
          damages, including lost profits, lost revenue, lost data, or
          platform-side actions on your social accounts.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          10. Indemnity
        </h2>
        <p>
          You agree to indemnify and hold harmless {`{{ENTITY_NAME}}`}, its
          officers, employees, and contractors from any claim arising out of
          your content, your violation of these Terms, or your violation of
          a third party&apos;s rights.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          11. Governing law and disputes
        </h2>
        <p>
          These Terms are governed by the laws of {`{{JURISDICTION}}`},
          without regard to conflict-of-laws principles. Disputes will be
          resolved in the courts of {`{{JURISDICTION}}`}, except where
          mandatory consumer-protection law of your country of residence
          requires otherwise.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          12. Changes to these Terms
        </h2>
        <p>
          We may update these Terms when the service evolves or the law
          changes. Material changes will be sent by email and posted with an
          updated &ldquo;Last updated&rdquo; date. Continued use after the
          effective date constitutes acceptance.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          13. Contact
        </h2>
        <p>
          {`{{ENTITY_NAME}}`}
          <br />
          {`{{ENTITY_ADDRESS}}`}
          <br />
          <a className="text-accent" href="mailto:{{CONTACT_EMAIL}}">
            {`{{CONTACT_EMAIL}}`}
          </a>
        </p>
      </div>
    </div>
  );
}

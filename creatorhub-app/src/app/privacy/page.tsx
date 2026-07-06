/**
 * Public Privacy Policy. Required for Meta App Review and GDPR compliance.
 *
 * Before launch, fill in the {{ENTITY_NAME}}, {{ENTITY_ADDRESS}},
 * {{CONTACT_EMAIL}}, and {{JURISDICTION}} placeholders with the real
 * registered entity. Have counsel review before relying on this in court.
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
        Last updated:{" "}
        {new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <div className="prose prose-sm dark:prose-invert mt-8 text-[14px] leading-relaxed text-text/90 space-y-5">
        <p>
          This policy describes how CreatorHub (&ldquo;we,&rdquo; &ldquo;us&rdquo;) collects,
          uses, and protects your personal data when you use our service. We
          are the data controller. Contact us at{" "}
          <a className="text-accent" href="mailto:{{CONTACT_EMAIL}}">
            {`{{CONTACT_EMAIL}}`}
          </a>
          .
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          1. Who we are
        </h2>
        <p>
          CreatorHub is operated by <strong>{`{{ENTITY_NAME}}`}</strong>,
          registered at {`{{ENTITY_ADDRESS}}`}. For privacy questions, write
          to{" "}
          <a className="text-accent" href="mailto:{{CONTACT_EMAIL}}">
            {`{{CONTACT_EMAIL}}`}
          </a>
          .
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          2. What we collect
        </h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Account data</strong>: email address, authentication
            identifiers (via Supabase Auth), display name, and avatar.
          </li>
          <li>
            <strong>Profile data</strong>: answers from the onboarding wizard
            (creator type, niche, goals, audience description, content
            formats, brand tones).
          </li>
          <li>
            <strong>Connected platform data</strong>: posts, metrics, and
            account metadata for any social account you choose to connect.
            We use OAuth tokens — we never see your platform passwords.
          </li>
          <li>
            <strong>Uploaded media</strong>: photos and videos you place in
            your Asset Library.
          </li>
          <li>
            <strong>Usage data</strong>: pages visited, actions taken,
            sequence-studio output, content-DNA analyses you generate.
          </li>
          <li>
            <strong>Operational logs</strong>: request paths, error traces,
            and performance metrics. Secrets, tokens, and PII fields are
            redacted before logging.
          </li>
          <li>
            <strong>Billing data</strong>: managed by Stripe. We store the
            customer ID, plan, and renewal status — not your card.
          </li>
        </ul>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          3. Why we collect it (legal basis)
        </h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>To provide the service</strong> — necessary for
            performance of the contract you enter when you sign up (GDPR Art.
            6(1)(b)).
          </li>
          <li>
            <strong>To improve the service</strong> — based on our legitimate
            interest in operating a working product (GDPR Art. 6(1)(f)).
          </li>
          <li>
            <strong>To send transactional email</strong> (invites, account
            notifications) — necessary for the contract.
          </li>
          <li>
            <strong>To comply with legal obligations</strong> — tax, audit,
            anti-fraud (GDPR Art. 6(1)(c)).
          </li>
        </ul>
        <p>
          We do not use your content for advertising or for training machine
          learning models outside your own account.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          4. Who we share it with
        </h2>
        <p>
          We use the following subprocessors. Each is bound by a Data
          Processing Agreement.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Supabase</strong> — Postgres database, authentication,
            file storage. Hosted in EU and US regions.
          </li>
          <li>
            <strong>Vercel</strong> — application hosting and edge runtime.
          </li>
          <li>
            <strong>Cloudflare Stream</strong> — video transcoding and
            delivery.
          </li>
          <li>
            <strong>Stripe</strong> — payment processing.
          </li>
          <li>
            <strong>Resend</strong> — transactional email delivery.
          </li>
          <li>
            <strong>Sentry</strong> — error monitoring (PII-redacted before
            send).
          </li>
          <li>
            <strong>Anthropic, OpenAI, Apify</strong> — AI processing for
            Content DNA. Inputs are scoped to the public content you submit
            for analysis; outputs are stored only on your account.
          </li>
          <li>
            <strong>Connected social platforms</strong> — when you authorize
            a connection (Instagram, TikTok, etc.) we exchange OAuth tokens
            and data per their developer terms.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> sell or share your data with third
          parties for advertising.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          5. International transfers
        </h2>
        <p>
          Some subprocessors store data outside the EU/EEA (notably the
          United States). Where required, transfers are covered by Standard
          Contractual Clauses (SCCs) and/or supplementary measures.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          6. How we secure it
        </h2>
        <p>
          Platform OAuth tokens are encrypted at rest using envelope
          encryption with keys held in Supabase Vault. All traffic is TLS
          1.2+. Database row-level security isolates each user&apos;s data.
          Access to production is limited to authorized personnel with audit
          logging.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          7. Retention
        </h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Account &amp; profile</strong> — kept while your account
            is active. Hard-deleted within 30 days of account deletion.
          </li>
          <li>
            <strong>Connected platform data</strong> — refreshed on each sync;
            deleted when you disconnect the platform.
          </li>
          <li>
            <strong>Audit log</strong> — anonymized at hard-delete and kept
            for 12 months for security and dispute resolution.
          </li>
          <li>
            <strong>Operational logs</strong> — 30 days.
          </li>
          <li>
            <strong>Webhook events</strong> — 90 days.
          </li>
          <li>
            <strong>Billing records</strong> — retained per applicable tax
            law (typically 7 years).
          </li>
        </ul>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          8. Your rights
        </h2>
        <p>
          Under GDPR (EU/EEA/UK) and similar laws (CCPA in California), you
          have the right to:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Access the personal data we hold about you.</li>
          <li>Correct inaccurate data.</li>
          <li>Erase your data (&ldquo;right to be forgotten&rdquo;).</li>
          <li>Receive your data in a portable format.</li>
          <li>Object to or restrict processing.</li>
          <li>Withdraw consent at any time.</li>
          <li>
            Lodge a complaint with your local data-protection supervisory
            authority.
          </li>
        </ul>
        <p>
          To exercise any right, email{" "}
          <a className="text-accent" href="mailto:{{CONTACT_EMAIL}}">
            {`{{CONTACT_EMAIL}}`}
          </a>{" "}
          or use Settings → Danger zone → Delete account. We respond within
          30 days.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          9. Data deletion
        </h2>
        <p>You can delete your account at any time:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Via Settings → Danger zone → Delete account (in-app).</li>
          <li>
            Via Meta&apos;s data deletion request flow, if you connected via
            Facebook or Instagram. Confirmations land at{" "}
            <a className="text-accent" href="/data-deletion-status">
              /data-deletion-status
            </a>
            .
          </li>
          <li>
            By email to{" "}
            <a className="text-accent" href="mailto:{{CONTACT_EMAIL}}">
              {`{{CONTACT_EMAIL}}`}
            </a>
            .
          </li>
        </ul>
        <p>Hard deletion completes within 30 days.</p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          10. Cookies and tracking
        </h2>
        <p>
          We use strictly-necessary cookies for session authentication and
          theme preference. We do not use advertising or cross-site tracking
          cookies. If we add product analytics in the future, this policy
          will be updated and EU/EEA users will be asked to consent.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          11. Children
        </h2>
        <p>
          CreatorHub is not intended for users under 16. If you believe a
          child has provided us their data, email{" "}
          <a className="text-accent" href="mailto:{{CONTACT_EMAIL}}">
            {`{{CONTACT_EMAIL}}`}
          </a>{" "}
          and we will delete it.
        </p>

        <h2 className="text-[18px] font-semibold text-text mt-8 mb-2">
          12. Changes to this policy
        </h2>
        <p>
          When we make material changes we&apos;ll notify you by email and
          update the &ldquo;Last updated&rdquo; date above. Continued use of the
          service after a change constitutes acceptance of the updated
          policy.
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

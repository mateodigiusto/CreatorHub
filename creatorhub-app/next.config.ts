import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* Acknowledge Turbopack so the Sentry-injected webpack config doesn't
     trip Next 16's "you have webpack config but no turbopack config" check.
     Empty object = "use Turbopack defaults." */
  turbopack: {},
};

/* Sentry's Next.js integration handles source-map upload at build time +
   tunnels client requests around ad-blockers. When SENTRY_AUTH_TOKEN is
   unset (dev / first deploy), uploads silently skip — runtime is unaffected. */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  /* Hide source maps from clients but still upload to Sentry for symbolication. */
  hideSourceMaps: true,
  disableLogger: true,
  /* Tunnel client errors through /monitoring to bypass ad-blockers. */
  tunnelRoute: "/monitoring",
});

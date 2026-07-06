#!/usr/bin/env bash
# One-shot Vercel deploy for CreatorHub.
# Prereq (run once, in this same folder):   npx vercel login
# Then just run:                            ./deploy-to-vercel.sh
#
# It links (or creates) the Vercel project, pushes the required env vars
# from .env.local to Production + Preview, and deploys to production.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env.local ]; then echo "✗ .env.local not found — run this from creatorhub-app/"; exit 1; fi

# Confirm the user is logged in.
if ! npx --yes vercel whoami >/dev/null 2>&1; then
  echo "✗ Not logged in to Vercel. Run:  npx vercel login   then re-run this script."; exit 1
fi
echo "✓ Logged in as $(npx --yes vercel whoami 2>/dev/null)"

# Link (creates the project on first run; project name = this directory).
npx --yes vercel link --yes

# Runtime env vars the app actually needs. Everything else in .env.example
# is optional and degrades gracefully when unset.
VARS="NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY DATABASE_URL DIRECT_URL EXPECTED_SCHEMA_VERSION"

for V in $VARS; do
  VAL="$(grep -E "^${V}=" .env.local | head -1 | sed "s/^${V}=//")"
  if [ -z "$VAL" ]; then echo "  ! $V is empty in .env.local — skipping"; continue; fi
  for ENVN in production preview; do
    npx --yes vercel env rm "$V" "$ENVN" --yes >/dev/null 2>&1 || true
    printf '%s' "$VAL" | npx --yes vercel env add "$V" "$ENVN" >/dev/null
  done
  echo "  ✓ set $V (production + preview)"
done

echo "→ Deploying to production…"
npx --yes vercel --prod
echo
echo "Done. Copy the Production URL above, then finish the Supabase step in DEPLOY.md."

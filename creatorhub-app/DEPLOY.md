# Deploy CreatorHub to Vercel

Auth is ON — the public link shows the real login/sign-up flow, backed by the
live Supabase project `uegzosghcsphjvmehmld`.

## What you run (3 commands)

From inside the `creatorhub-app/` folder:

```bash
# 1. Log in to Vercel (opens your browser — pick email or GitHub)
npx vercel login

# 2. Deploy (links/creates the project, pushes env vars, builds, ships)
./deploy-to-vercel.sh
```

The script prints a **Production URL** at the end, e.g.
`https://creatorhub-app.vercel.app`. That's your public link.

## Required step after the first deploy — make sign-up actually work

Magic-link emails only redirect back to domains Supabase is told to trust.
Add your Vercel URL to the Supabase project:

1. https://supabase.com/dashboard/project/uegzosghcsphjvmehmld/auth/url-configuration
2. **Site URL** → set to your Production URL (e.g. `https://creatorhub-app.vercel.app`)
3. **Redirect URLs** → add:
   - `https://creatorhub-app.vercel.app/**`
   - `https://*-<your-vercel-scope>.vercel.app/**`  (optional — lets preview deploys log in too)
4. Save.

Until this is done, visitors can load `/login` but the magic-link click will
fail to return them to the app.

## Notes

- **Email limits:** Supabase's built-in email sender is rate-limited (a few
  per hour) and may land in spam. Fine for a demo; wire Resend (see
  `.env.example`) before real traffic.
- **Optional env vars** (Stripe, Sentry, Resend, AI keys, Meta/TikTok, etc.)
  are all unset and degrade gracefully. Add them in the Vercel dashboard
  (Settings → Environment Variables) or re-run pieces of the script later.
- **Redeploy after code changes:** just run `npx vercel --prod` again.
- **Root directory:** because you run the script from `creatorhub-app/`, the
  Vercel project root is already correct — no dashboard config needed.

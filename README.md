# Pitch

Round-specific interview prep that compounds across every job. Paste a job description, get a fit analysis and tailored prep for every interview stage, research your interviewer, build a reusable STAR story bank, and generate a day-before brief pulling it all together.

## Stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Supabase](https://supabase.com) — auth (Google OAuth + email/password) and data (Postgres + Storage)
- [Claude](https://www.anthropic.com/claude) (Anthropic API) for generation

## Running it yourself

Every generation call runs through your own Anthropic API key, and all your data lives in your own Supabase project — nothing here talks to anyone else's account. That means running this locally (or deploying your own copy) needs a bit of one-time setup before it works. None of it is optional; skipping a step just means that piece silently doesn't work.

### 1. Clone and install

```bash
git clone <this-repo-url>
cd pitch
npm install
```

### 2. Create a Supabase project

Free tier is enough. Create one at [supabase.com/dashboard](https://supabase.com/dashboard).

### 3. Set up the database

In your Supabase project → **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql). This creates the `campaigns` and `stories` tables with row-level security, so each user can only ever see their own data.

### 4. Set up file storage

Follow the steps in [`supabase/storage-setup.sql`](supabase/storage-setup.sql) — create a private `campaign-files` bucket (via the dashboard or the SQL included there), then run the RLS policy in that file. This powers per-campaign file uploads.

### 5. Enable Google sign-in

In Supabase: **Authentication → Providers → Google**, toggle it on. You'll need a Google OAuth client ID/secret — create one for free at the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth consent screen + OAuth client ID, type "Web application"). Supabase's own provider page shows you the exact redirect URI to paste into the Google Cloud client's "Authorized redirect URIs."

Also add your app's URLs to Supabase's **Authentication → URL Configuration → Redirect URLs**: both `http://localhost:3000/auth/callback` for local dev and your production domain's equivalent once deployed.

Email/password sign-in also works out of the box with no extra setup — useful for a personal test account without going through Google at all (Authentication → Users → Add User in the Supabase dashboard, with "Auto Confirm User" on).

### 6. Get an Anthropic API key

Create one at [console.anthropic.com](https://console.anthropic.com). This is the key that pays for every generation — see the cost note below before deploying anywhere public.

### 7. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in the three required values (Supabase URL, Supabase anon key, Anthropic API key). `ALLOWED_EMAILS` is optional — see below.

### 8. Run it

```bash
npm run dev
```

Open `http://localhost:3000`.

## Before you deploy this anywhere public

Every AI generation call in this app runs through the single `ANTHROPIC_API_KEY` you configure — it's a per-deployment key, not a per-user one. That means **anyone who can sign in to your deployment can spend your Anthropic budget**, and Google OAuth doesn't restrict sign-in to specific accounts by default. If you deploy this and the URL becomes public or discoverable, you're exposed until you do something about it.

The fix: set `ALLOWED_EMAILS` (comma-separated) in your deployment's environment variables. Only those emails will be able to trigger generation — everyone else can still sign in and look around, but every generation request gets rejected before it reaches Anthropic. Leave it unset only while your deployment URL is genuinely private.

## License

Not yet finalized.

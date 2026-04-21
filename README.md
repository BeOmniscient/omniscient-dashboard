# Omniscient Dashboard

AI-powered client intelligence dashboard for Omniscient Marketing.
Weekly automated recon scans, live scoring, fix tracking, KPI monitoring, monthly email reports.

---

## Stack

- **Next.js 14** — full-stack React framework
- **Supabase** — PostgreSQL database + authentication
- **Vercel** — hosting + cron jobs
- **Resend** — transactional email
- **Anthropic API** — Claude Haiku powers weekly scans

---

## Setup (do this once)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/omniscient-dashboard.git
cd omniscient-dashboard
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in all values:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `RESEND_API_KEY` | resend.com → API Keys |
| `EMAIL_FROM` | e.g. `reports@yourdomain.com` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for dev, your Vercel URL for prod |
| `CRON_SECRET` | Any random string — generate with `openssl rand -hex 32` |

### 3. Set up the database

1. Go to your [Supabase project](https://app.supabase.com)
2. Click **SQL Editor** in the left sidebar
3. Paste the entire contents of `supabase/schema.sql`
4. Click **Run**

This creates all tables, RLS policies, triggers, and seeds De Novo as the first client.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Create your first admin user

1. Go to your Supabase project → **Authentication** → **Users**
2. Click **Add user** → enter your email + password
3. Copy the new user's UUID
4. Go to **SQL Editor** and run:

```sql
UPDATE public.profiles
SET role = 'admin', full_name = 'Your Name'
WHERE id = 'PASTE-YOUR-UUID-HERE';
```

5. Log in at `/login` with your email + password
6. You'll land on the Admin Dashboard

---

## Add a client user (so clients can log in)

1. Go to Supabase → **Authentication** → **Users** → **Add user**
2. Enter the client's email + a temporary password
3. Copy their UUID
4. Run in SQL Editor:

```sql
UPDATE public.profiles
SET
  role = 'client',
  client_id = 'a1b2c3d4-0000-0000-0000-000000000001',  -- De Novo's ID from schema
  full_name = 'Client Name'
WHERE id = 'PASTE-CLIENT-UUID-HERE';
```

5. Send them the login link — they'll see only their own dashboard

---

## Deploy to Vercel

### First deploy

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Vercel auto-detects Next.js — no config needed
4. Before clicking **Deploy**, click **Environment Variables** and add all variables from `.env.local`
5. Click **Deploy**

### Add the CRON_SECRET to Vercel

Vercel cron jobs send a `Bearer` token in the Authorization header. Add it:

1. Vercel project → **Settings** → **Environment Variables**
2. Add `CRON_SECRET` with the same value as in your `.env.local`

The crons are defined in `vercel.json`:
- **Weekly scan**: Every Monday at 8am UTC (`0 8 * * 1`)
- **Monthly report**: 1st of each month at 9am UTC (`0 9 1 * *`)

---

## Running a manual scan

From the Admin Dashboard, click **Scan →** next to any client. The scan runs async (Claude searches the web + scores the client) and updates the dashboard automatically. Takes 30–90 seconds per client.

You can also trigger via API:

```bash
curl -X POST https://your-app.vercel.app/api/scan \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{"client_id": "CLIENT_UUID"}'
```

---

## Adding a new client

1. Insert into Supabase directly (SQL Editor) or build the UI form (coming in Phase 2)
2. Run an onboarding scan from the Admin Dashboard
3. Create a login for the client (see "Add a client user" above)
4. Send them the welcome email:

```bash
# From your app, call this function from lib/email.ts
sendWelcomeEmail({
  to: 'client@example.com',
  clientName: 'Client Business Name',
  contactName: 'Contact Name',
  score: 59,
  grade: 'D',
  loginUrl: 'https://your-app.vercel.app/login'
})
```

---

## Cost estimate

At 14 clients running weekly scans + monthly reports:

| Service | Monthly cost |
|---|---|
| Supabase | Free (under 500MB) |
| Vercel | Free (Hobby tier) |
| Resend | Free (under 3,000 emails) |
| Anthropic API | ~$1–2/month (Haiku at 14 clients) |
| **Total** | **~$1–2/month** |

Scales to ~$45/month at 100+ clients.

---

## Project structure

```
omniscient-dashboard/
├── app/
│   ├── api/
│   │   ├── scan/route.ts          # Manual scan trigger
│   │   └── cron/
│   │       ├── weekly-scan/       # Runs every Monday
│   │       └── monthly-report/    # Runs 1st of month
│   ├── dashboard/
│   │   ├── layout.tsx             # Auth + data fetching shell
│   │   └── page.tsx               # Routes admin vs client
│   ├── login/page.tsx
│   ├── globals.css
│   └── layout.tsx
├── components/dashboard/
│   ├── DashboardShell.tsx         # Sidebar + topbar + theme
│   ├── ClientDashboard.tsx        # Full client view
│   └── AdminDashboard.tsx         # All-clients admin view
├── lib/
│   ├── supabase/client.ts         # Browser Supabase client
│   ├── supabase/server.ts         # Server + service role client
│   ├── scan-engine.ts             # Claude recon engine
│   └── email.ts                   # Resend email templates
├── supabase/schema.sql            # Full DB schema + seed data
├── types/index.ts                 # TypeScript interfaces
├── middleware.ts                  # Auth + route protection
├── vercel.json                    # Cron job schedule
└── .env.local.example             # Environment variable template
```

---

## Support

hello@omniscient.marketing

# PTA Store – Volunteer Scheduling

A full-stack web application for scheduling volunteer shifts at the PTA Store.  
Built with **React + TypeScript + Vite**, **Tailwind CSS**, and **Supabase** (Auth, PostgreSQL, Realtime).

---

## Architecture Overview

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Row-Level Security) |
| Auth | Supabase Auth (email/password) |
| Real-time | Supabase Realtime (postgres_changes) |
| Hosting | Vercel (frontend) + Supabase cloud (backend) |

---

## Database Schema

```
profiles        – one row per user (id, full_name, email, role)
signups         – one row per volunteer per shift (date + morning/afternoon)
comments        – per-shift discussion; flaggable as coverage requests
closed_dates    – dates the store is closed (holidays, etc.)
```

Row-Level Security is enabled on all tables.  The first registered user automatically becomes **admin**; all subsequent users are **volunteers**.

---

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd volunteer_scheduling
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Copy your **Project URL** and **anon public key** from  
   Settings → API → Project API keys

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run the database migration

In the Supabase dashboard → **SQL Editor**, paste the full contents of  
`supabase/migrations/001_init.sql` and click **Run**.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).  
Register the first account — it becomes the **admin** automatically.

---

## Roles

| Role | Capabilities |
|---|---|
| **Volunteer** | View schedule, sign up for / cancel their own shifts, post comments & coverage requests |
| **Admin** | Everything above + add/remove any signup, mark shifts fulfilled, manage closed dates, view all volunteer stats |

---

## Deployment (Vercel + Supabase)

### Frontend → Vercel

1. Push this repo to GitHub
2. Import it in [vercel.com](https://vercel.com) → **Add New Project**
3. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — Vercel handles CI/CD on every push to `main`
5. Add your custom domain in **Vercel → Settings → Domains**

### Backend → Supabase (already hosted)

Supabase is always-on by default.  For the free tier, enable  
**Settings → General → Pause protection** to prevent auto-pausing.

### GitHub Actions Backup

Add two repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Value |
|---|---|
| `SUPABASE_DB_URL` | Supabase → Settings → Database → Connection string (URI) |
| `SUPABASE_PROJECT_REF` | Your project slug, e.g. `abcdefghijkl` |

The backup workflow runs every Sunday at 3 AM UTC and retains the dump for 30 days.

---

## Project Structure

```
src/
  components/
    CommentList.tsx     – Per-shift comments + coverage request form
    Navbar.tsx          – Top navigation bar
    ProtectedRoute.tsx  – Auth & role guard for React Router
    ShiftCard.tsx       – Morning/afternoon shift block
    SlotRow.tsx         – Single volunteer slot (filled or open)
  context/
    AuthContext.tsx     – Session + profile state
  hook/
    useClosedDates.ts   – Closed dates CRUD + realtime
    useComments.ts      – Comments CRUD + realtime
    useSignups.ts       – Signups CRUD + realtime
  lib/
    dates.ts            – Week navigation helpers (date-fns)
    supabase.ts         – Supabase client
  pages/
    Login.tsx
    Register.tsx
    WeekView.tsx        – Main Mon–Fri schedule grid
    ShiftDetail.tsx     – Single shift + full comment thread
    admin/
      Dashboard.tsx     – Volunteer stats, open slots, closed dates mgmt
      Users.tsx         – Volunteer list + signup history
  types.ts              – Shared TypeScript interfaces
  App.tsx               – Router
  main.tsx              – Entry point
supabase/
  migrations/
    001_init.sql        – Full schema, RLS, triggers
```

---

## Shift Configuration

| Shift | Time | Slots |
|---|---|---|
| Morning | 8:00 AM – 12:00 PM | 2 |
| Afternoon | 12:00 PM – 4:00 PM | 3 |

The schedule runs **Monday through Friday** only.  
Capacity is enforced by a PostgreSQL trigger — the database rejects over-bookings even under concurrent load.

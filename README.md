# MediReminder (Next.js)

One Next.js app: the UI and the REST API (`/api/*`) run together on one port, backed by Supabase (Postgres).

```
Browser ──▶ Next.js (pages + /api routes) ──service-role key──▶ Supabase
```

The browser never talks to Supabase. The Supabase URL and key are only read by the
API routes on the server (no `NEXT_PUBLIC_` prefix), and the tables have Row Level
Security enabled with no policies, so the public anon key can't read or write them.

## Run it

1. **Database (once):** in the Supabase SQL editor run `database/schema.sql` on an empty database.
   Upgrading an existing one? Run only what applies, in this order:
   `database/migrate-to-v3.sql` (old `amt/unit/time` columns), then `database/migrate-add-auth.sql`
   (admin role; makes every medicine belong to a patient). Never run `schema.sql` on a database that has tables.
2. **Install and start:**

   ```bash
   npm install
   npm run dev          # http://localhost:3000
   ```

   The first `npm run dev` creates `.env.local` for you. Fill in `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API, the `service_role` / `sb_secret_...`
   key), then restart. Check the connection at http://localhost:3000/api/health.
3. **Create the admin:** open the app. The first account created becomes the **admin**.
   Everyone else signs up as a patient or guardian (or an admin adds them).

## Deploy to Vercel

1. **Database:** run `database/schema.sql` once in the Supabase SQL editor (see above).
2. **Push to GitHub** (or run `npx vercel` from this folder). `.env.local` is git-ignored; never commit it.
3. **Import the repo** at vercel.com/new. Framework Preset is detected as Next.js; `vercel.json` sets the rest. Leave Root Directory as the folder containing `package.json`.
4. **Environment Variables** (Settings > Environment Variables), before the first deploy:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` / `sb_secret_...` key (mark **Sensitive**) |
   | `ALLOW_SIGNUP` | optional; `false` closes public sign-up |

5. **Deploy**, then open `https://<your-app>.vercel.app/api/health`; it should return `{"ok":true,"db":"connected"}`.
6. **Create the admin:** open the app and register. The first account becomes the admin. Consider setting `ALLOW_SIGNUP=false` afterwards and redeploying.

Notes:
- Set the function region (Settings > Functions) to the one closest to your Supabase project for lower latency.
- Login throttling is in memory, so on Vercel it applies per serverless instance, not globally. It slows brute force but is not a hard limit.
- Reminders fire only while the page is open; there are no background jobs to configure.

Self-hosting instead: `npm run build && npm start`.

## Roles

| | Patient | Guardian | Admin |
|---|---|---|---|
| Sign up | Public sign-up | Public sign-up | First account, or created by an admin |
| Own medicines and doses | Manage | n/a | n/a |
| Other people's medicines and doses | none | View, add, edit, delete and log doses for **linked patients** | Same, for **every patient** |
| Reminders (toast and notification) | Yes, while the page is open | No | No |
| Link guardians | Shares an **invite code**; can remove guardians | Enters a patient's code to link, or **creates the patient's account** (auto-linked); can unlink | Links or unlinks anyone |
| Manage users | none | none | Create users, change roles, reset passwords, delete |

A guardian or admin picks which patient they are viewing at the top of Today and Medicines, and sees that patient's day in the **patient's timezone**.

Safeguards: the last admin can't be demoted or deleted, an admin can't delete themselves, and a patient who still has
medicines can't be changed to another role. Deleting a user deletes their medicines and history.

## Sign-in and security

- Email + password. Passwords are hashed with scrypt; only a SHA-256 of the session token is stored in `sessions`.
- The session is an **HttpOnly, SameSite=Lax** cookie (30 days with "Keep me signed in", otherwise it ends with the browser; the server also expires it after 12 hours).
- Changing a password, or an admin resetting it, signs out the other devices.
- Login is throttled (8 failures per email and IP per 15 minutes; held in memory, so per server instance), and cross-site POSTs are rejected.
- Set `ALLOW_SIGNUP=false` to close public sign-up so only admins can add accounts.
- Every medicine and dose request is checked on the server against the caller's role and links; the UI hiding a tab is not what protects the data.

## What it does

- Each medicine has a dose, one or more daily times, the days of the week, and an optional note.
- **Today** lists the day's doses as *Due now*, *Later today* and *Done*; mark each **Take**, **Skip**, or **Undo**.
- **Medicines** lists everything with a 7-day history and weekly adherence; tap one to edit or delete.
- While the page is open, a patient's due dose shows a toast and (if allowed) a browser notification, repeated every 10 minutes up to 3 times while pending. Reminders only fire while the app is open.

## API

| Method | Path | Purpose |
|---|---|---|
Everything except `/api/health` and the sign-in calls needs a signed-in session. `patientId` is required for guardians and admins and ignored for patients.

| Method | Path | Purpose |
|---|---|---|
| GET | /api/health | Liveness + database check |
| GET | /api/auth/me | Current user (`user: null` when signed out, plus `setup: true` before the first admin exists) |
| POST | /api/auth/register | `{name, email, password, role: "patient"\|"guardian", inviteCode?, remember?, timezone?}` |
| POST | /api/auth/login | `{email, password, remember?}` |
| POST | /api/auth/logout | End this session |
| PATCH | /api/auth/me | Update own `name` / `timezone` |
| POST | /api/auth/password | `{current, next}` |
| GET | /api/meds?patientId= | List a patient's medicines |
| POST | /api/meds | Add `{patientId?, name, dose, times: ["08:00"], days: [0-6], notes}` |
| PUT | /api/meds/:id | Replace a medicine's fields |
| DELETE | /api/meds/:id | Delete a medicine (its dose logs cascade) |
| GET | /api/doses?patientId=&from=YYYY-MM-DD | Dose logs since a date |
| PUT | /api/doses | Set one dose `{medicineId, date, slot, status}`; status is `taken`, `skipped`, or `null` to undo |
| GET | /api/links | `{patients, guardians}` the caller can see |
| POST | /api/links | Guardian links to a patient `{inviteCode}` |
| POST | /api/links/patients | Guardian creates a patient account and links to it `{name, email, password, timezone?}` |
| DELETE | /api/links/:id | Patient, guardian or admin ends a link |
| POST | /api/links/regenerate | Patient gets a new invite code |
| GET / POST | /api/admin/users | Admin: list / create users |
| PATCH / DELETE | /api/admin/users/:id | Admin: rename, reset password, change role / delete |
| GET / POST | /api/admin/links | Admin: list / create guardian links |

`days` uses 0 = Sunday.

## Layout

```
database/            schema.sql, migrate-to-v3.sql, migrate-add-auth.sql, seed.sql
src/app/api/         route handlers (health, meds, meds/[id], doses)
src/lib/server/      supabase client, models, validators, auth (passwords, sessions), access rules
src/lib/client/      api calls, timezone-aware time helpers, schedule selectors
src/components/      App (sign-in gate), AuthScreen, Main (state + reminders), Today, Meds, MedForm, Account, Admin
```

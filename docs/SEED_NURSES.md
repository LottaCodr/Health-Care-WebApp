# Seeding staff logins (nurses)

A staff member is **two rows in two places**, and both are required:

| | table | why it matters |
| :--- | :--- | :--- |
| login | `auth.users` | what `/login` verifies against |
| profile + role | `public.staffs` | `proxy.ts` and `lib/services/auth-guard.ts` resolve `staffs.id = auth.uid()` to a role |

An auth user with no `staffs` row is refused at login ("no staff row/role"); a `staffs`
row with no auth user is a name on a list that can never sign in. The row `id` **is** the
auth user's uid — that is the link.

`scripts/seed-nurses.mjs` creates both halves in one shot, the same way the app's
Admin-only [`createStaff()`](../lib/services/staff.service.ts) does, but offline and with
the service-role key so RLS and "signups disabled" don't interfere.

## Run it

```bash
# keys are read from the environment, falling back to ./.env.local and ./.env
export SUPABASE_URL=https://<project-ref>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service-role key>

npm run seed:nurses -- --dry-run   # plan only, writes nothing  ← do this first
npm run seed:nurses               # create the two nurses
```

No `npm install` needed — the script uses Node 18+ `fetch` and nothing else.

Each nurse gets a **generated one-time password**, printed once at the end. Have them
change it at Nurse → Settings on first sign-in. To supply your own instead, set
`password` in the nurse list, or `export NURSE_TEMP_PASSWORD=...` for all of them.

### Options

| Flag / env | Effect |
| :--- | :--- |
| `--dry-run` | Reads only. Reports what would be created/updated. |
| `--from path.json` | Seed from a JSON array instead of the two built-in nurses. |
| `--reset-existing-passwords` | Force a new password on accounts that already exist (default: leave them alone). |
| `NURSE_TEMP_PASSWORD` | Use this password for every seeded nurse. |

### Nurse details

Edit the `NURSES` array at the top of the script, or pass `--from`:

```json
[
  {
    "name": "Amara Okafor",
    "email": "a.okafor@nilevalley.example",
    "phone_number": "+234 803 000 1122",
    "department": "Nursing — Medical/Surgical Ward",
    "status": "Active",
    "date_joined": "2026-09-01",
    "license_number": "NMC-88213"
  }
]
```

`name` and `email` are required; everything else is optional. Unrecognised keys are
forwarded to the `staffs` row (so `facility_id`, `registration_number`, … work when your
deployment has them).

## What the script does about this project's quirks

- **Role value.** Writes exactly `"Nurse"` — the canonical `UserRole.Nurse`. Legacy rows
  hold `nurse`, `Nursing`, `NURSE` etc.; `normalizeUserRole()` copes, but the canonical
  string keeps RLS checks and the Admin → Staff table consistent.
- **It never overwrites an existing role.** The `staffs_protect_role` trigger compares
  `auth.uid()`, which is NULL for every service-role request, so a REST write that changes
  `role` raises *"Only administrators may change staff roles"*. If the id already belongs to
  e.g. a Doctor, the script warns and leaves it alone — change it from Admin → Staff as an
  admin instead.
- **Missing columns.** Older deployments lack `date_joined`, `license_number`, `facility_id`
  (the PGRST204 trap noted in `createStaff()`). Unknown columns are dropped and the insert
  retried, so a partial schema still yields a working login.
- **Idempotent.** Re-running finds the existing auth user by email, leaves its password
  untouched, refreshes the profile fields, and never inserts a duplicate `staffs` row.
  Safe after a partial run.
- **Verified, not assumed.** After writing, it reads the row back and runs the same
  `normalizeUserRole()` the proxy uses, then reports `role "Nurse" → Nurse ✔`. A row that
  would land the nurse on the wrong dashboard is flagged as a failure.

## If you don't want to run a script

Admin → **Staff** → *Add staff* in the app does the same job (it calls `createStaff()`,
which signs up the auth user and inserts the profile row). That's the right path for a
handful of hires on a live system: no service-role key leaves your machine.

Prefer the SQL editor? Inserting the `staffs` row by hand is fine for an account that
already exists in Auth — generate the uid from `auth.users`:

```sql
insert into public.staffs (id, name, email, role, status, department, phone_number)
select u.id, 'Amara Okafor', 'a.okafor@nilevalley.example', 'Nurse', 'Active',
       'Nursing — Medical/Surgical Ward', '+234 803 000 1122'
from auth.users u
where u.email = 'a.okafor@nilevalley.example'
on conflict (id) do nothing;
```

Do **not** hand-write `auth.users` rows (password hashes, `identities`, and the email
confirmation timestamps are easy to get subtly wrong). Use the Admin API — i.e. this
script — or the app's staff form for the login half.

## Rollback

```sql
-- 1. drop the profile row, then 2. delete the login (Dashboard → Authentication → Users)
delete from public.staffs where email = 'a.okafor@nilevalley.example';
```

Deleting the auth user matters: an orphaned login with no `staffs` row still consumes the
email and confuses the next person who tries to sign up with it.

## Security notes

- The service-role key bypasses RLS entirely. Keep it out of the repo (`.env.local` is
  git-ignored) and out of client code, and pass it inline (`SUPABASE_SERVICE_ROLE_KEY=… npm run seed:nurses`)
  if you'd rather not persist it.
- The script confirms the email address as part of creation, so the nurse can sign in
  immediately — that's intentional for staff onboarding, and it's why the generated
  password is printed rather than emailed. Rotate any password that passes through a chat
  thread.
- Public signups should stay disabled in Supabase Auth; the Admin API used here is
  unaffected by that setting.
- Nothing here writes patient data, and `logAction()` (the audit trail) is only called by
  the in-app service layer — seeding via the Admin API leaves no `audit_logs` entry, so
  record the hire in your staffing log if you need the paper trail.

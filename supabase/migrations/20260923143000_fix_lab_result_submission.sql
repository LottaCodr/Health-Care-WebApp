-- ═══════════════════════════════════════════════════════════════════════════════
-- RELIABLE LAB-RESULT SUBMISSION
--
-- Incident: an authenticated laboratory scientist could read the queue but the
-- result UPDATE was filtered to zero rows by a drifted role matcher / lab RLS
-- policy. Next.js then redacted the thrown PostgREST error, leaving only the
-- generic "Server Components render" message in the browser.
--
-- This migration is intentionally self-contained and idempotent:
--   1. restore the casing-safe staff role matcher;
--   2. reassert lab_requests policies + authenticated table privileges;
--   3. ensure the optional lab price column exists;
--   4. repair the amendment trigger's argument handling. PostgreSQL exposes
--      trigger arguments as TG_ARGV[0..n-1] (not TG_ARGS[1..n]); the earlier
--      migration used the latter and therefore could not reliably install the
--      guard.
--
-- APPLY WITH: supabase db push (or run this file in the Supabase SQL editor).
-- Safe to run repeatedly.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Canonical staff-role helpers (lowercase BEFORE normalising) ───────────
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.staffs where id::text = auth.uid()::text
  );
$$;

create or replace function public.staff_has_role(role_group text)
returns boolean
language sql stable security definer set search_path = public
as $$
  with s as (
    select regexp_replace(lower(trim(role::text)), '[[:space:]_-]+', '', 'g') as compact
    from public.staffs
    where id::text = auth.uid()::text
  )
  select exists (
    select 1 from s
    where case role_group
      when 'FrontDesk'     then s.compact like any (array['%front%','%reception%'])
      when 'Doctor'        then s.compact like any (array['%doctor%','%physician%','%consultant%'])
      when 'Nurse'         then s.compact like any (array['%nurse%','%nursing%'])
      when 'LabTechnician' then s.compact like any (array['%lab%','%laboratory%'])
      when 'Pharmacist'    then s.compact like any (array['%pharm%'])
      when 'Radiologist'   then s.compact like any (array['%radio%','%imaging%'])
      when 'Admin'         then s.compact like any (array['%admin%'])
      else false
    end
  );
$$;

create or replace function public.staff_can(role_group text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.staff_has_role('Admin') or public.staff_has_role(role_group);
$$;

-- ── 2. Canonical lab-request RLS + grants ────────────────────────────────────
alter table public.lab_requests enable row level security;

drop policy if exists "lab_requests select staff" on public.lab_requests;
create policy "lab_requests select staff" on public.lab_requests
  for select to authenticated using (public.is_staff());

drop policy if exists "lab_requests insert doctor frontdesk" on public.lab_requests;
create policy "lab_requests insert doctor frontdesk" on public.lab_requests
  for insert to authenticated
  with check (public.staff_can('Doctor') or public.staff_can('FrontDesk'));

drop policy if exists "lab_requests update lab doctor radio" on public.lab_requests;
create policy "lab_requests update lab doctor radio" on public.lab_requests
  for update to authenticated
  using (
    public.staff_can('LabTechnician')
    or public.staff_can('Doctor')
    or public.staff_can('Radiologist')
  )
  with check (
    public.staff_can('LabTechnician')
    or public.staff_can('Doctor')
    or public.staff_can('Radiologist')
  );

drop policy if exists "lab_requests delete admin" on public.lab_requests;
create policy "lab_requests delete admin" on public.lab_requests
  for delete to authenticated using (public.staff_has_role('Admin'));

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.lab_requests to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.staff_has_role(text) to authenticated;
grant execute on function public.staff_can(text) to authenticated;

-- Price is optional clinical metadata. The application also retries without it
-- so an unapplied migration can never block filing the actual result.
alter table public.lab_requests
  add column if not exists price numeric;

-- ── 3. Correct lab amendment trigger ────────────────────────────────────────
create or replace function public.amendment_window()
returns interval
language sql immutable
as $$
  select interval '24 hours';
$$;

create or replace function public.amendment_session_is_privileged()
returns boolean
language sql stable
as $$
  select auth.uid() is null;
$$;

create or replace function public.try_to_timestamptz(raw text)
returns timestamptz
language plpgsql immutable
as $$
declare
  v timestamptz;
begin
  begin
    v := nullif(trim(coalesce(raw, '')), '')::timestamptz;
  exception when others then
    v := null;
  end;
  return v;
end;
$$;

alter table public.lab_requests
  add column if not exists amended_at timestamptz;
alter table public.lab_requests
  add column if not exists amendment_count integer not null default 0;

create or replace function public.enforce_amendment_window()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  -- TG_ARGV is zero-based. Trigger args are: author, anchors, content.
  author_col   text := case when tg_nargs > 0 then tg_argv[0] else '' end;
  anchor_cols  text[] := case
    when tg_nargs > 1 and coalesce(tg_argv[1], '') <> ''
      then string_to_array(tg_argv[1], ',')
    else '{}'::text[]
  end;
  content_cols text[] := case
    when tg_nargs > 2 and coalesce(tg_argv[2], '') <> ''
      then string_to_array(tg_argv[2], ',')
    else '{}'::text[]
  end;
  oldj         jsonb := to_jsonb(old);
  newj         jsonb := to_jsonb(new);
  col          text;
  changed      text[] := '{}';
  has_content  boolean := false;
  v_anchor     timestamptz;
  v_author     text;
  v_deadline   timestamptz;
begin
  -- SQL editor / service-role maintenance is deliberately out of band.
  if public.amendment_session_is_privileged() then
    return new;
  end if;

  foreach col in array content_cols loop
    if oldj ? col
       and coalesce(oldj ->> col, '') is distinct from coalesce(newj ->> col, '') then
      changed := array_append(changed, col);
    end if;
  end loop;

  -- Workflow-only change (status, price, routing): never lock it.
  if array_length(changed, 1) is null then
    return new;
  end if;

  -- Empty -> value is first filing, not an amendment.
  foreach col in array changed loop
    if oldj ? col and coalesce(trim(oldj ->> col), '') <> '' then
      has_content := true;
      exit;
    end if;
  end loop;

  if has_content then
    if coalesce(author_col, '') <> '' and newj ? author_col then
      v_author := nullif(trim(coalesce(oldj ->> author_col, '')), '');
      if v_author is not null and v_author <> auth.uid()::text then
        raise exception 'This % row is locked: only the clinician who filed it may amend it.', tg_table_name
          using hint = 'Attach an append-only correction note instead.';
      end if;
    end if;

    foreach col in array anchor_cols loop
      if v_anchor is null and oldj ? col then
        v_anchor := public.try_to_timestamptz(oldj ->> col);
      end if;
    end loop;
    if v_anchor is null and oldj ? 'created_at' then
      v_anchor := public.try_to_timestamptz(oldj ->> 'created_at');
    end if;

    if v_anchor is not null then
      v_deadline := v_anchor + public.amendment_window();
      if now() > v_deadline then
        raise exception 'The % amendment window closed at % (24h after filing).',
          tg_table_name, to_char(v_deadline, 'YYYY-MM-DD HH24:MI')
          using hint = 'Attach an append-only correction note instead.';
      end if;
    end if;

    new.amended_at := now();
    new.amendment_count := coalesce(old.amendment_count, 0) + 1;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_amendment_window on public.lab_requests;
create trigger trg_amendment_window
  before update on public.lab_requests
  for each row execute function public.enforce_amendment_window(
    'completed_by',
    'completed_at,updated_at,created_at',
    'result,notes,test_type'
  );

grant execute on function public.amendment_window() to authenticated;
grant execute on function public.try_to_timestamptz(text) to authenticated;

-- ── Deployment verification notices ─────────────────────────────────────────
do $$
declare
  update_policy_count int;
begin
  select count(*) into update_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'lab_requests'
    and cmd = 'UPDATE';

  raise notice 'lab_requests UPDATE policies found: % (expected at least 1)', update_policy_count;
  raise notice 'lab-result submission permissions and amendment trigger reasserted';
end $$;

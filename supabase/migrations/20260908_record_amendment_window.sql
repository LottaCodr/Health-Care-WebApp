-- ═══════════════════════════════════════════════════════════════════════════
-- 24-HOUR RECORD AMENDMENT WINDOW (+ append-only correction notes)
--
-- WHAT THE HOSPITAL ASKED FOR
-- Clinicians must be able to correct what they wrote — a spelling slip through
-- to a changed prescription — but only for 24 hours. After that the chart is
-- evidence and must not be silently rewritable. The rule this file enforces:
--
--   1. The AUTHOR of a record may change its CONTENT for 24 hours after it was
--      filed. Unlimited edits inside the window; the window never extends.
--   2. After 24 hours the content columns are frozen — for everyone, including
--      an administrator acting as staff. Fixing a locked record out of band
--      stays possible through the SQL editor / service role (privileged
--      sessions), which is exactly how it should be: deliberate, rare, and
--      visible to a DBA rather than to a browser.
--   3. Corrections remain possible at any time, but only as an APPEND-ONLY
--      note in record_addenda. Notes cannot be edited or deleted.
--   4. Amendments leave a mark on the row: amended_at + amendment_count,
--      maintained by the trigger below. The before/after text is written to
--      audit_logs by the app layer.
--
-- WHY A TRIGGER, WHEN THE APP ALREADY CHECKS
-- The anon key ships inside the browser bundle, so PostgREST can be called
-- directly by anyone who opens the login page (see
-- 20260814_enable_rls_security.sql). RLS policies can only look at the row
-- being written, not at *when* the previous version was filed, so the window
-- itself lives here: the trigger compares the OLD and NEW values of the content
-- columns and refuses the write once the window has passed.
--
-- Workflow columns are deliberately NOT locked. A consultation's status, a lab
-- request's priority, a prescription's price, its dispensed flag — those drive
-- the patient journey and the billing chain. Freezing them would stall care
-- while adding no integrity at all.
--
-- APPLY WITH: supabase db push   (or run this file in the SQL editor)
-- Safe to re-run: every statement is conditional, so a deployment missing one
-- of these tables just skips that part.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Policy constant ─────────────────────────────────────────────────────────
-- Mirrored in lib/records/amendment-policy.ts (AMENDMENT_WINDOW_HOURS). If you
-- change one, change both — the database is the authority, the app is the
-- friendly explanation in front of it.
create or replace function public.amendment_window()
returns interval
language sql immutable
as $$
  select interval '24 hours';
$$;

-- True when the calling session is a trusted server-side one (service role,
-- SQL editor, migrations). Those bypass the window by design; a logged-in staff
-- session never does. auth.uid() is null for all of them.
create or replace function public.amendment_session_is_privileged()
returns boolean
language sql stable
as $$
  select auth.uid() is null;
$$;

-- Cast a timestamp column that may hold anything (text columns exist in the
-- legacy schema) without letting one bad row abort every write. PL/pgSQL
-- forbids EXIT/CONTINUE inside a block with an EXCEPTION clause, so the trap
-- lives in its own function instead of inside the trigger's loops.
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

-- ── Amendment bookkeeping columns ───────────────────────────────────────────
do $$
declare
    t text;
begin
    foreach t in array array[
        'consultations', 'lab_requests', 'prescriptions', 'nursing_actions',
        'drug_dispensing', 'discharge_notes', 'nurse_drug_chart', 'fluid_balance'
    ]
    loop
        if to_regclass('public.' || t) is not null then
            execute format('alter table public.%I add column if not exists amended_at timestamptz', t);
            execute format('alter table public.%I add column if not exists amendment_count integer not null default 0', t);
        end if;
    end loop;

    -- prescriptions has no column that reliably identifies who WROTE the drug
    -- line (pharmacist_id is the dispenser, nurse_id whoever transcribed it),
    -- so stamp the filer explicitly. Rows that predate this column are
    -- unowned: anyone in role may edit them inside the window, and the first
    -- editor becomes the owner from then on.
    if to_regclass('public.prescriptions') is not null then
        execute 'alter table public.prescriptions add column if not exists created_by text';
    end if;
end $$;

-- ── The window trigger ──────────────────────────────────────────────────────
-- One function, parameterised per table by trigger arguments:
--   arg 1 → author column (staff id; '' = no ownership check)
--   arg 2 → anchor columns, in priority order. The first non-null one wins, so
--           a result filed today against a request created last week still
--           gets its own 24 hours instead of starting out already expired.
--   arg 3 → content columns (a change to any of them counts as an amendment)
-- Columns that a given deployment does not have are ignored, which is what
-- keeps this file working against older schemas (e.g. a fluid_balance without
-- input_fluid_type).
create or replace function public.enforce_amendment_window()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
    author_col   text := case when tg_nargs > 0 then tg_args[1] else '' end;
    anchor_cols  text[] := case when tg_nargs > 1 and coalesce(tg_args[2], '') <> ''
                                then string_to_array(tg_args[2], ',') else '{}'::text[] end;
    content_cols text[] := case when tg_nargs > 2 and coalesce(tg_args[3], '') <> ''
                                then string_to_array(tg_args[3], ',') else '{}'::text[] end;
    oldj         jsonb := to_jsonb(old);
    newj         jsonb := to_jsonb(new);
    col          text;
    changed      text[] := '{}';
    has_content  boolean := false;
    v_anchor     timestamptz;
    v_author     text;
    v_deadline   timestamptz;
begin
    -- Server-side / admin sessions are out of band by definition.
    if public.amendment_session_is_privileged() then
        return new;
    end if;

    -- Which content columns is this write actually changing?
    foreach col in array content_cols loop
        if oldj ? col
           and coalesce(oldj ->> col, '') is distinct from coalesce(newj ->> col, '') then
            changed := array_append(changed, col);
        end if;
    end loop;

    -- Nothing clinical is being rewritten (status, routing, price, dispensed…):
    -- let the workflow through untouched.
    if array_length(changed, 1) is null then
        return new;
    end if;

    -- Filing content for the first time is not an amendment — a lab request
    -- that has been pending a week must still be result-able. Scoped to the
    -- columns this write touches, NOT to the whole row: a lab_requests row
    -- always carries test_type, so a row-wide test would call every result an
    -- amendment and lock a scientist out of filing at all. Mirrors
    -- isFirstFilling() in lib/records/registry.ts.
    foreach col in array changed loop
        if oldj ? col and coalesce(trim(oldj ->> col), '') <> '' then
            has_content := true;
            exit;
        end if;
    end loop;

    if has_content then
        -- Ownership: authors only.
        if coalesce(author_col, '') <> '' and newj ? author_col then
            v_author := nullif(trim(coalesce(oldj ->> author_col, '')), '');
            if v_author is not null and v_author <> auth.uid()::text then
                raise exception 'This % row is locked: only the clinician who filed it may amend it.', tg_table_name
                    using hint = 'Attach a correction note instead (record_addenda) — it is append-only and open to staff at any time.';
            end if;
        end if;

        -- The clock: first non-null anchor column, else created_at. An
        -- unparseable timestamp leaves v_anchor null, which means "cannot
        -- prove it is late" → allowed (and the app layer still logs it).
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
                raise exception 'The % amendment window closed at % (24h after the entry was filed). The record stays as written.',
                    tg_table_name, to_char(v_deadline, 'YYYY-MM-DD HH24:MI')
                    using hint = 'Attach a correction note (record_addenda) so the correction shows next to the original.';
            end if;
        end if;
    end if;

    -- Stamp a genuine amendment only — filing a first result is not one, and
    -- "amendment_count" must mean "this text was rewritten", because that is the
    -- number a records officer reads as a flag. The trigger owns both columns,
    -- so a client cannot clear the counter or fake the timestamp.
    if has_content then
        if newj ? 'amended_at' then
            new.amended_at := now();
        end if;
        if newj ? 'amendment_count' then
            new.amendment_count := coalesce((oldj ->> 'amendment_count')::int, 0) + 1;
        end if;
    end if;

    return new;
end;
$$;

-- Attach the trigger per table: author column, anchor columns, content columns.
-- This list is the mirror image of lib/records/registry.ts — change one, change
-- the other, then re-run this file.
do $$
declare
    r record;
begin
    for r in
        select * from (values
            ('consultations',    'doctor_id',    'created_at',
                'symptoms,diagnosis,prescriptions,recommendations,icd10_codes'),
            ('lab_requests',    'completed_by',  'completed_at,updated_at,created_at',
                'result,notes,test_type'),
            ('nursing_actions', 'completed_by',  'completion_time,updated_at,created_at',
                'description,action_type'),
            ('prescriptions',   'created_by',    'created_at',
                'drug_name,dosage,duration,notes'),
            ('drug_dispensing', 'dispensed_by',  'dispensed_at,created_at',
                'drug_name,quantity,batch_number'),
            ('discharge_notes', 'doctor_id',     'created_at',
                'final_diagnosis,condition_on_discharge,hospital_course,medications_on_discharge,follow_up_instructions,activity_restrictions,diet_instructions,emergency_return_criteria'),
            ('nurse_drug_chart','prescribed_by', 'created_at',
                'drug_name,generic_name,dose,route,frequency,notes'),
            ('fluid_balance',   'signed_by',     'created_at',
                'oral_ml,iv_ml,ng_ml,other_input_ml,other_input_type,input_fluid_type,urine_ml,aspirate_ml,vomit_ml,bowel_ml,drain_ml,other_output_ml,notes')
        ) as cfg(tbl, author, anchor, content)
    loop
        if to_regclass('public.' || r.tbl) is not null then
            execute format('drop trigger if exists trg_amendment_window on public.%I', r.tbl);
            execute format(
                'create trigger trg_amendment_window before update on public.%I
                     for each row execute function public.enforce_amendment_window(%L, %L, %L)',
                r.tbl, r.author, r.anchor, r.content
            );
        end if;
    end loop;
end $$;

-- ── Append-only correction notes ────────────────────────────────────────────
-- The other half of the policy. A freeze with no way to correct the record
-- just moves the correction into WhatsApp and paper, so notes are always
-- allowed — they are dated, signed, and never overwrite the original entry.
create table if not exists public.record_addenda (
    id          uuid primary key default gen_random_uuid(),
    -- 'consultation' | 'lab_result' | 'radiology_report' | 'nursing_action' |
    -- 'prescription' | 'dispensing' | 'discharge_note' | 'drug_chart' |
    -- 'fluid_balance'  (see lib/records/registry.ts)
    entity_type text not null,
    -- text, not uuid: the legacy EMR has id columns of both shapes.
    entity_id   text not null,
    patient_id  uuid,
    -- Authorship is stored twice on purpose. author_id points at the staff row
    -- where the deployment's staffs.id allows it; author_name snapshots who
    -- signed the note, so the trail survives a renamed or removed account.
    author_id   text,
    author_role text,
    author_name text,
    reason      text,
    content     text not null check (char_length(content) between 1 and 4000),
    created_at  timestamptz not null default now()
);

create index if not exists idx_record_addenda_entity
    on public.record_addenda (entity_type, entity_id, created_at);
create index if not exists idx_record_addenda_patient
    on public.record_addenda (patient_id, created_at desc);

-- A note is immutable. There is no UPDATE/DELETE policy below, and these
-- triggers make the intent loud even for a service-role session that is
-- somehow carrying a user — privileged sessions (SQL editor, retention job)
-- still get through, because that is where a hard delete belongs.
create or replace function public.record_addenda_is_immutable()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    if public.amendment_session_is_privileged() then
        return new;
    end if;
    raise exception 'Correction notes cannot be modified or removed — add another one instead.';
end;
$$;

drop trigger if exists trg_record_addenda_no_update on public.record_addenda;
create trigger trg_record_addenda_no_update
    before update on public.record_addenda
    for each row execute function public.record_addenda_is_immutable();

drop trigger if exists trg_record_addenda_no_delete on public.record_addenda;
create trigger trg_record_addenda_no_delete
    before delete on public.record_addenda
    for each row execute function public.record_addenda_is_immutable();

-- ── Row Level Security ───────────────────────────────────────────────────────
-- These helpers come from 20260814_enable_rls_security.sql and are re-declared
-- with `create or replace` so this file also works on a deployment where that
-- one has not been applied yet (same pattern as 20260814_emr_modules_schema.sql).
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
    select lower(regexp_replace(role, '[^a-z]', '', 'g')) as compact
    from public.staffs where id::text = auth.uid()::text
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

alter table public.record_addenda enable row level security;

-- Any clinician can read the corrections attached to a record they can already
-- see; visibility of the record itself stays with that table's own policies.
drop policy if exists "record_addenda select staff" on public.record_addenda;
create policy "record_addenda select staff" on public.record_addenda
  for select to authenticated using (public.is_staff());

-- Staff may add a note, but only signed as themselves.
drop policy if exists "record_addenda insert staff" on public.record_addenda;
create policy "record_addenda insert staff" on public.record_addenda
  for insert to authenticated with check (
    public.is_staff() and author_id = auth.uid()::text
  );

-- No update / delete policy at all → append-only for every staff session.
drop policy if exists "record_addenda update" on public.record_addenda;
drop policy if exists "record_addenda delete" on public.record_addenda;

-- Belt and braces for the anon key: nothing without a session.
revoke all on table public.record_addenda from anon;
grant  select, insert on table public.record_addenda to authenticated;

-- Realtime: the audit/review screen can watch corrections land live.
do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (
            select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and tablename = 'record_addenda'
       ) then
        execute 'alter publication supabase_realtime add table public.record_addenda';
    end if;
exception when others then
    raise notice 'record_addenda realtime publication skipped: %', sqlerrm;
end $$;

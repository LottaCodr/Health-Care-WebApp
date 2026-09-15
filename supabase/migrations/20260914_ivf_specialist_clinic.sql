-- ═══════════════════════════════════════════════════════════════════════════
-- IVF SPECIALIST CLINIC
--
-- A patient remains a Nile Valley patient. IVF is a child specialist clinic
-- under the hospital, with a cycle/episode model and first-class reproductive
-- material, cryostorage, consent and witnessed laboratory events.
--
-- Apply with: supabase db push
-- This migration is intentionally additive and safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Facility hierarchy / specialty metadata ──────────────────────────────
alter table public.facilities
    add column if not exists facility_type text not null default 'hospital';
alter table public.facilities
    add column if not exists parent_facility_id uuid references public.facilities(id) on delete set null;
alter table public.facilities
    add column if not exists specialty_code text;
alter table public.facilities
    add column if not exists description text;
alter table public.facilities
    add column if not exists settings jsonb not null default '{}'::jsonb;

create index if not exists idx_facilities_parent on public.facilities(parent_facility_id);
create index if not exists idx_facilities_specialty on public.facilities(specialty_code);

-- Facility metadata is safe for authenticated staff to read, but hierarchy
-- mutations stay administrator-only. This also makes the Add Facility flow
-- consistent on deployments where the original facilities table had no RLS.
alter table public.facilities enable row level security;
drop policy if exists "facilities select staff" on public.facilities;
create policy "facilities select staff" on public.facilities for select to authenticated
using (public.is_staff());
drop policy if exists "facilities insert admin" on public.facilities;
create policy "facilities insert admin" on public.facilities for insert to authenticated
with check (public.staff_can('Admin'));
drop policy if exists "facilities update admin" on public.facilities;
create policy "facilities update admin" on public.facilities for update to authenticated
using (public.staff_can('Admin')) with check (public.staff_can('Admin'));

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'facilities_facility_type_check'
          and conrelid = 'public.facilities'::regclass
    ) then
        alter table public.facilities add constraint facilities_facility_type_check
            check (facility_type in ('hospital', 'specialist_clinic', 'laboratory', 'satellite_site'));
    end if;
end $$;

-- Create the hierarchy used by a fresh Nile Valley deployment. Existing rows
-- with these codes are not overwritten, so an administrator remains in control
-- of names, addresses and activation state.
insert into public.facilities (name, code, facility_type, description, is_active)
values (
    'Nile Valley Hospital',
    'NVH',
    'hospital',
    'Nile Valley Hospital general hospital and shared EMR parent organization.',
    true
)
on conflict (code) do nothing;

insert into public.facilities (
    name, code, facility_type, parent_facility_id, specialty_code, description, is_active
)
select
    'IVF & Reproductive Medicine',
    'NVH-IVF',
    'specialist_clinic',
    f.id,
    'ivf',
    'Specialist clinic for assisted reproduction, andrology, embryology and cryostorage.',
    true
from public.facilities f
where f.code = 'NVH'
on conflict (code) do nothing;

-- ── 2. Cycle / episode ──────────────────────────────────────────────────────
create table if not exists public.ivf_cycles (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid not null references public.facilities(id) on delete restrict,
    patient_id uuid not null references public.patients(id) on delete restrict,
    partner_patient_id uuid references public.patients(id) on delete set null,
    cycle_number integer not null default 1 check (cycle_number > 0),
    treatment_type text not null default 'ivf'
        check (treatment_type in ('ivf','icsi','fet','iui','egg-freezing','sperm-freezing')),
    cycle_type text not null default 'fresh' check (cycle_type in ('fresh','frozen')),
    status text not null default 'planned'
        check (status in ('planned','stimulation','triggered','retrieval','fertilization','culture','transfer','luteal','completed','paused','cancelled')),
    indication text,
    protocol text,
    planned_start_date date,
    stimulation_start_date date,
    trigger_at timestamptz,
    retrieval_at timestamptz,
    transfer_at timestamptz,
    outcome text,
    notes text,
    created_by uuid references public.staffs(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (facility_id, patient_id, cycle_number)
);

create index if not exists idx_ivf_cycles_facility_status on public.ivf_cycles(facility_id, status, updated_at desc);
create index if not exists idx_ivf_cycles_patient on public.ivf_cycles(patient_id, created_at desc);

create table if not exists public.ivf_cycle_participants (
    id uuid primary key default gen_random_uuid(),
    cycle_id uuid not null references public.ivf_cycles(id) on delete cascade,
    patient_id uuid references public.patients(id) on delete set null,
    participant_role text not null
        check (participant_role in ('intended-parent','partner','oocyte-donor','sperm-donor','gestational-carrier','other')),
    display_name text,
    is_primary boolean not null default false,
    consent_required boolean not null default true,
    notes text,
    created_at timestamptz not null default now()
);
create index if not exists idx_ivf_participants_cycle on public.ivf_cycle_participants(cycle_id);

-- ── 3. Stimulation / monitoring ─────────────────────────────────────────────
create table if not exists public.ivf_monitoring_visits (
    id uuid primary key default gen_random_uuid(),
    cycle_id uuid not null references public.ivf_cycles(id) on delete cascade,
    visit_at timestamptz not null default now(),
    cycle_day integer check (cycle_day is null or cycle_day >= 0),
    endometrial_thickness_mm numeric(6,2),
    endometrial_pattern text,
    right_follicles jsonb not null default '[]'::jsonb,
    left_follicles jsonb not null default '[]'::jsonb,
    estradiol_pg_ml numeric(10,2),
    lh_iu_l numeric(10,2),
    progesterone_ng_ml numeric(10,2),
    medication_changes jsonb not null default '[]'::jsonb,
    assessment text,
    plan text,
    clinician_id uuid references public.staffs(id) on delete set null,
    created_at timestamptz not null default now()
);
create index if not exists idx_ivf_monitoring_cycle_date on public.ivf_monitoring_visits(cycle_id, visit_at desc);

-- ── 4. Andrology / sperm processing ──────────────────────────────────────────
create table if not exists public.ivf_semen_samples (
    id uuid primary key default gen_random_uuid(),
    cycle_id uuid not null references public.ivf_cycles(id) on delete cascade,
    provider_patient_id uuid references public.patients(id) on delete set null,
    sample_code text unique,
    specimen text,
    source text not null default 'husband' check (source in ('husband','donor','surgically-retrieved','other')),
    surgical_type text check (surgical_type is null or surgical_type in ('PESA','TESA','TESE','Micro-TESE','other')),
    sample_state text not null default 'fresh' check (sample_state in ('fresh','frozen')),
    abstinence_days numeric(5,2),
    collection_method text,
    collection_location text,
    collected_at timestamptz,
    delivered_at timestamptz,
    volume_ml numeric(8,3),
    ph numeric(5,2),
    viscosity text,
    colour text,
    liquefaction_minutes integer,
    concentration_million_ml numeric(12,3),
    total_sperm_count_million numeric(12,3),
    total_motility_percent numeric(5,2),
    progressive_motility_percent numeric(5,2),
    non_progressive_motility_percent numeric(5,2),
    immotile_percent numeric(5,2),
    morphology_normal_percent numeric(5,2),
    vitality_percent numeric(5,2),
    agglutination text,
    debris_round_cells text,
    preparation_indication text check (preparation_indication is null or preparation_indication in ('IVF','ICSI','other')),
    preparation_method text,
    media_used text,
    media_lot_number text,
    centrifugation_speed_rpm integer,
    centrifugation_time_minutes integer,
    final_volume_ml numeric(8,3),
    final_concentration_million_ml numeric(12,3),
    motile_sperm_count_million numeric(12,3),
    final_progressive_motility_percent numeric(5,2),
    rapid_progressive_percent numeric(5,2),
    slow_progressive_percent numeric(5,2),
    suitable_for_ivf boolean,
    suitable_for_icsi boolean,
    frozen boolean not null default false,
    freezing_method text,
    number_of_vials integer,
    storage_location text,
    frozen_at timestamptz,
    serology jsonb not null default '{}'::jsonb,
    genetic_screening jsonb not null default '{}'::jsonb,
    comments text,
    operator_id uuid not null references public.staffs(id) on delete restrict,
    witness_id uuid not null references public.staffs(id) on delete restrict,
    created_at timestamptz not null default now()
);
create index if not exists idx_ivf_semen_cycle on public.ivf_semen_samples(cycle_id, created_at desc);
create index if not exists idx_ivf_semen_provider on public.ivf_semen_samples(provider_patient_id);

-- ── 5. Retrieval / individual oocytes ────────────────────────────────────────
create table if not exists public.ivf_oocyte_retrievals (
    id uuid primary key default gen_random_uuid(),
    cycle_id uuid not null references public.ivf_cycles(id) on delete cascade,
    retrieval_at timestamptz not null,
    trigger_used text,
    trigger_at timestamptz,
    interval_post_trigger_hours numeric(6,2),
    oocyte_source text check (oocyte_source is null or oocyte_source in ('own','donor','other')),
    stimulation_protocol text,
    right_follicle_count integer,
    left_follicle_count integer,
    oocytes_retrieved integer,
    difficult_access boolean not null default false,
    aspiration_needle text,
    aspiration_pressure text,
    flushing_medium text,
    handling_media text,
    media_lot_number text,
    complications jsonb not null default '[]'::jsonb,
    comments text,
    clinician_id uuid references public.staffs(id) on delete set null,
    embryologist_id uuid references public.staffs(id) on delete set null,
    witness_id uuid not null references public.staffs(id) on delete restrict,
    created_at timestamptz not null default now()
);
create index if not exists idx_ivf_retrieval_cycle on public.ivf_oocyte_retrievals(cycle_id, retrieval_at desc);

create table if not exists public.ivf_oocytes (
    id uuid primary key default gen_random_uuid(),
    cycle_id uuid not null references public.ivf_cycles(id) on delete cascade,
    retrieval_id uuid not null references public.ivf_oocyte_retrievals(id) on delete cascade,
    oocyte_number integer not null check (oocyte_number > 0),
    maturity text check (maturity is null or maturity in ('MII','MI','GV','degenerated','other')),
    insemination_type text check (insemination_type is null or insemination_type in ('ICSI','conventional','not-inseminated')),
    insemination_at timestamptz,
    pn_status text,
    status text,
    comments text,
    operator_id uuid not null references public.staffs(id) on delete restrict,
    witness_id uuid not null references public.staffs(id) on delete restrict,
    created_at timestamptz not null default now(),
    unique (cycle_id, oocyte_number)
);
create index if not exists idx_ivf_oocytes_retrieval on public.ivf_oocytes(retrieval_id, oocyte_number);

-- ── 6. Embryology / PGT ──────────────────────────────────────────────────────
create table if not exists public.ivf_embryos (
    id uuid primary key default gen_random_uuid(),
    cycle_id uuid not null references public.ivf_cycles(id) on delete cascade,
    oocyte_id uuid references public.ivf_oocytes(id) on delete set null,
    embryo_number integer not null check (embryo_number > 0),
    day integer check (day is null or day between 0 and 7),
    pn_status text,
    stage text,
    icm_grade text,
    te_grade text,
    quality text,
    status text not null default 'in-culture'
        check (status in ('in-culture','biopsied','transferred','frozen','discarded','arrested')),
    transfer_type text check (transfer_type is null or transfer_type in ('fresh','frozen')),
    transferred_at timestamptz,
    biopsied_at timestamptz,
    pgt_type text check (pgt_type is null or pgt_type in ('PGT-A','PGT-M','PGT-SR')),
    pgt_result text,
    pgt_status text check (pgt_status is null or pgt_status in ('euploid','aneuploid','mosaic','inconclusive','not-tested')),
    pgt_lab text,
    frozen_at timestamptz,
    freeze_method text,
    cryodevice_id text,
    comments text,
    operator_id uuid not null references public.staffs(id) on delete restrict,
    witness_id uuid not null references public.staffs(id) on delete restrict,
    created_at timestamptz not null default now(),
    unique (cycle_id, embryo_number)
);
create index if not exists idx_ivf_embryos_cycle_status on public.ivf_embryos(cycle_id, status, embryo_number);

-- ── 7. Cryobank inventory ────────────────────────────────────────────────────
create table if not exists public.ivf_cryo_inventory (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid not null references public.facilities(id) on delete restrict,
    cycle_id uuid not null references public.ivf_cycles(id) on delete restrict,
    patient_id uuid not null references public.patients(id) on delete restrict,
    material_type text not null check (material_type in ('sperm','oocyte','embryo')),
    semen_sample_id uuid references public.ivf_semen_samples(id) on delete set null,
    oocyte_id uuid references public.ivf_oocytes(id) on delete set null,
    embryo_id uuid references public.ivf_embryos(id) on delete set null,
    cryodevice_id text not null,
    units integer not null default 1 check (units > 0),
    stage text,
    grade text,
    method text,
    tank text not null,
    canister text,
    goblet text,
    slot text,
    stored_at timestamptz not null default now(),
    consent_until date,
    status text not null default 'stored'
        check (status in ('stored','reserved','warmed','transferred','discarded','missing')),
    disposition text,
    operator_id uuid not null references public.staffs(id) on delete restrict,
    witness_id uuid not null references public.staffs(id) on delete restrict,
    created_at timestamptz not null default now(),
    unique (facility_id, cryodevice_id)
);
create index if not exists idx_ivf_cryo_facility_status on public.ivf_cryo_inventory(facility_id, status, consent_until);
create index if not exists idx_ivf_cryo_patient on public.ivf_cryo_inventory(patient_id, status);

-- ── 8. Witnessed, append-only laboratory event log ───────────────────────────
create table if not exists public.ivf_lab_events (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid not null references public.facilities(id) on delete restrict,
    cycle_id uuid not null references public.ivf_cycles(id) on delete restrict,
    event_type text not null,
    entity_type text not null,
    entity_id uuid,
    event_at timestamptz not null default now(),
    operator_id uuid not null references public.staffs(id) on delete restrict,
    witness_id uuid not null references public.staffs(id) on delete restrict,
    witness_method text not null default 'manual' check (witness_method in ('manual','electronic')),
    verification_status text not null default 'passed' check (verification_status in ('passed','mismatch','stopped','downtime-reconciled')),
    identifiers_checked jsonb not null default '{}'::jsonb,
    source_identifier text,
    destination_identifier text,
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);
create index if not exists idx_ivf_lab_events_cycle_time on public.ivf_lab_events(cycle_id, event_at desc);
create index if not exists idx_ivf_lab_events_facility_type on public.ivf_lab_events(facility_id, event_type, event_at desc);

-- Critical material creation writes its custody event in the same database
-- transaction. The UI still asks for the witness, but the audit trail does not
-- depend on a second client request succeeding after the material row is saved.
create or replace function public.ivf_material_insert_event()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
    row_data jsonb;
    v_cycle_id uuid;
    v_facility_id uuid;
    v_operator_id uuid;
    v_witness_id uuid;
    v_event_type text;
    v_entity_type text;
    v_source text;
    v_destination text;
begin
    row_data := to_jsonb(new);
    v_cycle_id := nullif(row_data ->> 'cycle_id', '')::uuid;
    v_facility_id := nullif(row_data ->> 'facility_id', '')::uuid;
    v_operator_id := nullif(coalesce(row_data ->> 'operator_id', row_data ->> 'clinician_id', row_data ->> 'embryologist_id'), '')::uuid;
    v_witness_id := nullif(row_data ->> 'witness_id', '')::uuid;

    if tg_table_name = 'ivf_semen_samples' then
        v_event_type := 'specimen-received';
        v_entity_type := 'semen-sample';
        v_source := coalesce(row_data ->> 'sample_code', row_data ->> 'id');
    elsif tg_table_name = 'ivf_oocyte_retrievals' then
        v_event_type := 'oocyte-retrieval';
        v_entity_type := 'retrieval';
        v_source := row_data ->> 'id';
    elsif tg_table_name = 'ivf_oocytes' then
        v_event_type := 'oocyte-recorded';
        v_entity_type := 'oocyte';
        v_source := row_data ->> 'id';
    elsif tg_table_name = 'ivf_embryos' then
        v_event_type := 'embryo-recorded';
        v_entity_type := 'embryo';
        v_source := row_data ->> 'id';
    elsif tg_table_name = 'ivf_cryo_inventory' then
        v_event_type := 'cryo-placement';
        v_entity_type := 'cryostorage';
        v_source := coalesce(row_data ->> 'cryodevice_id', row_data ->> 'id');
        v_destination := concat_ws(' / ', row_data ->> 'tank', row_data ->> 'canister', row_data ->> 'goblet', row_data ->> 'slot');
    else
        return new;
    end if;

    if v_facility_id is null then
        select c.facility_id into v_facility_id
        from public.ivf_cycles c
        where c.id = v_cycle_id;
    end if;

    if v_operator_id is null or v_witness_id is null or v_facility_id is null then
        raise exception 'IVF critical material rows require operator, witness and facility context';
    end if;

    insert into public.ivf_lab_events (
        facility_id, cycle_id, event_type, entity_type, entity_id,
        operator_id, witness_id, witness_method, verification_status,
        identifiers_checked, source_identifier, destination_identifier, details
    ) values (
        v_facility_id, v_cycle_id, v_event_type, v_entity_type,
        (row_data ->> 'id')::uuid, v_operator_id, v_witness_id, 'manual', 'passed',
        jsonb_build_object('cycle_id', v_cycle_id::text, 'entity_id', (row_data ->> 'id')),
        v_source, v_destination, jsonb_build_object('source_table', tg_table_name)
    );

    return new;
end;
$$;

 drop trigger if exists ivf_semen_insert_event on public.ivf_semen_samples;
create trigger ivf_semen_insert_event after insert on public.ivf_semen_samples
for each row execute function public.ivf_material_insert_event();
 drop trigger if exists ivf_retrieval_insert_event on public.ivf_oocyte_retrievals;
create trigger ivf_retrieval_insert_event after insert on public.ivf_oocyte_retrievals
for each row execute function public.ivf_material_insert_event();
 drop trigger if exists ivf_oocyte_insert_event on public.ivf_oocytes;
create trigger ivf_oocyte_insert_event after insert on public.ivf_oocytes
for each row execute function public.ivf_material_insert_event();
 drop trigger if exists ivf_embryo_insert_event on public.ivf_embryos;
create trigger ivf_embryo_insert_event after insert on public.ivf_embryos
for each row execute function public.ivf_material_insert_event();
 drop trigger if exists ivf_cryo_insert_event on public.ivf_cryo_inventory;
create trigger ivf_cryo_insert_event after insert on public.ivf_cryo_inventory
for each row execute function public.ivf_material_insert_event();

-- ── 9. Versioned consents ────────────────────────────────────────────────────
create table if not exists public.ivf_consents (
    id uuid primary key default gen_random_uuid(),
    cycle_id uuid not null references public.ivf_cycles(id) on delete restrict,
    patient_id uuid not null references public.patients(id) on delete restrict,
    consent_type text not null,
    version text not null,
    status text not null default 'pending' check (status in ('pending','signed','withdrawn','expired')),
    signed_at timestamptz,
    expires_at timestamptz,
    document_id uuid references public.patient_documents(id) on delete set null,
    witness_id uuid references public.staffs(id) on delete set null,
    notes text,
    created_at timestamptz not null default now()
);
create index if not exists idx_ivf_consents_cycle_status on public.ivf_consents(cycle_id, status, expires_at);

-- ── 10. Outcomes ─────────────────────────────────────────────────────────────
create table if not exists public.ivf_outcomes (
    id uuid primary key default gen_random_uuid(),
    cycle_id uuid not null unique references public.ivf_cycles(id) on delete restrict,
    beta_hcg_date date,
    beta_hcg_result text,
    clinical_pregnancy_date date,
    fetal_heartbeat_date date,
    pregnancy_outcome text,
    live_birth_date date,
    notes text,
    recorded_by uuid references public.staffs(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ── 11. Protocol deviations / safety events ─────────────────────────────────
create table if not exists public.ivf_protocol_deviations (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid not null references public.facilities(id) on delete restrict,
    cycle_id uuid references public.ivf_cycles(id) on delete set null,
    event_id uuid references public.ivf_lab_events(id) on delete set null,
    severity text not null default 'near-miss' check (severity in ('near-miss','low','moderate','serious','critical')),
    status text not null default 'open' check (status in ('open','investigating','resolved','closed')),
    summary text not null,
    immediate_action text,
    root_cause text,
    corrective_action text,
    reported_by uuid not null references public.staffs(id) on delete restrict,
    reviewed_by uuid references public.staffs(id) on delete set null,
    reported_at timestamptz not null default now(),
    resolved_at timestamptz
);
create index if not exists idx_ivf_deviations_facility_status on public.ivf_protocol_deviations(facility_id, status, reported_at desc);

-- ── 12. Updated-at helpers ───────────────────────────────────────────────────
create or replace function public.ivf_touch_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists ivf_cycles_touch_updated_at on public.ivf_cycles;
create trigger ivf_cycles_touch_updated_at before update on public.ivf_cycles
for each row execute function public.ivf_touch_updated_at();
drop trigger if exists ivf_outcomes_touch_updated_at on public.ivf_outcomes;
create trigger ivf_outcomes_touch_updated_at before update on public.ivf_outcomes
for each row execute function public.ivf_touch_updated_at();

-- ── 13. Facility-aware access helper ─────────────────────────────────────────
-- Staff without a facility assignment remain compatible with the current EMR
-- and can access assigned specialty workspaces. Once assignments are populated,
-- a staff member may access their facility, its parent hospital or an admin-
-- approved clinic. Admins always pass.
create or replace function public.staff_can_facility(target_facility uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
    select public.staff_has_role('Admin') or exists (
        select 1
        from public.staffs s
        left join public.facilities assigned on assigned.id = s.facility_id
        join public.facilities target on target.id = target_facility
        where s.id::text = auth.uid()::text
          and (
              s.facility_id is null
              or s.facility_id = target.id
              or s.facility_id = target.parent_facility_id
          )
    );
$$;

-- ── 14. RLS ──────────────────────────────────────────────────────────────────
-- Existing deployments may apply the general RLS migration before this file;
-- these policies are self-contained and idempotent.
create or replace function public.ivf_staff_select(target_facility uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_staff() and public.staff_can_facility(target_facility); $$;

-- Return only the identity fields needed to choose an independent witness. This
-- avoids widening the existing staff profile read policy (which protects email
-- and phone data) just to power the IVF safety control.
create or replace function public.ivf_list_witnesses(p_facility_id uuid)
returns table(id uuid, name text, role text, department text)
language sql stable security definer set search_path = public
as $$
    select s.id, s.name, s.role, s.department
    from public.staffs s
    join public.facilities target on target.id = p_facility_id
    where public.is_staff()
      and public.staff_can_facility(p_facility_id)
      and lower(coalesce(s.status, 'active')) = 'active'
      and (
          s.facility_id is null
          or s.facility_id = p_facility_id
          or s.facility_id = target.parent_facility_id
      )
      and regexp_replace(lower(trim(coalesce(s.role::text, ''))), '[^a-z]', '', 'g') like any (
          array['%lab%', '%laboratory%', '%doctor%', '%physician%', '%consultant%', '%nurse%', '%nursing%']
      )
    order by s.name;
$$;
revoke all on function public.ivf_list_witnesses(uuid) from public;
grant execute on function public.ivf_list_witnesses(uuid) to authenticated;

alter table public.ivf_cycles enable row level security;
alter table public.ivf_cycle_participants enable row level security;
alter table public.ivf_monitoring_visits enable row level security;
alter table public.ivf_semen_samples enable row level security;
alter table public.ivf_oocyte_retrievals enable row level security;
alter table public.ivf_oocytes enable row level security;
alter table public.ivf_embryos enable row level security;
alter table public.ivf_cryo_inventory enable row level security;
alter table public.ivf_lab_events enable row level security;
alter table public.ivf_consents enable row level security;
alter table public.ivf_outcomes enable row level security;
alter table public.ivf_protocol_deviations enable row level security;

-- Cycles
 drop policy if exists "ivf cycles select clinic" on public.ivf_cycles;
create policy "ivf cycles select clinic" on public.ivf_cycles for select to authenticated
using (public.ivf_staff_select(facility_id));
drop policy if exists "ivf cycles insert clinical" on public.ivf_cycles;
create policy "ivf cycles insert clinical" on public.ivf_cycles for insert to authenticated
with check (public.ivf_staff_select(facility_id) and (public.staff_can('FrontDesk') or public.staff_can('Doctor') or public.staff_can('Nurse')));
drop policy if exists "ivf cycles update clinical" on public.ivf_cycles;
create policy "ivf cycles update clinical" on public.ivf_cycles for update to authenticated
using (public.ivf_staff_select(facility_id) and (public.staff_can('Doctor') or public.staff_can('Nurse')))
with check (public.ivf_staff_select(facility_id) and (public.staff_can('Doctor') or public.staff_can('Nurse')));

-- Child clinical records use the cycle's facility through a small helper.
create or replace function public.ivf_cycle_access(target_cycle uuid)
returns boolean language sql stable security definer set search_path = public
as $$
    select public.ivf_staff_select(c.facility_id)
    from public.ivf_cycles c where c.id = target_cycle;
$$;

-- Shared read rules. Writes are role-specific below.
drop policy if exists "ivf participants select clinic" on public.ivf_cycle_participants;
create policy "ivf participants select clinic" on public.ivf_cycle_participants for select to authenticated using (public.ivf_cycle_access(cycle_id));
drop policy if exists "ivf participants write clinical" on public.ivf_cycle_participants;
create policy "ivf participants write clinical" on public.ivf_cycle_participants for insert to authenticated
with check (public.ivf_cycle_access(cycle_id) and (public.staff_can('FrontDesk') or public.staff_can('Doctor') or public.staff_can('Nurse')));
drop policy if exists "ivf participants update clinical" on public.ivf_cycle_participants;
create policy "ivf participants update clinical" on public.ivf_cycle_participants for update to authenticated
using (public.ivf_cycle_access(cycle_id) and (public.staff_can('FrontDesk') or public.staff_can('Doctor') or public.staff_can('Nurse')))
with check (public.ivf_cycle_access(cycle_id) and (public.staff_can('FrontDesk') or public.staff_can('Doctor') or public.staff_can('Nurse')));

-- Monitoring
 drop policy if exists "ivf monitoring select clinic" on public.ivf_monitoring_visits;
create policy "ivf monitoring select clinic" on public.ivf_monitoring_visits for select to authenticated using (public.ivf_cycle_access(cycle_id));
drop policy if exists "ivf monitoring write clinical" on public.ivf_monitoring_visits;
create policy "ivf monitoring write clinical" on public.ivf_monitoring_visits for insert to authenticated with check (public.ivf_cycle_access(cycle_id) and (public.staff_can('Doctor') or public.staff_can('Nurse')));

-- Andrology / embryology are lab writes, while doctors can author procedure data.
 drop policy if exists "ivf semen select clinic" on public.ivf_semen_samples;
create policy "ivf semen select clinic" on public.ivf_semen_samples for select to authenticated using (public.ivf_cycle_access(cycle_id));
drop policy if exists "ivf semen insert lab" on public.ivf_semen_samples;
create policy "ivf semen insert lab" on public.ivf_semen_samples for insert to authenticated with check (public.ivf_cycle_access(cycle_id) and (public.staff_can('LabTechnician') or public.staff_can('Doctor')));
drop policy if exists "ivf semen update lab" on public.ivf_semen_samples;
create policy "ivf semen update lab" on public.ivf_semen_samples for update to authenticated using (public.ivf_cycle_access(cycle_id) and (public.staff_can('LabTechnician') or public.staff_can('Doctor'))) with check (public.ivf_cycle_access(cycle_id) and (public.staff_can('LabTechnician') or public.staff_can('Doctor')));

 drop policy if exists "ivf retrieval select clinic" on public.ivf_oocyte_retrievals;
create policy "ivf retrieval select clinic" on public.ivf_oocyte_retrievals for select to authenticated using (public.ivf_cycle_access(cycle_id));
drop policy if exists "ivf retrieval write" on public.ivf_oocyte_retrievals;
create policy "ivf retrieval write" on public.ivf_oocyte_retrievals for insert to authenticated
with check (public.ivf_cycle_access(cycle_id) and (public.staff_can('Doctor') or public.staff_can('LabTechnician')));
drop policy if exists "ivf retrieval update" on public.ivf_oocyte_retrievals;
create policy "ivf retrieval update" on public.ivf_oocyte_retrievals for update to authenticated
using (public.ivf_cycle_access(cycle_id) and (public.staff_can('Doctor') or public.staff_can('LabTechnician')))
with check (public.ivf_cycle_access(cycle_id) and (public.staff_can('Doctor') or public.staff_can('LabTechnician')));

 drop policy if exists "ivf oocytes select clinic" on public.ivf_oocytes;
create policy "ivf oocytes select clinic" on public.ivf_oocytes for select to authenticated using (public.ivf_cycle_access(cycle_id));
drop policy if exists "ivf oocytes write lab" on public.ivf_oocytes;
create policy "ivf oocytes write lab" on public.ivf_oocytes for insert to authenticated
with check (public.ivf_cycle_access(cycle_id) and (public.staff_can('LabTechnician') or public.staff_can('Doctor')));
drop policy if exists "ivf oocytes update lab" on public.ivf_oocytes;
create policy "ivf oocytes update lab" on public.ivf_oocytes for update to authenticated
using (public.ivf_cycle_access(cycle_id) and (public.staff_can('LabTechnician') or public.staff_can('Doctor')))
with check (public.ivf_cycle_access(cycle_id) and (public.staff_can('LabTechnician') or public.staff_can('Doctor')));

 drop policy if exists "ivf embryos select clinic" on public.ivf_embryos;
create policy "ivf embryos select clinic" on public.ivf_embryos for select to authenticated using (public.ivf_cycle_access(cycle_id));
drop policy if exists "ivf embryos write lab" on public.ivf_embryos;
create policy "ivf embryos write lab" on public.ivf_embryos for insert to authenticated
with check (public.ivf_cycle_access(cycle_id) and (public.staff_can('LabTechnician') or public.staff_can('Doctor')));
drop policy if exists "ivf embryos update lab" on public.ivf_embryos;
create policy "ivf embryos update lab" on public.ivf_embryos for update to authenticated
using (public.ivf_cycle_access(cycle_id) and (public.staff_can('LabTechnician') or public.staff_can('Doctor')))
with check (public.ivf_cycle_access(cycle_id) and (public.staff_can('LabTechnician') or public.staff_can('Doctor')));

-- Cryobank inventory is deliberately insert/update only through lab or admin;
-- individual movements are represented in ivf_lab_events as well.
 drop policy if exists "ivf cryo select clinic" on public.ivf_cryo_inventory;
create policy "ivf cryo select clinic" on public.ivf_cryo_inventory for select to authenticated using (public.ivf_staff_select(facility_id));
drop policy if exists "ivf cryo write lab" on public.ivf_cryo_inventory;
create policy "ivf cryo write lab" on public.ivf_cryo_inventory for insert to authenticated
with check (public.ivf_staff_select(facility_id) and public.staff_can('LabTechnician'));
drop policy if exists "ivf cryo update lab" on public.ivf_cryo_inventory;
create policy "ivf cryo update lab" on public.ivf_cryo_inventory for update to authenticated
using (public.ivf_staff_select(facility_id) and public.staff_can('LabTechnician'))
with check (public.ivf_staff_select(facility_id) and public.staff_can('LabTechnician'));

-- Append-only witness events: no update/delete policy by design.
drop policy if exists "ivf events select clinic" on public.ivf_lab_events;
create policy "ivf events select clinic" on public.ivf_lab_events for select to authenticated using (public.ivf_staff_select(facility_id));
drop policy if exists "ivf events insert witnessed" on public.ivf_lab_events;
create policy "ivf events insert witnessed" on public.ivf_lab_events for insert to authenticated
with check (public.ivf_staff_select(facility_id) and public.staff_can('LabTechnician'));

-- Consent and outcomes.
drop policy if exists "ivf consents select clinic" on public.ivf_consents;
create policy "ivf consents select clinic" on public.ivf_consents for select to authenticated using (public.ivf_cycle_access(cycle_id));
drop policy if exists "ivf consents write clinical" on public.ivf_consents;
create policy "ivf consents write clinical" on public.ivf_consents for insert to authenticated
with check (public.ivf_cycle_access(cycle_id) and (public.staff_can('FrontDesk') or public.staff_can('Doctor') or public.staff_can('Nurse')));
drop policy if exists "ivf consents update clinical" on public.ivf_consents;
create policy "ivf consents update clinical" on public.ivf_consents for update to authenticated
using (public.ivf_cycle_access(cycle_id) and (public.staff_can('FrontDesk') or public.staff_can('Doctor') or public.staff_can('Nurse')))
with check (public.ivf_cycle_access(cycle_id) and (public.staff_can('FrontDesk') or public.staff_can('Doctor') or public.staff_can('Nurse')));

drop policy if exists "ivf outcomes select clinic" on public.ivf_outcomes;
create policy "ivf outcomes select clinic" on public.ivf_outcomes for select to authenticated using (public.ivf_cycle_access(cycle_id));
drop policy if exists "ivf outcomes write clinical" on public.ivf_outcomes;
create policy "ivf outcomes write clinical" on public.ivf_outcomes for insert to authenticated
with check (public.ivf_cycle_access(cycle_id) and (public.staff_can('Doctor') or public.staff_can('Nurse')));
drop policy if exists "ivf outcomes update clinical" on public.ivf_outcomes;
create policy "ivf outcomes update clinical" on public.ivf_outcomes for update to authenticated
using (public.ivf_cycle_access(cycle_id) and (public.staff_can('Doctor') or public.staff_can('Nurse')))
with check (public.ivf_cycle_access(cycle_id) and (public.staff_can('Doctor') or public.staff_can('Nurse')));

-- Protocol deviations are visible to the clinic; any staff can report a
-- near-miss, but only clinical/admin users update the investigation.
drop policy if exists "ivf deviations select clinic" on public.ivf_protocol_deviations;
create policy "ivf deviations select clinic" on public.ivf_protocol_deviations for select to authenticated using (public.ivf_staff_select(facility_id));
drop policy if exists "ivf deviations insert staff" on public.ivf_protocol_deviations;
create policy "ivf deviations insert staff" on public.ivf_protocol_deviations for insert to authenticated with check (public.ivf_staff_select(facility_id) and public.is_staff());
drop policy if exists "ivf deviations update clinical" on public.ivf_protocol_deviations;
create policy "ivf deviations update clinical" on public.ivf_protocol_deviations for update to authenticated using (public.ivf_staff_select(facility_id) and (public.staff_can('Doctor') or public.staff_can('Admin'))) with check (public.ivf_staff_select(facility_id) and (public.staff_can('Doctor') or public.staff_can('Admin')));

-- Keep the facility hierarchy visible to staff; inserts/updates remain admin-only
-- in the existing facilities policies.

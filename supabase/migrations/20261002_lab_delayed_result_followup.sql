-- Delayed laboratory results may remain outstanding after discharge only when
-- the ordering clinician explicitly allows follow-up and a linked specimen has
-- been collected. Delivery tracking is kept outside the clinical result row so
-- Front Desk can record contact without gaining permission to edit results.

alter table public.lab_requests
    add column if not exists follow_up_after_discharge boolean not null default false;

create index if not exists lab_requests_deferred_result_idx
    on public.lab_requests (status, visit_id, created_at desc)
    where follow_up_after_discharge = true;

create table if not exists public.lab_result_followups (
    lab_request_id uuid primary key references public.lab_requests(id) on delete cascade,
    patient_id uuid not null references public.patients(id) on delete cascade,
    status text not null default 'pending_contact'
        check (status in ('pending_contact', 'delivered')),
    delivery_method text
        check (delivery_method is null or delivery_method in ('portal', 'phone', 'sms_whatsapp', 'in_person')),
    delivered_at timestamptz,
    delivered_by uuid references public.staffs(id) on delete set null,
    delivery_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists lab_result_followups_patient_status_idx
    on public.lab_result_followups (patient_id, status, updated_at desc);

alter table public.lab_result_followups enable row level security;

drop policy if exists "lab result followups select staff" on public.lab_result_followups;
create policy "lab result followups select staff" on public.lab_result_followups
    for select to authenticated
    using (public.is_staff());

drop policy if exists "lab result followups insert staff" on public.lab_result_followups;
create policy "lab result followups insert staff" on public.lab_result_followups
    for insert to authenticated
    with check (
        public.staff_can('LabTechnician')
        or public.staff_can('Doctor')
        or public.staff_can('FrontDesk')
    );

drop policy if exists "lab result followups update staff" on public.lab_result_followups;
create policy "lab result followups update staff" on public.lab_result_followups
    for update to authenticated
    using (
        public.staff_can('LabTechnician')
        or public.staff_can('Doctor')
        or public.staff_can('FrontDesk')
    )
    with check (
        public.staff_can('LabTechnician')
        or public.staff_can('Doctor')
        or public.staff_can('FrontDesk')
    );

drop policy if exists "lab result followups delete admin" on public.lab_result_followups;
create policy "lab result followups delete admin" on public.lab_result_followups
    for delete to authenticated
    using (public.staff_can('Admin'));

grant select, insert, update, delete on public.lab_result_followups to authenticated;
comment on column public.lab_requests.follow_up_after_discharge is
    'Clinician-approved delayed-result follow-up; discharge also requires a linked, non-rejected specimen.';
comment on table public.lab_result_followups is
    'Tracks delivery of deferred laboratory results; does not replace the clinical result in lab_requests.';

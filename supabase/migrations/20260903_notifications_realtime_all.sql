-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTIFICATION SYSTEM — realtime + "all staff" broadcast support
--
-- Fixes two silent failures:
--   1. The notifications table is never added to the `supabase_realtime`
--      publication on fresh deployments, so Realtime INSERT events never fire
--      and the bell only updated on page reload.
--   2. RLS only allowed personal + role notifications, so a broadcast
--      notification (recipient_id IS NULL and role IS NULL) was invisible to
--      every staff member, and personal notifications were missed by the
--      role-only Realtime filter used by the client.
--
-- Apply with: supabase db push  (idempotent)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Ensure the table exists on deployments where it predates migrations ──
create table if not exists public.notifications (
    id           uuid primary key default gen_random_uuid(),
    recipient_id uuid,
    role         text,
    title        text not null,
    message      text not null,
    type         text not null default 'info' check (type in ('info','alert','success','warning')),
    link         text,
    read         boolean not null default false,
    created_at   timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- ── 2. Indexes for the common query paths ────────────────────────────────────
create index if not exists notifications_created_at_idx
    on public.notifications (created_at desc);
create index if not exists notifications_recipient_idx
    on public.notifications (recipient_id);
create index if not exists notifications_role_idx
    on public.notifications (role);

-- ── 3. RLS: personal + role + broadcast ("all staff") ────────────────────────
drop policy if exists "notifications select own" on public.notifications;
create policy "notifications select own" on public.notifications
  for select to authenticated
  using (
    -- Broadcast to every staff member (recipient and role both unset, or an
    -- explicit "all" marker for legacy inserts).
    ((recipient_id is null and role is null)
        or lower(coalesce(role, '')) in ('all', '*', 'everyone'))
    -- Personal notification.
    or recipient_id::text = auth.uid()::text
    -- Role notification (case-insensitive, matching staffs.role).
    or lower(role) = lower(
         coalesce((select s.role from public.staffs s where s.id::text = auth.uid()::text limit 1), '')
       )
    -- Admins can review everything.
    or public.staff_has_role('Admin')
  );

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
  for update to authenticated
  using (
    ((recipient_id is null and role is null)
        or lower(coalesce(role, '')) in ('all', '*', 'everyone'))
    or recipient_id::text = auth.uid()::text
    or lower(role) = lower(
         coalesce((select s.role from public.staffs s where s.id::text = auth.uid()::text limit 1), '')
       )
    or public.staff_has_role('Admin')
  )
  with check (
    ((recipient_id is null and role is null)
        or lower(coalesce(role, '')) in ('all', '*', 'everyone'))
    or recipient_id::text = auth.uid()::text
    or lower(role) = lower(
         coalesce((select s.role from public.staffs s where s.id::text = auth.uid()::text limit 1), '')
       )
    or public.staff_has_role('Admin')
  );

-- Insert: any authenticated staff member may create notifications
-- (kept consistent with the original policy so existing behavior is unchanged).
drop policy if exists "notifications insert staff" on public.notifications;
create policy "notifications insert staff" on public.notifications
  for insert to authenticated with check (public.is_staff());

-- ── 4. Publish the table for Realtime (the critical missing piece) ──────────
do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        alter publication supabase_realtime add table public.notifications;
    end if;
exception
    when duplicate_object then null;   -- already a member
end $$;

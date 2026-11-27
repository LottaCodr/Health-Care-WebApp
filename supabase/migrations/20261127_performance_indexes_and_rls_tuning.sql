-- Enable pg_trgm for fast ILIKE '%...%' patient search
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- 1. Optimize RLS helper functions to use UUID equality (hits staffs_pkey instead of seq scan)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staffs
    WHERE id = (SELECT auth.uid())
      AND COALESCE(is_active, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_has_role(role_group text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH s AS (
    SELECT regexp_replace(lower(trim(role::text)), '[[:space:]_-]+', '', 'g') AS compact
    FROM public.staffs
    WHERE id = (SELECT auth.uid())
      AND COALESCE(is_active, true) = true
  )
  SELECT EXISTS (
    SELECT 1 FROM s
    WHERE CASE role_group
      WHEN 'FrontDesk'     THEN s.compact LIKE ANY (ARRAY['%front%','%reception%'])
      WHEN 'Doctor'        THEN s.compact LIKE ANY (ARRAY['%doctor%','%physician%','%consultant%'])
      WHEN 'Nurse'         THEN s.compact LIKE ANY (ARRAY['%nurse%','%nursing%'])
      WHEN 'LabTechnician' THEN s.compact LIKE ANY (ARRAY['%lab%','%laboratory%'])
      WHEN 'Pharmacist'    THEN s.compact LIKE ANY (ARRAY['%pharm%'])
      WHEN 'Radiologist'   THEN s.compact LIKE ANY (ARRAY['%radio%','%imaging%'])
      WHEN 'Admin'         THEN s.compact LIKE ANY (ARRAY['%admin%'])
      ELSE false
    END
  );
$$;

CREATE OR REPLACE FUNCTION public.patient_self_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.patients
  WHERE portal_user_id = (SELECT auth.uid())
    AND portal_enabled
  LIMIT 1;
$$;

-- 2. Wrap RLS policies on hot tables in (SELECT ...) initPlans so they evaluate once per query
DROP POLICY IF EXISTS "patients select staff" ON public.patients;
CREATE POLICY "patients select staff"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "patients select self portal" ON public.patients;
CREATE POLICY "patients select self portal"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (id = (SELECT public.patient_self_id()));

DROP POLICY IF EXISTS "patients update staff" ON public.patients;
CREATE POLICY "patients update staff"
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_staff()))
  WITH CHECK ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "patients delete admin" ON public.patients;
CREATE POLICY "patients delete admin"
  ON public.patients
  FOR DELETE
  TO authenticated
  USING ((SELECT public.staff_has_role('Admin'::text)));

DROP POLICY IF EXISTS "notifications select own" ON public.notifications;
CREATE POLICY "notifications select own"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    recipient_id = ((SELECT auth.uid()))::text
    OR (
      (SELECT public.is_staff())
      AND (
        (recipient_id IS NULL AND role IS NULL)
        OR lower(COALESCE(role, ''::text)) = ANY (ARRAY['all'::text, '*'::text, 'everyone'::text])
        OR lower(role) = lower(COALESCE((
          SELECT s.role FROM public.staffs s WHERE s.id = (SELECT auth.uid()) LIMIT 1
        ), ''::text))
        OR (SELECT public.staff_has_role('Admin'::text))
      )
    )
  );

DROP POLICY IF EXISTS "notifications update own" ON public.notifications;
CREATE POLICY "notifications update own"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (
    recipient_id = ((SELECT auth.uid()))::text
    OR (
      (SELECT public.is_staff())
      AND (
        (recipient_id IS NULL AND role IS NULL)
        OR lower(COALESCE(role, ''::text)) = ANY (ARRAY['all'::text, '*'::text, 'everyone'::text])
        OR lower(role) = lower(COALESCE((
          SELECT s.role FROM public.staffs s WHERE s.id = (SELECT auth.uid()) LIMIT 1
        ), ''::text))
        OR (SELECT public.staff_has_role('Admin'::text))
      )
    )
  )
  WITH CHECK (
    recipient_id = ((SELECT auth.uid()))::text
    OR (
      (SELECT public.is_staff())
      AND (
        (recipient_id IS NULL AND role IS NULL)
        OR lower(COALESCE(role, ''::text)) = ANY (ARRAY['all'::text, '*'::text, 'everyone'::text])
        OR lower(role) = lower(COALESCE((
          SELECT s.role FROM public.staffs s WHERE s.id = (SELECT auth.uid()) LIMIT 1
        ), ''::text))
        OR (SELECT public.staff_has_role('Admin'::text))
      )
    )
  );

-- 3. Add partial indexes matching `is_active IS NOT FALSE` (used by .not("is_active", "is", false))
CREATE INDEX IF NOT EXISTS idx_patients_not_false_status_created_at
  ON public.patients (status, created_at, id)
  WHERE (is_active IS NOT FALSE);

CREATE INDEX IF NOT EXISTS idx_patients_not_false_created_at
  ON public.patients (created_at, id)
  WHERE (is_active IS NOT FALSE);

-- 4. Add GIN trigram indexes for fast ILIKE '%...%' patient search
CREATE INDEX IF NOT EXISTS idx_patients_name_trgm
  ON public.patients USING gin (name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_phone_trgm
  ON public.patients USING gin (phone extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_email_trgm
  ON public.patients USING gin (email extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_hospital_number_trgm
  ON public.patients USING gin (hospital_number extensions.gin_trgm_ops);

-- 5. Index notifications by created_at DESC for fast initial bell fetch
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_desc
  ON public.notifications (created_at DESC);

-- 6. Single-query RPC for patient status counts (replaces 12 parallel count queries)
CREATE OR REPLACE FUNCTION public.get_patient_status_counts()
RETURNS TABLE(status text, cnt bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.status::text AS status, count(*)::bigint AS cnt
  FROM public.patients p
  WHERE p.is_active IS NOT FALSE
  GROUP BY p.status;
$$;

GRANT EXECUTE ON FUNCTION public.get_patient_status_counts() TO authenticated;

-- 7. Refresh planner statistics on hot tables
ANALYZE public.patients;
ANALYZE public.staffs;
ANALYZE public.notifications;
ANALYZE public.consultations;
ANALYZE public.lab_requests;
ANALYZE public.payments;
ANALYZE public.nursing_actions;

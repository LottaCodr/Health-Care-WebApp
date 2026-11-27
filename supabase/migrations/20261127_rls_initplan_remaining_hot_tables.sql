-- Wrap SELECT RLS policies on remaining hot tables in (SELECT ...) initPlans
-- so Postgres evaluates is_staff() once per query instead of once per row.

DROP POLICY IF EXISTS "appointments select staff" ON public.appointments;
CREATE POLICY "appointments select staff" ON public.appointments FOR SELECT TO authenticated USING ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "consultations select staff" ON public.consultations;
CREATE POLICY "consultations select staff" ON public.consultations FOR SELECT TO authenticated USING ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "drug_inventory select staff" ON public.drug_inventory;
CREATE POLICY "drug_inventory select staff" ON public.drug_inventory FOR SELECT TO authenticated USING ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "lab_requests select staff" ON public.lab_requests;
CREATE POLICY "lab_requests select staff" ON public.lab_requests FOR SELECT TO authenticated USING ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "lab_test_catalog select staff" ON public.lab_test_catalog;
CREATE POLICY "lab_test_catalog select staff" ON public.lab_test_catalog FOR SELECT TO authenticated USING ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "nursing_actions select staff" ON public.nursing_actions;
CREATE POLICY "nursing_actions select staff" ON public.nursing_actions FOR SELECT TO authenticated USING ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "payments select staff" ON public.payments;
CREATE POLICY "payments select staff" ON public.payments FOR SELECT TO authenticated USING ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "prescriptions select staff" ON public.prescriptions;
CREATE POLICY "prescriptions select staff" ON public.prescriptions FOR SELECT TO authenticated USING ((SELECT public.is_staff()));

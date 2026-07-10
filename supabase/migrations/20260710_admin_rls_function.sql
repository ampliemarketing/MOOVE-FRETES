-- Migration: corrige a checagem de admin nas políticas de RLS
--
-- As políticas criadas em 20260710_antt_compliance_2026.sql (e a pré-existente
-- em 20260421_admin_config.sql) dependiam de current_setting('app.admin_emails', true),
-- uma configuração do Postgres que nunca foi definida neste banco (confirmado via
-- `SELECT current_setting('app.admin_emails', true);` retornando NULL). Isso fazia
-- com que toda ação de admin protegida por essas políticas falhasse silenciosamente.
--
-- Esta migration substitui a checagem por uma função SQL própria (public.is_admin()),
-- que não depende de nenhuma configuração externa ao banco — só é preciso rodar esta
-- migration para que passe a funcionar.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', '') IN (
    'admin@moovefretes.com.br',
    'suporte@moovefretes.com.br'
  );
$$;

-- ── piso_minimo_coefficients ──────────────────────────────────────────────
DROP POLICY IF EXISTS "piso_coefficients_admin_write" ON public.piso_minimo_coefficients;
CREATE POLICY "piso_coefficients_admin_write" ON public.piso_minimo_coefficients
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── insurance_policies ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "insurance_policies_owner_write" ON public.insurance_policies;
CREATE POLICY "insurance_policies_owner_write" ON public.insurance_policies
  FOR ALL TO authenticated
  USING (
    (owner_type = 'company' AND owner_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()))
    OR (owner_type = 'driver' AND owner_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()))
    OR public.is_admin()
  )
  WITH CHECK (
    (owner_type = 'company' AND owner_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()))
    OR (owner_type = 'driver' AND owner_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()))
    OR public.is_admin()
  );

-- ── rntrc_verifications ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "rntrc_verifications_admin_write" ON public.rntrc_verifications;
CREATE POLICY "rntrc_verifications_admin_write" ON public.rntrc_verifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ── ciot_operations ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ciot_operations_write" ON public.ciot_operations;
CREATE POLICY "ciot_operations_write" ON public.ciot_operations
  FOR ALL TO authenticated
  USING (
    freight_id IN (
      SELECT id FROM public.freights WHERE publisher_id = auth.uid()
      UNION
      SELECT f.id FROM public.freights f
      JOIN public.drivers d ON d.id = f.accepted_driver_id
      WHERE d.user_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    freight_id IN (
      SELECT id FROM public.freights WHERE publisher_id = auth.uid()
      UNION
      SELECT f.id FROM public.freights f
      JOIN public.drivers d ON d.id = f.accepted_driver_id
      WHERE d.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ── mdfe_records ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "mdfe_records_write" ON public.mdfe_records;
CREATE POLICY "mdfe_records_write" ON public.mdfe_records
  FOR ALL TO authenticated
  USING (
    freight_id IN (
      SELECT id FROM public.freights WHERE publisher_id = auth.uid()
      UNION
      SELECT f.id FROM public.freights f
      JOIN public.drivers d ON d.id = f.accepted_driver_id
      WHERE d.user_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    freight_id IN (
      SELECT id FROM public.freights WHERE publisher_id = auth.uid()
      UNION
      SELECT f.id FROM public.freights f
      JOIN public.drivers d ON d.id = f.accepted_driver_id
      WHERE d.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ── vale_pedagio_records ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "vale_pedagio_write" ON public.vale_pedagio_records;
CREATE POLICY "vale_pedagio_write" ON public.vale_pedagio_records
  FOR ALL TO authenticated
  USING (
    freight_id IN (
      SELECT id FROM public.freights WHERE publisher_id = auth.uid()
      UNION
      SELECT f.id FROM public.freights f
      JOIN public.drivers d ON d.id = f.accepted_driver_id
      WHERE d.user_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    freight_id IN (
      SELECT id FROM public.freights WHERE publisher_id = auth.uid()
      UNION
      SELECT f.id FROM public.freights f
      JOIN public.drivers d ON d.id = f.accepted_driver_id
      WHERE d.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ── admin_config (bug pré-existente, mesma causa raiz) ───────────────────
DROP POLICY IF EXISTS "Admins can do everything on admin_config" ON public.admin_config;
CREATE POLICY "Admins can do everything on admin_config" ON public.admin_config
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

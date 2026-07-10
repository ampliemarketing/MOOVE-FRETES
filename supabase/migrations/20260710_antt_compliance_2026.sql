-- Migration: Conformidade ANTT 2026 (MP 1.343/2026, Resoluções ANTT 6.076/6.077/6.078/2026)
-- Cria a camada de compliance para: piso mínimo do frete, CIOT universal, MDF-e,
-- vale-pedágio eletrônico, seguros obrigatórios (RCTR-C/RC-DC/RC-V) e status de RNTRC.
--
-- IMPORTANTE: este sistema NÃO possui credenciais/contrato com provedores de CIOT
-- (Roadcard, TruckPad, FreteBras, Repom...), com a SEFAZ (MDF-e/CT-e) nem com o
-- webservice de seguros/RNTRC da ANTT. Por isso os registros abaixo funcionam como
-- um "gate" de conformidade: os números/status podem ser inseridos manualmente
-- (obtidos fora da plataforma) até que uma integração real seja contratada e
-- plugada nos adapters em src/utils/antt/providers/.

-- ============================================================
-- 1. PISO MÍNIMO — coeficientes (Resolução ANTT 5.867/2020 + 6.076/2026)
-- Fórmula oficial: Piso (R$) = (distância_km × CCD) + CC
-- Tabela editável pelo admin pois os coeficientes mudam via "gatilho do diesel"
-- várias vezes ao ano (portarias SUROC). Sempre confira/atualize em
-- calculadorafrete.antt.gov.br antes de confiar nos valores em produção.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.piso_minimo_coefficients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_carga text NOT NULL CHECK (categoria_carga IN (
    'carga_geral', 'granel_solido', 'granel_liquido', 'granel_pressurizada',
    'conteinerizada', 'frigorificada', 'neogranel',
    'perigosa_carga_geral', 'perigosa_granel_solido', 'perigosa_granel_liquido',
    'perigosa_conteinerizada', 'perigosa_frigorificada'
  )),
  tabela text NOT NULL DEFAULT 'A' CHECK (tabela IN ('A', 'B', 'C', 'D')),
  eixos integer NOT NULL CHECK (eixos IN (2, 3, 4, 5, 6, 7, 9)),
  ccd numeric(10,4) NOT NULL, -- coeficiente de deslocamento, R$/km
  cc numeric(10,2) NOT NULL,  -- coeficiente de carga e descarga, R$
  fonte text,                 -- referência normativa (ex.: "Portaria SUROC 4/2026")
  needs_verification boolean NOT NULL DEFAULT false, -- valor aproximado, pendente de confirmação oficial
  vigente_desde date NOT NULL DEFAULT current_date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (categoria_carga, tabela, eixos)
);

ALTER TABLE public.piso_minimo_coefficients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "piso_coefficients_select" ON public.piso_minimo_coefficients
  FOR SELECT USING (true);

CREATE POLICY "piso_coefficients_admin_write" ON public.piso_minimo_coefficients
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ','))))
  WITH CHECK (auth.jwt() ->> 'email' IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ','))));

-- Seed com dados públicos de terceiros (jul/2026), NÃO confirmados diretamente na fonte
-- oficial da ANTT — marcados needs_verification = true. Categorias sem dado confiável
-- herdam o coeficiente de "carga_geral" como aproximação conservadora (nunca ausência
-- de piso). Administre via painel de Conformidade > Piso Mínimo.
INSERT INTO public.piso_minimo_coefficients (categoria_carga, tabela, eixos, ccd, cc, fonte, needs_verification) VALUES
  ('granel_solido', 'A', 2, 4.03, 444.84, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('granel_solido', 'A', 3, 5.17, 533.36, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('granel_solido', 'A', 4, 5.85, 576.59, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('granel_solido', 'A', 5, 6.74, 642.10, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('granel_solido', 'A', 6, 7.44, 656.76, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('granel_solido', 'A', 7, 8.09, 792.30, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('granel_solido', 'A', 9, 9.27, 877.83, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),

  ('granel_liquido', 'A', 2, 4.11, 455.84, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('granel_liquido', 'A', 3, 5.26, 550.10, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('granel_liquido', 'A', 4, 6.00, 600.27, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('granel_liquido', 'A', 5, 6.90, 669.38, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('granel_liquido', 'A', 6, 7.61, 685.45, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('granel_liquido', 'A', 7, 8.22, 811.76, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('granel_liquido', 'A', 9, 9.42, 902.80, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),

  ('carga_geral', 'A', 2, 4.00, 436.39, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('carga_geral', 'A', 3, 5.13, 523.33, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('carga_geral', 'A', 4, 5.82, 568.72, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('carga_geral', 'A', 5, 6.71, 635.08, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('carga_geral', 'A', 6, 7.41, 648.95, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('carga_geral', 'A', 7, 8.13, 803.22, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('carga_geral', 'A', 9, 9.25, 872.44, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),

  ('frigorificada', 'A', 2, 4.74, 502.29, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('frigorificada', 'A', 3, 6.07, 601.96, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('frigorificada', 'A', 4, 6.92, 663.16, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('frigorificada', 'A', 5, 7.93, 732.07, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('frigorificada', 'A', 6, 8.76, 745.94, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('frigorificada', 'A', 7, 9.65, 949.16, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true),
  ('frigorificada', 'A', 9, 10.96, 1030.58, 'Estimativa de terceiros, jul/2026 — confirmar em calculadorafrete.antt.gov.br', true)
ON CONFLICT (categoria_carga, tabela, eixos) DO NOTHING;

-- Demais categorias (conteinerizada, granel_pressurizada, neogranel, perigosas) herdam
-- carga_geral com fator de aproximação até serem confirmadas manualmente pelo admin.
INSERT INTO public.piso_minimo_coefficients (categoria_carga, tabela, eixos, ccd, cc, fonte, needs_verification)
SELECT categoria, tabela, eixos, ccd, cc,
       'Aproximação via carga_geral — PENDENTE de confirmação manual em calculadorafrete.antt.gov.br',
       true
FROM (
  SELECT unnest(ARRAY['conteinerizada','granel_pressurizada','neogranel',
    'perigosa_carga_geral','perigosa_granel_solido','perigosa_granel_liquido',
    'perigosa_conteinerizada','perigosa_frigorificada']) AS categoria
) categorias
CROSS JOIN public.piso_minimo_coefficients ref
WHERE ref.categoria_carga = 'carga_geral' AND ref.tabela = 'A'
ON CONFLICT (categoria_carga, tabela, eixos) DO NOTHING;

-- ============================================================
-- 2. SEGUROS OBRIGATÓRIOS (RCTR-C, RC-DC, RC-V) — Resolução ANTT 6.068/2025
-- ============================================================
CREATE TABLE IF NOT EXISTS public.insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('company', 'driver')),
  owner_id uuid NOT NULL,
  policy_type text NOT NULL CHECK (policy_type IN ('RCTR-C', 'RC-DC', 'RC-V')),
  insurer_name text,
  policy_number text,
  valid_from date,
  valid_until date NOT NULL,
  status text NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'active', 'expired', 'rejected')),
  document_url text,
  verified_by uuid,
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_owner ON public.insurance_policies (owner_type, owner_id);

ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insurance_policies_select" ON public.insurance_policies
  FOR SELECT USING (true);

CREATE POLICY "insurance_policies_owner_write" ON public.insurance_policies
  FOR ALL TO authenticated
  USING (
    (owner_type = 'company' AND owner_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()))
    OR (owner_type = 'driver' AND owner_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()))
    OR auth.jwt() ->> 'email' IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ',')))
  )
  WITH CHECK (
    (owner_type = 'company' AND owner_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()))
    OR (owner_type = 'driver' AND owner_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()))
    OR auth.jwt() ->> 'email' IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ',')))
  );

-- ============================================================
-- 3. RNTRC — histórico/status de verificação (MP 1.343/2026, art. sobre RNTRC ativo)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rntrc_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('company', 'driver')),
  owner_id uuid NOT NULL,
  rntrc_number text,
  status text NOT NULL DEFAULT 'pendente_verificacao' CHECK (status IN ('ativo', 'suspenso', 'cancelado', 'pendente_verificacao')),
  method text NOT NULL DEFAULT 'manual_admin' CHECK (method IN ('manual_admin', 'webservice_pending')),
  checked_by uuid,
  checked_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rntrc_verifications_owner ON public.rntrc_verifications (owner_type, owner_id, checked_at DESC);

ALTER TABLE public.rntrc_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rntrc_verifications_select" ON public.rntrc_verifications
  FOR SELECT USING (true);

CREATE POLICY "rntrc_verifications_admin_write" ON public.rntrc_verifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ','))));

-- ============================================================
-- 4. CIOT — Resoluções ANTT 6.077/2026 e 6.078/2026 (CIOT universal + bloqueio na origem)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ciot_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freight_id uuid NOT NULL REFERENCES public.freights(id) ON DELETE CASCADE,
  ciot_number text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'blocked_below_piso', 'manual_pending', 'generated', 'cancelled', 'error')),
  provider text NOT NULL DEFAULT 'pending_integration' CHECK (provider IN (
    'roadcard', 'truckpad', 'fretebras', 'repom', 'sem_parar', 'bbc_digital',
    'mercado_pago', 'manual', 'pending_integration'
  )),
  operation_type text CHECK (operation_type IN ('TAC', 'TAC_AGREGADO', 'ETC_FROTA_PROPRIA', 'ETC_SUBCONTRATACAO', 'CTC')),
  contratante_id uuid,
  contratado_id uuid,
  subcontratado_id uuid,
  valor_operacao numeric(12,2),
  piso_minimo_aplicavel numeric(12,2),
  generated_at timestamptz,
  generated_by uuid,
  blocked_reason text,
  raw_response jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ciot_operations_freight ON public.ciot_operations (freight_id);

ALTER TABLE public.ciot_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ciot_operations_select" ON public.ciot_operations
  FOR SELECT USING (true);

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
    OR auth.jwt() ->> 'email' IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ',')))
  )
  WITH CHECK (
    freight_id IN (
      SELECT id FROM public.freights WHERE publisher_id = auth.uid()
      UNION
      SELECT f.id FROM public.freights f
      JOIN public.drivers d ON d.id = f.accepted_driver_id
      WHERE d.user_id = auth.uid()
    )
    OR auth.jwt() ->> 'email' IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ',')))
  );

-- ============================================================
-- 5. MDF-e — vínculo obrigatório com o CIOT (MP 1.343/2026)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mdfe_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freight_id uuid NOT NULL REFERENCES public.freights(id) ON DELETE CASCADE,
  numero_mdfe text,
  chave_acesso text,
  status text NOT NULL DEFAULT 'not_issued' CHECK (status IN ('not_issued', 'issued', 'cancelled')),
  ciot_operation_id uuid REFERENCES public.ciot_operations(id),
  issued_at timestamptz,
  issued_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mdfe_records_freight ON public.mdfe_records (freight_id);

ALTER TABLE public.mdfe_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mdfe_records_select" ON public.mdfe_records
  FOR SELECT USING (true);

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
    OR auth.jwt() ->> 'email' IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ',')))
  )
  WITH CHECK (
    freight_id IN (
      SELECT id FROM public.freights WHERE publisher_id = auth.uid()
      UNION
      SELECT f.id FROM public.freights f
      JOIN public.drivers d ON d.id = f.accepted_driver_id
      WHERE d.user_id = auth.uid()
    )
    OR auth.jwt() ->> 'email' IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ',')))
  );

-- ============================================================
-- 6. VALE-PEDÁGIO ELETRÔNICO (FVPO) — proibido dinheiro/cupom papel
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vale_pedagio_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freight_id uuid NOT NULL REFERENCES public.freights(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'pending_integration' CHECK (provider IN (
    'sem_parar', 'repom', 'conectcar', 'bbc_digital', 'via_facil', 'move_mais',
    'manual', 'pending_integration'
  )),
  tag_number text,
  valor numeric(12,2),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'error', 'not_applicable')),
  registered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vale_pedagio_freight ON public.vale_pedagio_records (freight_id);

ALTER TABLE public.vale_pedagio_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vale_pedagio_select" ON public.vale_pedagio_records
  FOR SELECT USING (true);

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
    OR auth.jwt() ->> 'email' IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ',')))
  )
  WITH CHECK (
    freight_id IN (
      SELECT id FROM public.freights WHERE publisher_id = auth.uid()
      UNION
      SELECT f.id FROM public.freights f
      JOIN public.drivers d ON d.id = f.accepted_driver_id
      WHERE d.user_id = auth.uid()
    )
    OR auth.jwt() ->> 'email' IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ',')))
  );

-- ============================================================
-- 7. FREIGHTS — novos campos regulatórios
-- ============================================================
ALTER TABLE public.freights
  ADD COLUMN IF NOT EXISTS operation_type text CHECK (operation_type IN ('TAC', 'TAC_AGREGADO', 'ETC_FROTA_PROPRIA', 'ETC_SUBCONTRATACAO', 'CTC')),
  ADD COLUMN IF NOT EXISTS load_classification text CHECK (load_classification IN ('lotacao', 'fracionada')),
  ADD COLUMN IF NOT EXISTS piso_minimo_valor numeric(12,2),
  ADD COLUMN IF NOT EXISTS piso_minimo_calculado_em timestamptz,
  ADD COLUMN IF NOT EXISTS abaixo_do_piso boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ciot_status text NOT NULL DEFAULT 'pending' CHECK (ciot_status IN ('not_required', 'pending', 'blocked_below_piso', 'manual_pending', 'generated', 'cancelled')),
  ADD COLUMN IF NOT EXISTS vale_pedagio_status text NOT NULL DEFAULT 'pending' CHECK (vale_pedagio_status IN ('pending', 'registered', 'not_applicable')),
  ADD COLUMN IF NOT EXISTS payment_account_type text CHECK (payment_account_type IN ('propria', 'terceiro_autorizado')),
  ADD COLUMN IF NOT EXISTS advance_payment_percent numeric(5,2);

-- ============================================================
-- 8. COMPANIES — classificação ETC/CTC/TAC-equiparado + status estruturado de RNTRC
-- ============================================================
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS company_subtype text NOT NULL DEFAULT 'etc_padrao' CHECK (company_subtype IN ('etc_padrao', 'ctc_cooperativa', 'tac_equiparado')),
  ADD COLUMN IF NOT EXISTS rntrc_status text NOT NULL DEFAULT 'pendente_verificacao' CHECK (rntrc_status IN ('ativo', 'suspenso', 'cancelado', 'pendente_verificacao')),
  ADD COLUMN IF NOT EXISTS ocb_registration text;

-- ============================================================
-- 9. DRIVERS — classificação TAC/TAC-Agregado + status estruturado de RNTRC + conta de pagamento
-- ============================================================
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS rntrc_status text NOT NULL DEFAULT 'pendente_verificacao' CHECK (rntrc_status IN ('ativo', 'suspenso', 'cancelado', 'pendente_verificacao')),
  ADD COLUMN IF NOT EXISTS driver_classification text NOT NULL DEFAULT 'TAC' CHECK (driver_classification IN ('TAC', 'TAC_AGREGADO')),
  ADD COLUMN IF NOT EXISTS payment_account_holder text NOT NULL DEFAULT 'proprio' CHECK (payment_account_holder IN ('proprio', 'terceiro_autorizado')),
  ADD COLUMN IF NOT EXISTS payment_account_holder_name text,
  ADD COLUMN IF NOT EXISTS payment_account_holder_doc text;

-- Backfill: RNTRC já cadastrado com validade futura entra como pendente de verificação
-- (nunca "ativo" automaticamente — isso exige checagem, manual ou por webservice).
UPDATE public.companies SET rntrc_status = 'pendente_verificacao' WHERE rntrc IS NOT NULL AND rntrc_status IS NULL;
UPDATE public.drivers SET rntrc_status = 'pendente_verificacao' WHERE rntrc IS NOT NULL AND rntrc_status IS NULL;

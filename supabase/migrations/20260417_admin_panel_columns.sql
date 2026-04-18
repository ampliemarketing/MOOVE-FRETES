-- Migration: Admin Panel Missing Columns
-- Adds columns needed by the admin panel that don't exist in the current schema

-- 1. profiles.status — controle de bloqueio/suspensão de usuários
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'blocked', 'suspended'));

-- Inicializar status baseado nos campos existentes
UPDATE public.profiles
SET status = CASE
  WHEN is_active = false THEN 'blocked'
  WHEN verification_status = 'pending' THEN 'pending'
  ELSE 'active'
END
WHERE status = 'active';

-- 2. companies.status — aprovação/bloqueio de empresas
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'blocked'));

-- 3. ratings.reported — flag de denúncia
ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS reported boolean NOT NULL DEFAULT false;

-- 4. ratings.report_reason — motivo da denúncia
ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS report_reason text;

-- 5. ratings.status — visibilidade da avaliação
ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'visible'
    CHECK (status IN ('visible', 'hidden', 'pending_review'));

-- 6. messages.reported — flag de denúncia de mensagem
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reported boolean NOT NULL DEFAULT false;

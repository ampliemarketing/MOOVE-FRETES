-- Migration: Add 'agenciador' to companies.company_type allowed values
-- The CHECK constraint previously only allowed: transportadora, embarcador, ambos
-- The registration form sends 'agenciador' as company_type for agenciador users

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_company_type_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_company_type_check
    CHECK (company_type = ANY (ARRAY[
      'transportadora'::text,
      'embarcador'::text,
      'ambos'::text,
      'agenciador'::text
    ]));

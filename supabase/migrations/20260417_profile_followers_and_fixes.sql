-- Migration: Profile Followers System + Schema Fixes
-- Addresses gaps found in profile screen investigation

-- ============================================================
-- 1. SISTEMA DE SEGUIDORES
-- ============================================================

-- Tabela de seguir usuários
CREATE TABLE IF NOT EXISTS public.user_follows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_follows_pkey PRIMARY KEY (id),
  CONSTRAINT user_follows_unique UNIQUE (follower_id, following_id),
  CONSTRAINT user_follows_follower_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_follows_following_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_follows_no_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON public.user_follows(following_id);

-- Colunas de contagem em profiles (cache desnormalizado para performance)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS followers_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS following_count integer NOT NULL DEFAULT 0;

-- Inicializar contagens baseado em dados existentes (se houver)
UPDATE public.profiles p
SET followers_count = (
  SELECT COUNT(*) FROM public.user_follows WHERE following_id = p.id
);

UPDATE public.profiles p
SET following_count = (
  SELECT COUNT(*) FROM public.user_follows WHERE follower_id = p.id
);

-- Trigger para manter contagens sincronizadas automaticamente
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
    UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_follow_counts ON public.user_follows;
CREATE TRIGGER trg_update_follow_counts
  AFTER INSERT OR DELETE ON public.user_follows
  FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

-- RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_follows_select" ON public.user_follows;
CREATE POLICY "user_follows_select" ON public.user_follows
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_follows_insert" ON public.user_follows;
CREATE POLICY "user_follows_insert" ON public.user_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "user_follows_delete" ON public.user_follows;
CREATE POLICY "user_follows_delete" ON public.user_follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ============================================================
-- 2. PONTUALIDADE EM DRIVERS (cache calculado via ratings)
-- ============================================================

-- Coluna para cache da pontualidade média (0-100)
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS punctuality numeric NOT NULL DEFAULT 0
    CHECK (punctuality >= 0 AND punctuality <= 100);

-- Inicializar pontualidade baseada nas avaliações existentes
UPDATE public.drivers d
SET punctuality = COALESCE((
  SELECT ROUND(AVG(r.punctuality_rating) * 20, 1)
  FROM public.ratings r
  WHERE r.target_id = d.user_id::text
    AND r.punctuality_rating IS NOT NULL
), 0);

-- Trigger para atualizar pontualidade quando uma avaliação é criada/editada
CREATE OR REPLACE FUNCTION public.update_driver_punctuality()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.drivers
  SET punctuality = COALESCE((
    SELECT ROUND(AVG(punctuality_rating) * 20, 1)
    FROM public.ratings
    WHERE target_id = NEW.target_id
      AND punctuality_rating IS NOT NULL
  ), 0)
  WHERE user_id::text = NEW.target_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_driver_punctuality ON public.ratings;
CREATE TRIGGER trg_update_driver_punctuality
  AFTER INSERT OR UPDATE OF punctuality_rating ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_driver_punctuality();

-- ============================================================
-- 3. ÍNDICES DE PERFORMANCE PARA CONSULTAS DO PERFIL
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON public.drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_target_id ON public.ratings(target_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

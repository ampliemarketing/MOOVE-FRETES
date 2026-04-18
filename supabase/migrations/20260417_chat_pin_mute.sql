-- Migration: Chat Pin and Mute support
-- Adds is_pinned and is_muted columns to conversations table

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_muted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_conversations_is_pinned ON public.conversations(is_pinned) WHERE is_pinned = true;

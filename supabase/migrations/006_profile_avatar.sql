-- ============================================================================
-- Power-Track — Migration 006: Add avatar_url to profiles
-- Safe to run more than once. Run in the Supabase SQL Editor.
-- ============================================================================

alter table public.profiles
  add column if not exists avatar_url text;


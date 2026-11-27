-- ============================================================================
-- Power-Track — Migration 004: Add latitude & longitude to complaints
-- Safe to run more than once. Run in the Supabase SQL Editor.
-- ============================================================================

alter table public.complaints
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;


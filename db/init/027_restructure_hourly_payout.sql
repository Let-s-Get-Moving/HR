-- SAFE MIGRATION: Create hourly_payout table if not exists
-- This migration is superseded by 038 but kept for compatibility
-- This migration will NOT drop existing data on redeployment
-- Fixed: 2025-10-03 to prevent data loss during Render deployments

-- Note: Migration 038 is the authoritative schema for hourly_payout
-- This file now does nothing to avoid conflicts (038 runs later alphabetically)

-- The table is created by 038_rebuild_hourly_payout_table.sql
-- Keeping this file for migration history but making it safe
DO $$
BEGIN
    -- This migration is now a no-op to prevent conflicts with 038
    -- Table will be created by 038 if it doesn't exist
    NULL;
END $$;

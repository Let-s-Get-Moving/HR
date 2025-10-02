-- Fix hourly_payout table to match the importer expectations
-- The importer stores multiple date periods as JSON, but the table was designed for single period

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hourly_payout') THEN
        
        -- Add date_periods column if it doesn't exist (JSON array of periods)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hourly_payout' AND column_name = 'date_periods') THEN
            ALTER TABLE hourly_payout ADD COLUMN date_periods JSONB;
            RAISE NOTICE 'Added date_periods column to hourly_payout';
        END IF;
        
        -- Add name_raw column if it doesn't exist (for non-matched employees)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hourly_payout' AND column_name = 'name_raw') THEN
            ALTER TABLE hourly_payout ADD COLUMN name_raw TEXT;
            RAISE NOTICE 'Added name_raw column to hourly_payout';
        END IF;
        
        -- Make period_label nullable (since we're using date_periods JSON instead)
        ALTER TABLE hourly_payout ALTER COLUMN period_label DROP NOT NULL;
        
        -- Make amount nullable (since we're using date_periods JSON with amounts inside)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hourly_payout' AND column_name = 'amount') THEN
            ALTER TABLE hourly_payout ALTER COLUMN amount DROP NOT NULL;
        END IF;
        
        -- Drop old unique constraint (employee_id, period_month, period_label)
        ALTER TABLE hourly_payout DROP CONSTRAINT IF EXISTS uq_hourly_payout_period;
        DROP INDEX IF EXISTS uq_hourly_payout_period;
        
        -- Create new unique constraint based on name_raw + period_month
        -- This matches what the importer expects (one row per employee per month)
        CREATE UNIQUE INDEX IF NOT EXISTS uq_hourly_payout_name_period 
            ON hourly_payout (LOWER(TRIM(COALESCE(name_raw, ''))), period_month)
            WHERE name_raw IS NOT NULL;
        
        RAISE NOTICE 'Fixed hourly_payout schema to match importer expectations';
    END IF;
END $$;

-- Comment for documentation
COMMENT ON COLUMN hourly_payout.date_periods IS 'JSON array of date periods with amounts: [{"label": "June 2-15", "amount": 1600, "cash_paid": true}, ...]';
COMMENT ON COLUMN hourly_payout.name_raw IS 'Employee name from spreadsheet - may not match any employee record';


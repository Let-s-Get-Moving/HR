-- Sales Performance Staging Table
-- Created for ingesting sales-person-performance.xlsx files
-- Data will later be used for commission calculations via commission_structures
--
-- Excel schema (16 columns):
--   Name, # Leads Received, Bad, % Bad, Sent, % Sent, Pending, % Pending,
--   Booked, % Booked, Lost, % Lost, Cancelled, % Cancelled, Booked Total, Average Booking
--
-- Requires timerange (period_start + period_end) from upload UI since Excel has no date info.

CREATE TABLE IF NOT EXISTS sales_performance_staging (
    id SERIAL PRIMARY KEY,
    
    -- Period info (required from upload)
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Employee identification
    name_raw TEXT NOT NULL,           -- Original name from Excel (e.g., " Alejandro", "Colin C")
    name_key TEXT NOT NULL,           -- Normalized for matching (lowercase, trimmed, no special chars)
    
    -- Count columns (INTEGER)
    leads_received INTEGER,
    bad_count INTEGER,
    sent_count INTEGER,
    pending_count INTEGER,
    booked_count INTEGER,
    lost_count INTEGER,
    cancelled_count INTEGER,
    
    -- Percentage columns (NUMERIC, stored as whole numbers e.g., 95.14 not 0.9514)
    bad_pct NUMERIC(6,2),
    sent_pct NUMERIC(6,2),
    pending_pct NUMERIC(6,2),
    booked_pct NUMERIC(6,2),
    lost_pct NUMERIC(6,2),
    cancelled_pct NUMERIC(6,2),
    
    -- Money columns (NUMERIC)
    booked_total NUMERIC(14,2),
    avg_booking NUMERIC(14,2),
    
    -- Import metadata
    source_file TEXT,
    sheet_name TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for upsert: same person + same period = update
    CONSTRAINT uq_sales_performance_period_name UNIQUE (period_start, period_end, name_key)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sales_performance_period 
    ON sales_performance_staging(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_sales_performance_name_key 
    ON sales_performance_staging(name_key);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_sales_performance_staging_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_performance_staging_updated_at ON sales_performance_staging;
CREATE TRIGGER trg_sales_performance_staging_updated_at
    BEFORE UPDATE ON sales_performance_staging
    FOR EACH ROW EXECUTE FUNCTION update_sales_performance_staging_updated_at();

-- Comments
COMMENT ON TABLE sales_performance_staging IS 'Staging table for sales-person-performance.xlsx imports. Data used for commission calculations.';
COMMENT ON COLUMN sales_performance_staging.period_start IS 'Start date of the performance period (YYYY-MM-DD)';
COMMENT ON COLUMN sales_performance_staging.period_end IS 'End date of the performance period (YYYY-MM-DD)';
COMMENT ON COLUMN sales_performance_staging.name_raw IS 'Original employee name from Excel file';
COMMENT ON COLUMN sales_performance_staging.name_key IS 'Normalized name for matching (lowercase, trimmed)';

-- Sales Lead Status Adjustments Tables
-- Stores quote-level data from Lead Status and Booked Opportunities reports
-- Used to compute revenue/booking adjustments (add-ons, deductions, bonuses)

-- ============================================================================
-- Sales Lead Status Quotes (from Lead Status Report)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_lead_status_quotes (
    -- Primary key: Quote ID extracted from "Quote #" column
    quote_id INTEGER PRIMARY KEY,
    
    -- Raw import fields
    branch_name TEXT,
    status_raw TEXT,                      -- Original status from Excel
    lead_status_raw TEXT,                 -- Original lead status directive
    service_type TEXT,
    received_at TIMESTAMP WITH TIME ZONE,
    service_date_lead_report DATE,        -- Service Date if present in this report
    sales_person_raw TEXT,                -- Original sales person name
    estimated_revenue NUMERIC(14,2),      -- Estimated Revenue from this report
    
    -- Normalized fields
    status_norm TEXT,                     -- Trimmed, case-normalized status
    sales_person_key TEXT,                -- Normalized for employee matching
    
    -- Parsed directive fields (derived from lead_status_raw)
    directive_type TEXT,                  -- 'percent_split' | 'fixed_rev_transfer' | 'fixed_booking_transfer' | 'none'
    target_name_raw TEXT,                 -- Target person name from directive (e.g., 'Sam', 'Colin')
    target_name_key TEXT,                 -- Normalized target name for matching
    pct NUMERIC(6,2),                     -- Percentage for percent_split (e.g., 40, 50)
    amount NUMERIC(14,2),                 -- Dollar amount for fixed transfers
    
    -- Import metadata
    source_file TEXT,
    sheet_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: directive_type must be valid
    CONSTRAINT chk_lead_status_directive_type CHECK (
        directive_type IS NULL OR 
        directive_type IN ('percent_split', 'fixed_rev_transfer', 'fixed_booking_transfer', 'none')
    )
);

-- ============================================================================
-- Sales Booked Opportunities Quotes (from Booked Opportunities by Service Date Report)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_booked_opportunities_quotes (
    -- Primary key: Quote ID extracted from "Quote #" column
    quote_id INTEGER PRIMARY KEY,
    
    -- Raw import fields
    status_raw TEXT,                      -- Original status from Excel
    customer_name TEXT,
    branch_name TEXT,
    service_type TEXT,
    
    -- Normalized fields
    status_norm TEXT,                     -- Trimmed, case-normalized status
    
    -- Key date fields
    service_date DATE NOT NULL,           -- Service Date (used for period filtering)
    booked_date DATE,                     -- Booked Date
    
    -- Financial fields
    estimated_amount NUMERIC(14,2),
    invoiced_amount NUMERIC(14,2),        -- Actual charges - authoritative value for calculations
    
    -- Sales person (for auditing, not used as original agent source)
    sales_person_raw TEXT,
    
    -- Import metadata
    source_file TEXT,
    sheet_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Lead Status Quotes indexes
CREATE INDEX IF NOT EXISTS idx_sales_lead_status_quotes_status_norm 
ON sales_lead_status_quotes(status_norm);

CREATE INDEX IF NOT EXISTS idx_sales_lead_status_quotes_sales_person_key 
ON sales_lead_status_quotes(sales_person_key);

CREATE INDEX IF NOT EXISTS idx_sales_lead_status_quotes_target_name_key 
ON sales_lead_status_quotes(target_name_key);

-- Partial index for completed/closed quotes only
CREATE INDEX IF NOT EXISTS idx_sales_lead_status_quotes_completed_closed 
ON sales_lead_status_quotes(quote_id) 
WHERE status_norm IN ('completed', 'closed');

-- Booked Opportunities indexes
CREATE INDEX IF NOT EXISTS idx_sales_booked_opportunities_service_date 
ON sales_booked_opportunities_quotes(service_date);

CREATE INDEX IF NOT EXISTS idx_sales_booked_opportunities_status_norm 
ON sales_booked_opportunities_quotes(status_norm);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_sales_lead_status_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_lead_status_quotes_updated_at ON sales_lead_status_quotes;
CREATE TRIGGER trg_sales_lead_status_quotes_updated_at
    BEFORE UPDATE ON sales_lead_status_quotes
    FOR EACH ROW EXECUTE FUNCTION update_sales_lead_status_quotes_updated_at();

CREATE OR REPLACE FUNCTION update_sales_booked_opportunities_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_booked_opportunities_quotes_updated_at ON sales_booked_opportunities_quotes;
CREATE TRIGGER trg_sales_booked_opportunities_quotes_updated_at
    BEFORE UPDATE ON sales_booked_opportunities_quotes
    FOR EACH ROW EXECUTE FUNCTION update_sales_booked_opportunities_quotes_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE sales_lead_status_quotes IS 'Quote-level data from Lead Status Report. Contains parsed directives for revenue/booking adjustments.';
COMMENT ON TABLE sales_booked_opportunities_quotes IS 'Quote-level data from Booked Opportunities by Service Date Report. Contains Invoiced Amount for adjustment calculations.';

COMMENT ON COLUMN sales_lead_status_quotes.directive_type IS 'Type of adjustment: percent_split (revenue %), fixed_rev_transfer ($ revenue), fixed_booking_transfer ($ booking bonus), or none';
COMMENT ON COLUMN sales_lead_status_quotes.target_name_key IS 'Normalized name of person receiving the add-on/bonus (matched to employee nickname)';
COMMENT ON COLUMN sales_lead_status_quotes.sales_person_key IS 'Normalized name of original sales agent (matched to employee nickname)';
COMMENT ON COLUMN sales_booked_opportunities_quotes.invoiced_amount IS 'Actual charges - the authoritative value used for percentage-based adjustment calculations';
COMMENT ON COLUMN sales_booked_opportunities_quotes.service_date IS 'Service Date - used to determine which period the quote belongs to for adjustment calculations';

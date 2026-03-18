-- Commission Drafts Migration
-- Creates the new draft-based commission workflow tables

-- SmartMoving API subtotal cache (to avoid repeated API calls)
CREATE TABLE IF NOT EXISTS smartmoving_quote_cache (
    quote_number INTEGER PRIMARY KEY,
    subtotal_cad NUMERIC(12,2),
    branch TEXT,
    currency_code TEXT DEFAULT 'CAD',
    fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smartmoving_cache_fetched 
    ON smartmoving_quote_cache(fetched_at);

COMMENT ON TABLE smartmoving_quote_cache IS 'Caches subtotal amounts from SmartMoving API to avoid repeated calls';

-- Sales Commission Summary staging table (new report type)
CREATE TABLE IF NOT EXISTS sales_commission_summary_staging (
    id SERIAL PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    sales_person_raw TEXT NOT NULL,
    sales_person_key TEXT NOT NULL,
    total_estimated NUMERIC(12,2) DEFAULT 0,
    invoiced_before_tax NUMERIC(12,2) DEFAULT 0,
    total_invoiced NUMERIC(12,2) DEFAULT 0,
    commission_base NUMERIC(12,2) DEFAULT 0,
    calculated_commissions NUMERIC(12,2) DEFAULT 0,
    lump_sums NUMERIC(12,2) DEFAULT 0,
    deductions NUMERIC(12,2) DEFAULT 0,
    net_commissions NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(period_start, period_end, sales_person_key)
);

CREATE INDEX IF NOT EXISTS idx_sales_commission_summary_period 
    ON sales_commission_summary_staging(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_sales_commission_summary_key 
    ON sales_commission_summary_staging(sales_person_key);

COMMENT ON TABLE sales_commission_summary_staging IS 'Staging table for Sales Commission Summary report imports';

-- Commission drafts table (one per period)
-- calculation_status tracks async SmartMoving API enrichment progress
CREATE TABLE IF NOT EXISTS commission_drafts (
    id SERIAL PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Workflow status: draft = editable, finalized = locked
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),

    -- Async enrichment progress (SmartMoving API calls happen after draft skeleton is created)
    calculation_status TEXT NOT NULL DEFAULT 'calculating'
        CHECK (calculation_status IN ('calculating', 'ready', 'error')),
    quotes_total INTEGER NOT NULL DEFAULT 0,
    quotes_processed INTEGER NOT NULL DEFAULT 0,
    calculation_error TEXT,

    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    finalized_at TIMESTAMP,
    finalized_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,

    UNIQUE(period_start, period_end, status) 
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_commission_drafts_period 
    ON commission_drafts(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_commission_drafts_status 
    ON commission_drafts(status);

CREATE INDEX IF NOT EXISTS idx_commission_drafts_calc_status
    ON commission_drafts(calculation_status);

COMMENT ON TABLE commission_drafts IS 'Commission draft records with draft/finalized workflow';
COMMENT ON COLUMN commission_drafts.status IS 'draft = editable, finalized = locked';
COMMENT ON COLUMN commission_drafts.calculation_status IS 'calculating = SmartMoving API calls in progress; ready = all data fetched; error = enrichment failed';
COMMENT ON COLUMN commission_drafts.quotes_total IS 'Total quotes needing SmartMoving API fetch';
COMMENT ON COLUMN commission_drafts.quotes_processed IS 'Quotes fetched so far (for progress display)';

-- Commission line items (one row per agent/manager per draft)
-- SmartMoving-dependent fields (revenue_add_ons, revenue_deductions, total_revenue,
-- commission_pct, commission_earned, total_due) are NULL while calculation_status = 'calculating'.
-- Frontend shows "Gathering data..." for NULL values.
CREATE TABLE IF NOT EXISTS commission_line_items (
    id SERIAL PRIMARY KEY,
    draft_id INTEGER NOT NULL REFERENCES commission_drafts(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    employee_name_raw TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('agent', 'manager', 'international_closer')),
    
    -- Immediately available (from reports / employees table)
    hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
    invoiced NUMERIC(12,2) NOT NULL DEFAULT 0,
    booking_pct NUMERIC(5,2) NOT NULL DEFAULT 0,

    -- SmartMoving-dependent fields (NULL until enrichment completes)
    revenue_add_ons NUMERIC(12,2),
    revenue_deductions NUMERIC(12,2),
    total_revenue NUMERIC(12,2),
    commission_pct NUMERIC(5,2),
    commission_earned NUMERIC(12,2),
    
    -- Manual fields (editable by admins/managers, always default 0)
    spiff_bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
    revenue_bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
    booking_bonus_5_10_plus NUMERIC(12,2) NOT NULL DEFAULT 0,
    booking_bonus_5_10_minus NUMERIC(12,2) NOT NULL DEFAULT 0,
    hourly_paid_out NUMERIC(12,2) NOT NULL DEFAULT 0,
    deduction_sales_manager NUMERIC(12,2) NOT NULL DEFAULT 0,
    deduction_missing_punch NUMERIC(12,2) NOT NULL DEFAULT 0,
    deduction_customer_support NUMERIC(12,2) NOT NULL DEFAULT 0,
    deduction_post_commission NUMERIC(12,2) NOT NULL DEFAULT 0,
    deduction_dispatch NUMERIC(12,2) NOT NULL DEFAULT 0,
    deduction_other NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Computed total: NULL while commission_earned is NULL, calculated by trigger otherwise
    total_due NUMERIC(12,2),
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(draft_id, employee_id, role)
);

CREATE INDEX IF NOT EXISTS idx_commission_line_items_draft 
    ON commission_line_items(draft_id);

CREATE INDEX IF NOT EXISTS idx_commission_line_items_employee 
    ON commission_line_items(employee_id);

CREATE INDEX IF NOT EXISTS idx_commission_line_items_role 
    ON commission_line_items(role);

COMMENT ON TABLE commission_line_items IS 'Individual commission line items for each agent/manager per draft';
COMMENT ON COLUMN commission_line_items.revenue_add_ons IS 'NULL = enrichment pending; populated once SmartMoving API calls complete';
COMMENT ON COLUMN commission_line_items.total_due IS 'NULL while commission_earned is NULL; auto-computed by trigger once enrichment is done';

-- Trigger: auto-update total_due on insert/update.
-- If commission_earned is NULL (enrichment not done), total_due stays NULL.
-- Once commission_earned is set, total_due = commission_earned + bonuses - deductions.
CREATE OR REPLACE FUNCTION compute_commission_total_due()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.commission_earned IS NULL THEN
        NEW.total_due := NULL;
    ELSE
        NEW.total_due := 
            NEW.commission_earned 
            + COALESCE(NEW.spiff_bonus, 0)
            + COALESCE(NEW.revenue_bonus, 0)
            + COALESCE(NEW.booking_bonus_5_10_plus, 0)
            - COALESCE(NEW.booking_bonus_5_10_minus, 0)
            - COALESCE(NEW.hourly_paid_out, 0)
            - COALESCE(NEW.deduction_sales_manager, 0)
            - COALESCE(NEW.deduction_missing_punch, 0)
            - COALESCE(NEW.deduction_customer_support, 0)
            - COALESCE(NEW.deduction_post_commission, 0)
            - COALESCE(NEW.deduction_dispatch, 0)
            - COALESCE(NEW.deduction_other, 0);
    END IF;
    
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_commission_total_due
    BEFORE INSERT OR UPDATE ON commission_line_items
    FOR EACH ROW
    EXECUTE FUNCTION compute_commission_total_due();

COMMENT ON FUNCTION compute_commission_total_due() IS 'Auto-calculates total_due. Returns NULL if commission_earned is NULL (enrichment not yet done).';

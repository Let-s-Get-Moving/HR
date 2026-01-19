-- Sales Commission Results Tables
-- Stores calculated commission results for agents and managers

-- ============================================================================
-- Sales Agent Commissions (personal commission per agent per period)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_agent_commissions (
    id SERIAL PRIMARY KEY,
    
    -- Period identification
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Employee (matched agent)
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    staging_row_id INTEGER REFERENCES sales_performance_staging(id) ON DELETE SET NULL,
    
    -- Input values from staging
    booking_pct NUMERIC(6,2),           -- Agent's booking conversion %
    revenue NUMERIC(14,2),               -- Agent's booked total revenue
    
    -- Calculated commission
    commission_pct NUMERIC(6,3),         -- Rate applied (3.5-6.0%)
    commission_amount NUMERIC(14,2),     -- revenue * commission_pct / 100
    
    -- Vacation package award (for 55%+ booking and 250k+ revenue)
    vacation_award_value NUMERIC(10,2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique: one commission record per agent per period
    CONSTRAINT uq_sales_agent_commission_period UNIQUE (period_start, period_end, employee_id)
);

-- ============================================================================
-- Sales Manager Commissions (bucket-sum or fixed override per manager per period)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_manager_commissions (
    id SERIAL PRIMARY KEY,
    
    -- Period identification
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Employee (manager)
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Fixed percentage override (e.g., 0.700 for Sam Lopka)
    commission_pct_override NUMERIC(6,3),
    
    -- Pool values
    pooled_revenue NUMERIC(14,2),        -- Total revenue from all matched agents
    
    -- Calculated commission
    commission_amount NUMERIC(14,2),
    
    -- Calculation method: 'bucket_sum' or 'fixed_override'
    calculation_method TEXT NOT NULL DEFAULT 'bucket_sum',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique: one commission record per manager per period
    CONSTRAINT uq_sales_manager_commission_period UNIQUE (period_start, period_end, employee_id),
    
    -- Constraint: calculation_method must be valid
    CONSTRAINT chk_calculation_method CHECK (calculation_method IN ('bucket_sum', 'fixed_override'))
);

-- ============================================================================
-- Sales Manager Commission Breakdown (bucket details for bucket-sum method)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_manager_commission_breakdown (
    id SERIAL PRIMARY KEY,
    
    -- Parent manager commission record
    manager_commission_id INTEGER NOT NULL REFERENCES sales_manager_commissions(id) ON DELETE CASCADE,
    
    -- Bucket definition
    bucket_label TEXT NOT NULL,          -- e.g., '0-19%', '20-24%', etc.
    bucket_min_pct NUMERIC(5,2),         -- e.g., 0
    bucket_max_pct NUMERIC(5,2),         -- e.g., 19
    bucket_rate_pct NUMERIC(6,3),        -- Manager rate for this bucket (e.g., 0.25)
    
    -- Bucket aggregates
    agent_count INTEGER DEFAULT 0,       -- Number of agents in this bucket
    bucket_revenue NUMERIC(14,2),        -- Sum of agent revenue in this bucket
    bucket_commission NUMERIC(14,2),     -- bucket_revenue * bucket_rate_pct / 100
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Sales Commission Calculation Audit (track each calculation run)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_commission_calc_audit (
    id SERIAL PRIMARY KEY,
    
    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Matching stats
    total_staging_rows INTEGER,
    matched_agents INTEGER,
    matched_managers INTEGER,
    
    -- Unmatched names (stored as JSON array)
    unmatched_names JSONB,
    
    -- Totals
    total_agent_commission NUMERIC(14,2),
    total_manager_commission NUMERIC(14,2),
    total_vacation_awards NUMERIC(14,2),
    
    -- Run metadata
    calculated_by INTEGER REFERENCES employees(id),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    dry_run BOOLEAN DEFAULT false
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sales_agent_commissions_period 
ON sales_agent_commissions(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_sales_agent_commissions_employee 
ON sales_agent_commissions(employee_id);

CREATE INDEX IF NOT EXISTS idx_sales_manager_commissions_period 
ON sales_manager_commissions(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_sales_manager_commissions_employee 
ON sales_manager_commissions(employee_id);

CREATE INDEX IF NOT EXISTS idx_sales_manager_breakdown_parent 
ON sales_manager_commission_breakdown(manager_commission_id);

CREATE INDEX IF NOT EXISTS idx_sales_commission_audit_period 
ON sales_commission_calc_audit(period_start, period_end);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_sales_commission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_agent_commissions_updated_at ON sales_agent_commissions;
CREATE TRIGGER trg_sales_agent_commissions_updated_at
    BEFORE UPDATE ON sales_agent_commissions
    FOR EACH ROW EXECUTE FUNCTION update_sales_commission_updated_at();

DROP TRIGGER IF EXISTS trg_sales_manager_commissions_updated_at ON sales_manager_commissions;
CREATE TRIGGER trg_sales_manager_commissions_updated_at
    BEFORE UPDATE ON sales_manager_commissions
    FOR EACH ROW EXECUTE FUNCTION update_sales_commission_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE sales_agent_commissions IS 'Calculated commission results for sales agents per period';
COMMENT ON TABLE sales_manager_commissions IS 'Calculated commission results for sales managers per period';
COMMENT ON TABLE sales_manager_commission_breakdown IS 'Bucket-by-bucket breakdown of manager commission calculation';
COMMENT ON TABLE sales_commission_calc_audit IS 'Audit log of commission calculation runs';

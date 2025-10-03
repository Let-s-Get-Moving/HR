-- Performance Indexes for Render Postgres
-- These indexes target common query patterns in dashboards and reports

-- Enable trigram extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- PAYROLL INDEXES
-- =============================================================================

-- Date range filters (most dashboards are time-bound)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_period_start
ON payroll (period_start) WHERE period_start IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_period_end
ON payroll (period_end) WHERE period_end IS NOT NULL;

-- Employee lookups in payroll
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_employee_id
ON payroll (employee_id) WHERE employee_id IS NOT NULL;

-- Composite for common filter: employee + date range
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_emp_period
ON payroll (employee_id, period_start) 
WHERE employee_id IS NOT NULL AND period_start IS NOT NULL;

-- =============================================================================
-- TIMECARD INDEXES
-- =============================================================================

-- Date range filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timecards_period_start
ON timecards (period_start) WHERE period_start IS NOT NULL;

-- Upload tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timecards_upload_id
ON timecards (upload_id) WHERE upload_id IS NOT NULL;

-- Employee timecards
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timecards_employee_id
ON timecards (employee_id) WHERE employee_id IS NOT NULL;

-- Normalized group filter (if group_name exists)
-- Uncomment after adding generated column:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timecards_group_norm
-- ON timecards (group_norm) WHERE group_norm IS NOT NULL;

-- Or use functional index (slower but no generated column needed):
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timecards_group_norm_func
-- ON timecards (app_norm(group_name)) WHERE group_name IS NOT NULL;

-- Composite for common dashboard filter: group + date
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timecards_group_norm_period
-- ON timecards (group_norm, period_start) 
-- WHERE group_norm IS NOT NULL AND period_start IS NOT NULL;

-- =============================================================================
-- COMMISSION INDEXES
-- =============================================================================

-- Period lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissions_period_id
ON commissions (period_id) WHERE period_id IS NOT NULL;

-- Employee commissions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissions_employee_id
ON commissions (employee_id) WHERE employee_id IS NOT NULL;

-- Upload tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissions_upload_id
ON commissions (upload_id) WHERE upload_id IS NOT NULL;

-- Normalized group filter
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissions_group_norm
-- ON commissions (group_norm) WHERE group_norm IS NOT NULL;

-- =============================================================================
-- EMPLOYEE INDEXES
-- =============================================================================

-- Email lookups (authentication, uniqueness)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_email_unique
ON employees (LOWER(email)) WHERE email IS NOT NULL;

-- Status filters (active vs terminated)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_status
ON employees (status) WHERE status IS NOT NULL;

-- Trigram index for fuzzy name search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_first_name_trgm
ON employees USING gin (first_name gin_trgm_ops) WHERE first_name IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_last_name_trgm
ON employees USING gin (last_name gin_trgm_ops) WHERE last_name IS NOT NULL;

-- Full name search (if full_name column exists)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_full_name_trgm
-- ON employees USING gin (full_name gin_trgm_ops) WHERE full_name IS NOT NULL;

-- =============================================================================
-- TIME ENTRIES INDEXES
-- =============================================================================

-- Date range for time entry reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_date
ON time_entries (date) WHERE date IS NOT NULL;

-- Employee time entries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_employee_id
ON time_entries (employee_id) WHERE employee_id IS NOT NULL;

-- Composite for common query: employee + date range
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_emp_date
ON time_entries (employee_id, date) 
WHERE employee_id IS NOT NULL AND date IS NOT NULL;

-- =============================================================================
-- UPLOADS TRACKING (if tables have created_at/updated_at)
-- =============================================================================

-- Recent uploads/modifications (ORDER BY created_at DESC LIMIT N)
-- Uncomment if these columns exist and are queried frequently:

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timecards_created_at
-- ON timecards (created_at DESC) WHERE created_at IS NOT NULL;

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissions_created_at
-- ON commissions (created_at DESC) WHERE created_at IS NOT NULL;

-- =============================================================================
-- PROBE TABLE (for debug endpoints)
-- =============================================================================

CREATE TABLE IF NOT EXISTS probe_table (
  upload_id text NOT NULL,
  row_index int NOT NULL,
  value text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_probe_table_upload_id
ON probe_table (upload_id);

-- =============================================================================
-- NOTES
-- =============================================================================

-- 1. All indexes use CONCURRENTLY to avoid locking tables during creation
-- 2. Partial indexes (WHERE clauses) reduce index size and improve performance
-- 3. Composite indexes should match your WHERE clause order
-- 4. Trigram indexes enable fast ILIKE '%search%' queries
-- 5. Monitor index usage with: 
--    SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
-- 6. Check index sizes with:
--    SELECT indexrelname, pg_size_pretty(pg_relation_size(indexrelid))
--    FROM pg_stat_user_indexes ORDER BY pg_relation_size(indexrelid) DESC;


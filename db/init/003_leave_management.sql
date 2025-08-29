-- Leave Management System
-- Supports vacation, sick leave, personal leave, and ESA compliance

-- Leave types
CREATE TABLE IF NOT EXISTS leave_types (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  default_annual_entitlement INTEGER DEFAULT 0, -- in days
  is_paid BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#3B82F6'
);

-- Leave policies
CREATE TABLE IF NOT EXISTS leave_policies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee leave balances
CREATE TABLE IF NOT EXISTS leave_balances (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id INT REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  entitled_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  used_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  carried_over_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  UNIQUE(employee_id, leave_type_id, year)
);

-- Leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id INT REFERENCES leave_types(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(5,2) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  requested_by INT REFERENCES employees(id),
  approved_by INT REFERENCES employees(id),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  notes TEXT,
  CHECK (end_date >= start_date)
);

-- Leave calendar (holidays and company closures)
CREATE TABLE IF NOT EXISTS leave_calendar (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  description TEXT NOT NULL,
  is_holiday BOOLEAN DEFAULT true,
  is_company_closure BOOLEAN DEFAULT false
);

-- ESA compliance tracking
CREATE TABLE IF NOT EXISTS esa_compliance (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours_worked NUMERIC(5,2) NOT NULL,
  breaks_taken BOOLEAN DEFAULT false,
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  rest_period_compliant BOOLEAN DEFAULT true,
  notes TEXT,
  UNIQUE(employee_id, date)
);

-- Insert default leave types
INSERT INTO leave_types (name, description, default_annual_entitlement, is_paid, requires_approval, color) VALUES
('Vacation', 'Annual vacation leave', 20, true, true, '#10B981'),
('Sick Leave', 'Sick leave and medical appointments', 10, true, false, '#EF4444'),
('Personal Leave', 'Personal time off', 5, false, true, '#8B5CF6'),
('Bereavement', 'Bereavement leave', 3, true, false, '#6B7280'),
('Parental Leave', 'Parental leave (maternity/paternity)', 0, true, true, '#F59E0B'),
('Jury Duty', 'Jury duty leave', 0, true, false, '#6366F1'),
('Military Leave', 'Military service leave', 0, true, false, '#DC2626')
ON CONFLICT (name) DO NOTHING;

-- Insert sample holidays for 2025
INSERT INTO leave_calendar (date, description, is_holiday, is_company_closure) VALUES
('2025-01-01', 'New Year''s Day', true, true),
('2025-02-17', 'Family Day', true, true),
('2025-04-18', 'Good Friday', true, true),
('2025-05-19', 'Victoria Day', true, true),
('2025-07-01', 'Canada Day', true, true),
('2025-09-01', 'Labour Day', true, true),
('2025-10-13', 'Thanksgiving Day', true, true),
('2025-12-25', 'Christmas Day', true, true),
('2025-12-26', 'Boxing Day', true, true)
ON CONFLICT (date) DO NOTHING;

-- Create views for leave analytics
CREATE OR REPLACE VIEW v_leave_analytics AS
SELECT 
  e.id as employee_id,
  e.first_name,
  e.last_name,
  d.name as department,
  lt.name as leave_type,
  lb.year,
  lb.entitled_days,
  lb.used_days,
  lb.carried_over_days,
  (lb.entitled_days + lb.carried_over_days - lb.used_days) as remaining_days,
  ROUND((lb.used_days / NULLIF(lb.entitled_days, 0)) * 100, 2) as usage_percentage
FROM employees e
JOIN leave_balances lb ON e.id = lb.employee_id
JOIN leave_types lt ON lb.leave_type_id = lt.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE e.status = 'Active';

-- Create view for leave requests summary
CREATE OR REPLACE VIEW v_leave_requests_summary AS
SELECT 
  lr.id,
  e.first_name,
  e.last_name,
  d.name as department,
  lt.name as leave_type,
  lr.start_date,
  lr.end_date,
  lr.total_days,
  lr.status,
  lr.requested_at,
  lr.approved_at
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
LEFT JOIN departments d ON e.department_id = d.id
ORDER BY lr.requested_at DESC;

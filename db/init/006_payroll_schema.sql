-- Payroll and Commission Schema
-- Comprehensive payroll management with bonus/commission structures

-- Payroll periods
CREATE TABLE IF NOT EXISTS payroll_periods (
  id SERIAL PRIMARY KEY,
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pay_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Processing', 'Closed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commission structures by department
CREATE TABLE IF NOT EXISTS commission_structures (
  id SERIAL PRIMARY KEY,
  department_id INT REFERENCES departments(id) ON DELETE CASCADE,
  structure_name TEXT NOT NULL,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('Percentage', 'Fixed', 'Tiered', 'Performance')),
  base_percentage DECIMAL(5,2) DEFAULT 0,
  target_amount DECIMAL(10,2) DEFAULT 0,
  bonus_multiplier DECIMAL(3,2) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT TRUE,
  effective_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commission tiers for tiered structures
CREATE TABLE IF NOT EXISTS commission_tiers (
  id SERIAL PRIMARY KEY,
  commission_structure_id INT REFERENCES commission_structures(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL,
  min_amount DECIMAL(10,2) NOT NULL,
  max_amount DECIMAL(10,2),
  commission_rate DECIMAL(5,2) NOT NULL,
  bonus_amount DECIMAL(10,2) DEFAULT 0
);

-- Performance metrics for commission calculations
CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  period_id INT REFERENCES payroll_periods(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('Sales', 'Hours', 'Quality', 'Attendance', 'Customer_Satisfaction')),
  metric_value DECIMAL(10,2) NOT NULL,
  target_value DECIMAL(10,2) DEFAULT 0,
  achievement_percentage DECIMAL(5,2) GENERATED ALWAYS AS 
    (CASE WHEN target_value > 0 THEN (metric_value / target_value) * 100 ELSE 0 END) STORED,
  recorded_date DATE NOT NULL,
  notes TEXT
);

-- Payroll calculations
CREATE TABLE IF NOT EXISTS payroll_calculations (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  period_id INT REFERENCES payroll_periods(id) ON DELETE CASCADE,
  base_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  regular_rate DECIMAL(8,2) NOT NULL,
  overtime_rate DECIMAL(8,2) GENERATED ALWAYS AS (regular_rate * 1.5) STORED,
  regular_pay DECIMAL(10,2) GENERATED ALWAYS AS (base_hours * regular_rate) STORED,
  overtime_pay DECIMAL(10,2) GENERATED ALWAYS AS (overtime_hours * (regular_rate * 1.5)) STORED,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  bonus_amount DECIMAL(10,2) DEFAULT 0,
  total_gross DECIMAL(10,2) GENERATED ALWAYS AS ((base_hours * regular_rate) + (overtime_hours * (regular_rate * 1.5)) + commission_amount + bonus_amount) STORED,
  deductions DECIMAL(10,2) DEFAULT 0,
  net_pay DECIMAL(10,2) GENERATED ALWAYS AS ((base_hours * regular_rate) + (overtime_hours * (regular_rate * 1.5)) + commission_amount + bonus_amount - deductions) STORED,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'Calculated' CHECK (status IN ('Calculated', 'Approved', 'Paid'))
);

-- Timesheet import/export tracking
CREATE TABLE IF NOT EXISTS timesheet_imports (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  period_id INT REFERENCES payroll_periods(id),
  total_records INT DEFAULT 0,
  successful_imports INT DEFAULT 0,
  failed_imports INT DEFAULT 0,
  import_status TEXT DEFAULT 'Processing' CHECK (import_status IN ('Processing', 'Completed', 'Failed')),
  error_log TEXT,
  imported_by TEXT
);

-- Bonus structures by department
CREATE TABLE IF NOT EXISTS bonus_structures (
  id SERIAL PRIMARY KEY,
  department_id INT REFERENCES departments(id) ON DELETE CASCADE,
  bonus_name TEXT NOT NULL,
  bonus_type TEXT NOT NULL CHECK (bonus_type IN ('Performance', 'Attendance', 'Sales', 'Quality', 'Holiday', 'Year_End')),
  calculation_method TEXT NOT NULL CHECK (calculation_method IN ('Percentage', 'Fixed', 'Tiered', 'Formula')),
  base_amount DECIMAL(10,2) DEFAULT 0,
  percentage_rate DECIMAL(5,2) DEFAULT 0,
  eligibility_criteria TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  effective_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bonus tiers
CREATE TABLE IF NOT EXISTS bonus_tiers (
  id SERIAL PRIMARY KEY,
  bonus_structure_id INT REFERENCES bonus_structures(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL,
  min_performance DECIMAL(5,2) NOT NULL,
  max_performance DECIMAL(5,2),
  bonus_amount DECIMAL(10,2) NOT NULL,
  bonus_percentage DECIMAL(5,2) DEFAULT 0
);

-- Payroll exports
CREATE TABLE IF NOT EXISTS payroll_exports (
  id SERIAL PRIMARY KEY,
  period_id INT REFERENCES payroll_periods(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('Summary', 'Detailed', 'Bank_Transfer', 'Tax_Report')),
  file_name TEXT NOT NULL,
  export_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exported_by TEXT,
  file_size BIGINT,
  download_count INT DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_calculations_employee_period ON payroll_calculations(employee_id, period_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_employee_period ON performance_metrics(employee_id, period_id);
CREATE INDEX IF NOT EXISTS idx_commission_structures_department ON commission_structures(department_id);
CREATE INDEX IF NOT EXISTS idx_bonus_structures_department ON bonus_structures(department_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_imports_period ON timesheet_imports(period_id);

-- Insert default commission structures
INSERT INTO commission_structures (department_id, structure_name, commission_type, base_percentage, target_amount, bonus_multiplier, effective_date) VALUES
(1, 'Sales Commission', 'Percentage', 5.00, 10000.00, 1.5, CURRENT_DATE),
(2, 'Operations Bonus', 'Performance', 3.00, 5000.00, 1.2, CURRENT_DATE),
(3, 'Logistics Commission', 'Tiered', 2.50, 8000.00, 1.3, CURRENT_DATE);

-- Insert default commission tiers
INSERT INTO commission_tiers (commission_structure_id, tier_name, min_amount, max_amount, commission_rate, bonus_amount) VALUES
(1, 'Basic', 0.00, 5000.00, 3.00, 0.00),
(1, 'Standard', 5000.01, 15000.00, 5.00, 100.00),
(1, 'Premium', 15000.01, NULL, 7.00, 250.00),
(3, 'Bronze', 0.00, 3000.00, 2.00, 50.00),
(3, 'Silver', 3000.01, 8000.00, 2.50, 100.00),
(3, 'Gold', 8000.01, NULL, 3.00, 200.00);

-- Insert default bonus structures
INSERT INTO bonus_structures (department_id, bonus_name, bonus_type, calculation_method, base_amount, percentage_rate, eligibility_criteria, effective_date) VALUES
(1, 'Sales Performance Bonus', 'Performance', 'Percentage', 0.00, 2.50, 'Achieve 100% of sales target', CURRENT_DATE),
(2, 'Perfect Attendance Bonus', 'Attendance', 'Fixed', 100.00, 0.00, 'No absences in pay period', CURRENT_DATE),
(3, 'Quality Excellence Bonus', 'Quality', 'Tiered', 0.00, 0.00, 'Quality score above 95%', CURRENT_DATE),
(1, 'Holiday Bonus', 'Holiday', 'Fixed', 200.00, 0.00, 'Active employee during holidays', CURRENT_DATE);

-- Insert default bonus tiers
INSERT INTO bonus_tiers (bonus_structure_id, tier_name, min_performance, max_performance, bonus_amount, bonus_percentage) VALUES
(1, 'Target', 100.00, 120.00, 0.00, 2.50),
(1, 'Exceed', 120.01, 150.00, 0.00, 3.50),
(1, 'Outstanding', 150.01, NULL, 0.00, 5.00),
(3, 'Excellent', 95.00, 98.00, 75.00, 0.00),
(3, 'Outstanding', 98.01, 100.00, 150.00, 0.00);

-- Create view for payroll summary
CREATE OR REPLACE VIEW v_payroll_summary AS
SELECT 
  pp.id as period_id,
  pp.period_name,
  pp.start_date,
  pp.end_date,
  pp.pay_date,
  pp.status as period_status,
  COUNT(pc.id) as total_employees,
  SUM(pc.total_gross) as total_gross_pay,
  SUM(pc.commission_amount) as total_commissions,
  SUM(pc.bonus_amount) as total_bonuses,
  SUM(pc.deductions) as total_deductions,
  SUM(pc.net_pay) as total_net_pay,
  AVG(pc.total_gross) as avg_gross_pay,
  AVG(pc.commission_amount) as avg_commission,
  AVG(pc.bonus_amount) as avg_bonus
FROM payroll_periods pp
LEFT JOIN payroll_calculations pc ON pp.id = pc.period_id
GROUP BY pp.id, pp.period_name, pp.start_date, pp.end_date, pp.pay_date, pp.status
ORDER BY pp.start_date DESC;

-- Insert sample payroll periods
INSERT INTO payroll_periods (period_name, start_date, end_date, pay_date, status) VALUES
('January 2024', '2024-01-01', '2024-01-31', '2024-02-05', 'Closed'),
('February 2024', '2024-02-01', '2024-02-29', '2024-03-05', 'Closed'),
('March 2024', '2024-03-01', '2024-03-31', '2024-04-05', 'Closed'),
('April 2024', '2024-04-01', '2024-04-30', '2024-05-05', 'Closed'),
('May 2024', '2024-05-01', '2024-05-31', '2024-06-05', 'Closed'),
('June 2024', '2024-06-01', '2024-06-30', '2024-07-05', 'Closed'),
('July 2024', '2024-07-01', '2024-07-31', '2024-08-05', 'Closed'),
('August 2024', '2024-08-01', '2024-08-31', '2024-09-05', 'Closed'),
('September 2024', '2024-09-01', '2024-09-30', '2024-10-05', 'Closed'),
('October 2024', '2024-10-01', '2024-10-31', '2024-11-05', 'Closed'),
('November 2024', '2024-11-01', '2024-11-30', '2024-12-05', 'Closed'),
('December 2024', '2024-12-01', '2024-12-31', '2025-01-05', 'Open'),
('January 2025', '2025-01-01', '2025-01-31', '2025-02-05', 'Open');

-- Insert sample payroll calculations for recent periods
INSERT INTO payroll_calculations (employee_id, period_id, base_hours, overtime_hours, regular_rate, commission_amount, bonus_amount, deductions, status) VALUES
-- January 2025 calculations (period_id 13)
(1, 13, 160.0, 8.0, 25.00, 500.00, 200.00, 150.00, 'Calculated'),
(2, 13, 160.0, 4.0, 22.00, 300.00, 150.00, 120.00, 'Calculated'),
(3, 13, 160.0, 12.0, 28.00, 800.00, 300.00, 180.00, 'Calculated'),
(4, 13, 160.0, 6.0, 24.00, 400.00, 100.00, 140.00, 'Calculated'),
(5, 13, 160.0, 10.0, 26.00, 600.00, 250.00, 160.00, 'Calculated'),
-- December 2024 calculations (period_id 12)
(1, 12, 160.0, 6.0, 25.00, 450.00, 180.00, 145.00, 'Calculated'),
(2, 12, 160.0, 8.0, 22.00, 350.00, 120.00, 115.00, 'Calculated'),
(3, 12, 160.0, 4.0, 28.00, 700.00, 280.00, 175.00, 'Calculated'),
(4, 12, 160.0, 12.0, 24.00, 380.00, 90.00, 135.00, 'Calculated'),
(5, 12, 160.0, 2.0, 26.00, 550.00, 220.00, 155.00, 'Calculated');

-- Create view for commission calculations
CREATE OR REPLACE VIEW v_commission_calculations AS
SELECT 
  e.id as employee_id,
  e.first_name,
  e.last_name,
  e.department_id,
  d.name as department_name,
  cs.structure_name,
  cs.commission_type,
  cs.base_percentage,
  cs.target_amount,
  cs.bonus_multiplier,
  pm.metric_value,
  pm.target_value,
  pm.achievement_percentage,
  CASE 
    WHEN cs.commission_type = 'Percentage' THEN 
      (pm.metric_value * cs.base_percentage / 100) * cs.bonus_multiplier
    WHEN cs.commission_type = 'Fixed' THEN 
      CASE WHEN pm.achievement_percentage >= 100 THEN cs.base_percentage ELSE 0 END
    WHEN cs.commission_type = 'Tiered' THEN 
      (SELECT COALESCE(ct.commission_rate * pm.metric_value / 100, 0)
       FROM commission_tiers ct 
       WHERE ct.commission_structure_id = cs.id 
       AND pm.metric_value >= ct.min_amount 
       AND (ct.max_amount IS NULL OR pm.metric_value <= ct.max_amount)
       LIMIT 1)
    ELSE 0
  END as calculated_commission
FROM employees e
JOIN departments d ON e.department_id = d.id
LEFT JOIN commission_structures cs ON d.id = cs.department_id AND cs.is_active = TRUE
LEFT JOIN performance_metrics pm ON e.id = pm.employee_id
WHERE e.status = 'Active'
ORDER BY e.department_id, e.last_name;

-- Create view for bonus calculations
CREATE OR REPLACE VIEW v_bonus_calculations AS
SELECT 
  e.id as employee_id,
  e.first_name,
  e.last_name,
  e.department_id,
  d.name as department_name,
  bs.bonus_name,
  bs.bonus_type,
  bs.calculation_method,
  bs.base_amount,
  bs.percentage_rate,
  pm.metric_value,
  pm.target_value,
  pm.achievement_percentage,
  CASE 
    WHEN bs.calculation_method = 'Percentage' THEN 
      (pm.metric_value * bs.percentage_rate / 100)
    WHEN bs.calculation_method = 'Fixed' THEN 
      bs.base_amount
    WHEN bs.calculation_method = 'Tiered' THEN 
      (SELECT COALESCE(bt.bonus_amount, 0)
       FROM bonus_tiers bt 
       WHERE bt.bonus_structure_id = bs.id 
       AND pm.achievement_percentage >= bt.min_performance 
       AND (bt.max_performance IS NULL OR pm.achievement_percentage <= bt.max_performance)
       ORDER BY bt.min_performance DESC
       LIMIT 1)
    ELSE 0
  END as calculated_bonus
FROM employees e
JOIN departments d ON e.department_id = d.id
LEFT JOIN bonus_structures bs ON d.id = bs.department_id AND bs.is_active = TRUE
LEFT JOIN performance_metrics pm ON e.id = pm.employee_id
WHERE e.status = 'Active'
ORDER BY e.department_id, e.last_name;

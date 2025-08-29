-- Enhanced Workforce Analytics
-- Provides comprehensive workforce metrics and trends

-- Employee lifecycle events tracking
CREATE TABLE IF NOT EXISTS employee_events (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('Hired', 'Terminated', 'Promoted', 'Transferred', 'Returned')),
  event_date DATE NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced metrics views
CREATE OR REPLACE VIEW v_workforce_overview AS
SELECT 
  -- Total active employees
  COUNT(*) as total_active_employees,
  
  -- Employment type breakdown
  COUNT(CASE WHEN employment_type = 'Full-time' THEN 1 END) as full_time_count,
  COUNT(CASE WHEN employment_type = 'Part-time' THEN 1 END) as part_time_count,
  COUNT(CASE WHEN employment_type = 'Contract' THEN 1 END) as contract_count,
  
  -- Gender diversity (if available)
  COUNT(CASE WHEN gender = 'Male' THEN 1 END) as male_count,
  COUNT(CASE WHEN gender = 'Female' THEN 1 END) as female_count,
  COUNT(CASE WHEN gender = 'Non-binary' THEN 1 END) as other_gender_count,
  
  -- Age distribution
  COUNT(CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date)) < 25 THEN 1 
  END) as under_25_count,
  COUNT(CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date)) BETWEEN 25 AND 34 THEN 1 
  END) as age_25_34_count,
  COUNT(CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date)) BETWEEN 35 AND 44 THEN 1 
  END) as age_35_44_count,
  COUNT(CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date)) BETWEEN 45 AND 54 THEN 1 
  END) as age_45_54_count,
  COUNT(CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date)) >= 55 THEN 1 
  END) as over_55_count,
  
  -- Average tenure
  AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, hire_date))) as avg_tenure_years,
  
  -- Probation status
  COUNT(CASE WHEN probation_end > CURRENT_DATE THEN 1 END) as on_probation_count,
  COUNT(CASE WHEN probation_end <= CURRENT_DATE THEN 1 END) as probation_completed_count
  
FROM employees 
WHERE status = 'Active';

-- New hires this month
CREATE OR REPLACE VIEW v_new_hires_monthly AS
SELECT 
  e.id,
  e.first_name,
  e.last_name,
  e.email,
  d.name as department,
  l.name as location,
  e.hire_date,
  e.employment_type,
  e.role_title
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN locations l ON e.location_id = l.id
WHERE e.status = 'Active'
  AND EXTRACT(YEAR FROM e.hire_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM e.hire_date) = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY e.hire_date DESC;

-- Terminations this month
CREATE OR REPLACE VIEW v_terminations_monthly AS
SELECT 
  e.id,
  e.first_name,
  e.last_name,
  e.email,
  d.name as department,
  l.name as location,
  e.termination_date,
  e.employment_type,
  e.role_title
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN locations l ON e.location_id = l.id
WHERE e.termination_date IS NOT NULL
  AND EXTRACT(YEAR FROM e.termination_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM e.termination_date) = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY e.termination_date DESC;

-- Headcount change trend (YTD)
CREATE OR REPLACE VIEW v_headcount_trend AS
WITH monthly_counts AS (
  SELECT 
    DATE_TRUNC('month', date_series) as month,
    COUNT(CASE WHEN e.hire_date <= date_series AND (e.termination_date IS NULL OR e.termination_date > date_series) THEN 1 END) as headcount
  FROM generate_series(
    DATE_TRUNC('year', CURRENT_DATE),
    CURRENT_DATE,
    '1 month'::interval
  ) as date_series
  LEFT JOIN employees e ON e.hire_date <= date_series AND (e.termination_date IS NULL OR e.termination_date > date_series)
  GROUP BY DATE_TRUNC('month', date_series)
)
SELECT 
  month,
  headcount,
  LAG(headcount) OVER (ORDER BY month) as previous_month_headcount,
  headcount - LAG(headcount) OVER (ORDER BY month) as monthly_change,
  ROUND(((headcount - LAG(headcount) OVER (ORDER BY month)) / NULLIF(LAG(headcount) OVER (ORDER BY month), 0)) * 100, 2) as monthly_change_percentage
FROM monthly_counts
ORDER BY month;

-- Department distribution
CREATE OR REPLACE VIEW v_department_distribution AS
SELECT 
  d.name as department,
  COUNT(*) as employee_count,
  ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM employees WHERE status = 'Active')), 2) as percentage
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
WHERE e.status = 'Active'
GROUP BY d.name
ORDER BY employee_count DESC;

-- Location distribution
CREATE OR REPLACE VIEW v_location_distribution AS
SELECT 
  l.name as location,
  COUNT(*) as employee_count,
  ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM employees WHERE status = 'Active')), 2) as percentage
FROM employees e
LEFT JOIN locations l ON e.location_id = l.id
WHERE e.status = 'Active'
GROUP BY l.name
ORDER BY employee_count DESC;

-- Employee turnover rate
CREATE OR REPLACE VIEW v_turnover_rate AS
SELECT 
  EXTRACT(YEAR FROM CURRENT_DATE) as year,
  COUNT(CASE WHEN termination_date IS NOT NULL AND EXTRACT(YEAR FROM termination_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN 1 END) as terminations_ytd,
  COUNT(*) as total_employees,
  ROUND((COUNT(CASE WHEN termination_date IS NOT NULL AND EXTRACT(YEAR FROM termination_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN 1 END) * 100.0 / COUNT(*)), 2) as turnover_rate_percentage
FROM employees;

-- Upcoming anniversaries (next 30 days)
CREATE OR REPLACE VIEW v_upcoming_anniversaries AS
SELECT 
  e.id,
  e.first_name,
  e.last_name,
  e.email,
  d.name as department,
  e.hire_date,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date)) as years_of_service,
  e.hire_date + (EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date)) + 1) * INTERVAL '1 year' as next_anniversary
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
WHERE e.status = 'Active'
  AND e.hire_date + (EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date)) + 1) * INTERVAL '1 year' BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY next_anniversary;

-- Upcoming probation completions (next 30 days)
CREATE OR REPLACE VIEW v_upcoming_probation_completions AS
SELECT 
  e.id,
  e.first_name,
  e.last_name,
  e.email,
  d.name as department,
  e.hire_date,
  e.probation_end,
  e.probation_end - CURRENT_DATE as days_until_completion
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
WHERE e.status = 'Active'
  AND e.probation_end IS NOT NULL
  AND e.probation_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY e.probation_end;

-- Insert sample employee events
INSERT INTO employee_events (employee_id, event_type, event_date, details) VALUES
(1, 'Hired', '2025-01-05', '{"position": "Dispatcher", "salary": 45000}'),
(2, 'Hired', '2024-11-12', '{"position": "HR Coordinator", "salary": 42000}')
ON CONFLICT DO NOTHING;

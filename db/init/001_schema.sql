-- Core reference tables
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Employees
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  gender TEXT CHECK (gender IN ('Male','Female','Non-binary','Prefer not to say') OR gender IS NULL),
  birth_date DATE,
  hire_date DATE NOT NULL,
  termination_date DATE,
  employment_type TEXT NOT NULL CHECK (employment_type IN ('Full-time','Part-time','Contract')),
  department_id INT REFERENCES departments(id),
  location_id INT REFERENCES locations(id),
  role_title TEXT,
  probation_end DATE,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','On Leave','Terminated'))
);

-- Attendance / time
CREATE TABLE time_entries (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  clock_in TIMESTAMP,
  clock_out TIMESTAMP,
  hours_worked NUMERIC(5,2) GENERATED ALWAYS AS
    (CASE WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL
          THEN EXTRACT(EPOCH FROM (clock_out - clock_in))/3600.0
          ELSE NULL END) STORED,
  was_late BOOLEAN DEFAULT FALSE,
  left_early BOOLEAN DEFAULT FALSE,
  overtime_hours NUMERIC(5,2) DEFAULT 0
);
CREATE INDEX idx_time_entries_employee_date ON time_entries(employee_id, work_date);

-- Leave (ESA)
CREATE TABLE leaves (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('Vacation','Sick','Parental','Bereavement','Other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  approved_by TEXT,
  notes TEXT
);

-- Training (WHMIS, H&S, etc.)
CREATE TABLE trainings (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL,              -- e.g., WHMIS, H&S-2025
  name TEXT NOT NULL,
  mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  validity_months INT              -- e.g., 12, 24, NULL for no expiry
);

CREATE TABLE training_records (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  training_id INT REFERENCES trainings(id) ON DELETE CASCADE,
  completed_on DATE NOT NULL,
  expires_on DATE
);
CREATE UNIQUE INDEX uq_training_once ON training_records(employee_id, training_id);

-- Compliance / documents
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('Contract','PolicyAck','Visa','WorkPermit','Other')),
  file_name TEXT NOT NULL,
  uploaded_on TIMESTAMP NOT NULL DEFAULT NOW(),
  signed BOOLEAN NOT NULL DEFAULT FALSE
);

-- Recruiting
CREATE TABLE job_postings (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  department_id INT REFERENCES departments(id),
  location_id INT REFERENCES locations(id),
  opened_on DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','On Hold','Closed')),
  budget_cad NUMERIC(12,2)
);

CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  job_id INT REFERENCES job_postings(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  email TEXT NOT NULL,
  source TEXT, -- Workable/JazzHR/Referral
  applied_on DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Applied' CHECK (status IN ('Applied','Interview','Offer','Hired','Rejected')),
  cost_cad NUMERIC(10,2) DEFAULT 0
);

-- Payroll
CREATE TABLE payroll_runs (
  id SERIAL PRIMARY KEY,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  processed_on DATE DEFAULT CURRENT_DATE
);

CREATE TABLE payroll_lines (
  id SERIAL PRIMARY KEY,
  payroll_run_id INT REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  base_pay_cad NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_pay_cad NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus_cad NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions_cad NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Alerts / tasks
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,                 -- e.g., "Contract Renewal", "Visa Expiry", "Probation End"
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT
);

-- Minimal auth (local-only)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('HR','Manager','Viewer','Admin')),
  password_hash TEXT NOT NULL
);

-- Helpful views
CREATE VIEW v_headcount_ytd AS
SELECT date_trunc('month', d)::date AS month_start,
       COUNT(*) FILTER (WHERE e.hire_date <= d AND (e.termination_date IS NULL OR e.termination_date > d)) AS headcount
FROM generate_series(date_trunc('year', CURRENT_DATE),
                     CURRENT_DATE,
                     interval '1 month') AS d
LEFT JOIN employees e ON TRUE
GROUP BY 1
ORDER BY 1;

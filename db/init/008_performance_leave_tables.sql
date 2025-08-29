-- Performance Management Tables
CREATE TABLE IF NOT EXISTS performance_reviews (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id INT REFERENCES employees(id) ON DELETE CASCADE,
  review_date DATE NOT NULL,
  review_period TEXT NOT NULL,
  overall_rating NUMERIC(3,1) CHECK (overall_rating >= 1 AND overall_rating <= 5),
  strengths TEXT,
  areas_for_improvement TEXT,
  goals_for_next_period TEXT,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS performance_goals (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  goal_title TEXT NOT NULL,
  goal_description TEXT,
  target_date DATE NOT NULL,
  priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')),
  status TEXT DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Completed', 'On Hold')),
  completion_notes TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback_360 (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id INT REFERENCES employees(id) ON DELETE CASCADE,
  communication_rating NUMERIC(3,1) CHECK (communication_rating >= 1 AND communication_rating <= 5),
  teamwork_rating NUMERIC(3,1) CHECK (teamwork_rating >= 1 AND teamwork_rating <= 5),
  leadership_rating NUMERIC(3,1) CHECK (leadership_rating >= 1 AND leadership_rating <= 5),
  problem_solving_rating NUMERIC(3,1) CHECK (problem_solving_rating >= 1 AND problem_solving_rating <= 5),
  overall_rating NUMERIC(3,1) CHECK (overall_rating >= 1 AND overall_rating <= 5),
  strengths TEXT,
  areas_for_improvement TEXT,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave Management Tables
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id INT REFERENCES leave_types(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  approved_by INT REFERENCES employees(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id INT REFERENCES leave_types(id) ON DELETE CASCADE,
  year INT NOT NULL,
  available_days NUMERIC(5,2) DEFAULT 0,
  used_days NUMERIC(5,2) DEFAULT 0,
  carried_over_days NUMERIC(5,2) DEFAULT 0,
  UNIQUE(employee_id, leave_type_id, year)
);

-- Insert default leave types if not exists
INSERT INTO leave_types (name, color, is_paid, default_annual_entitlement) VALUES
('Vacation', '#10B981', true, 20),
('Sick Leave', '#EF4444', true, 10),
('Personal Leave', '#8B5CF6', false, 5),
('Bereavement', '#6B7280', true, 3),
('Parental Leave', '#F59E0B', true, 0),
('Other', '#6B7280', false, 0)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer ON performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_goals_employee ON performance_goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_feedback_360_employee ON feedback_360(employee_id);
CREATE INDEX IF NOT EXISTS idx_feedback_360_reviewer ON feedback_360(reviewer_id);

-- Create indexes for leave management
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(employee_id);

-- HR schema extensions: personal info, banking, identifiers, compensation, and document metadata

-- Employee addresses (supports history via effective dates)
CREATE TABLE IF NOT EXISTS employee_addresses (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  line1 TEXT,
  line2 TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'CA',
  effective_from DATE,
  effective_to DATE,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_employee_addresses_employee ON employee_addresses(employee_id);

-- Emergency contacts
CREATE TABLE IF NOT EXISTS employee_emergency_contacts (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  relationship TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_employee_emergency_contacts_employee ON employee_emergency_contacts(employee_id);

-- Bank accounts
CREATE TABLE IF NOT EXISTS employee_bank_accounts (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  bank_name TEXT,
  transit_number TEXT,
  account_number TEXT,
  effective_date DATE,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_employee_bank_accounts_employee ON employee_bank_accounts(employee_id);

-- Government and identity numbers (e.g., SIN), permits
CREATE TABLE IF NOT EXISTS employee_identifiers (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  id_type TEXT NOT NULL CHECK (id_type IN ('SIN','WorkPermit','PR','Citizenship','StudyPermit','DriverLicense','Other')),
  id_value TEXT NOT NULL,
  issued_on DATE,
  expires_on DATE,
  notes TEXT,
  UNIQUE (employee_id, id_type)
);
CREATE INDEX IF NOT EXISTS idx_employee_identifiers_employee ON employee_identifiers(employee_id);

-- Compensation history (hourly or salary)
CREATE TABLE IF NOT EXISTS employee_compensation (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('Hourly','Salary')),
  regular_rate NUMERIC(10,2) NOT NULL,
  overtime_multiplier NUMERIC(4,2) DEFAULT 1.50,
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  hours_biweekly NUMERIC(6,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_employee_compensation_employee ON employee_compensation(employee_id);

-- Status history (Active/On Leave/Terminated)
CREATE TABLE IF NOT EXISTS employee_status_history (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('Active','On Leave','Terminated')),
  status_date DATE NOT NULL,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_employee_status_history_employee ON employee_status_history(employee_id);

-- Extend documents to capture external URLs and notes
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;



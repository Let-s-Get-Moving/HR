-- Add onboarding fields to employees table
-- These fields come from the onboarding forms but weren't in the original schema

-- Personal Information
ALTER TABLE employees ADD COLUMN IF NOT EXISTS full_address TEXT;

-- Financial Information (Sensitive - should be encrypted at application level)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS sin_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS sin_expiry_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_transit_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_number TEXT;

-- Emergency Contact
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- Onboarding Status Tracking
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_status TEXT CHECK (contract_status IN ('Not Sent', 'Sent', 'Signed', 'Pending', NULL));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_signed_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gift_card_sent BOOLEAN DEFAULT FALSE;

-- Additional metadata
ALTER TABLE employees ADD COLUMN IF NOT EXISTS onboarding_source TEXT; -- 'Monday.com' or 'Google Forms' or 'Manual'
ALTER TABLE employees ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP;

-- Create index for name-based searching (for import matching)
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(first_name, last_name);

-- Enhance documents table to store URLs and more metadata
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_doc_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_doc_type_check 
  CHECK (doc_type IN (
    'Contract',
    'VoidCheque', 
    'DirectDeposit',
    'WorkPermit',
    'PR_Card',
    'Citizenship',
    'SIN_Document',
    'StudyPermit',
    'PolicyAck',
    'Visa',
    'Other'
  ));

-- Add new columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_url TEXT; -- Store original URL from Monday/Google Drive
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_data BYTEA; -- Store actual file binary (for manual uploads)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size INT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by INT REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_category TEXT CHECK (document_category IN ('Financial', 'Immigration', 'Employment', 'Personal', 'Other'));

-- Create indexes for document queries
CREATE INDEX IF NOT EXISTS idx_documents_employee ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(document_category);

-- Create a view for easy onboarding status overview
CREATE OR REPLACE VIEW v_employee_onboarding_status AS
SELECT 
  e.id,
  e.first_name,
  e.last_name,
  e.email,
  e.phone,
  e.hire_date,
  e.status,
  e.contract_status,
  e.contract_signed_date,
  e.gift_card_sent,
  e.sin_number IS NOT NULL as has_sin,
  e.sin_expiry_date,
  e.bank_name,
  e.emergency_contact_name,
  e.emergency_contact_phone,
  e.onboarding_source,
  e.imported_at,
  COUNT(DISTINCT d.id) FILTER (WHERE d.doc_type = 'Contract') as contract_docs,
  COUNT(DISTINCT d.id) FILTER (WHERE d.doc_type IN ('VoidCheque', 'DirectDeposit')) as banking_docs,
  COUNT(DISTINCT d.id) FILTER (WHERE d.doc_type IN ('WorkPermit', 'PR_Card', 'Citizenship', 'StudyPermit')) as status_docs,
  COUNT(DISTINCT d.id) FILTER (WHERE d.doc_type = 'SIN_Document') as sin_docs,
  COUNT(DISTINCT d.id) as total_docs,
  CASE 
    WHEN e.contract_status = 'Signed' 
      AND e.sin_number IS NOT NULL 
      AND e.bank_name IS NOT NULL 
      AND e.emergency_contact_name IS NOT NULL 
      AND COUNT(DISTINCT d.id) >= 3 
    THEN 'Complete'
    WHEN e.contract_status IN ('Sent', 'Pending')
      OR e.sin_number IS NOT NULL 
      OR COUNT(DISTINCT d.id) > 0
    THEN 'In Progress'
    ELSE 'Not Started'
  END as onboarding_status
FROM employees e
LEFT JOIN documents d ON e.id = d.employee_id
WHERE e.status IN ('Active', 'On Leave')
GROUP BY e.id, e.first_name, e.last_name, e.email, e.phone, e.hire_date, 
         e.status, e.contract_status, e.contract_signed_date, e.gift_card_sent,
         e.sin_number, e.sin_expiry_date, e.bank_name, e.emergency_contact_name,
         e.emergency_contact_phone, e.onboarding_source, e.imported_at
ORDER BY e.hire_date DESC;

COMMENT ON COLUMN employees.sin_number IS 'Social Insurance Number - SHOULD BE ENCRYPTED at application level';
COMMENT ON COLUMN employees.bank_account_number IS 'Bank account number - SHOULD BE ENCRYPTED at application level';
COMMENT ON VIEW v_employee_onboarding_status IS 'Overview of employee onboarding completion status';


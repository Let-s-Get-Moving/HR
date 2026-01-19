-- Add all standard departments for business operations
-- Updated 2026-01-19 to include all required departments

INSERT INTO departments (name) VALUES 
('Accounting'),
('Customer Support'),
('Finance'),
('Franchise Sales'),
('Franchise Support'),
('HR'),
('IT'),
('Lead Admin'),
('Marketing'),
('Operations'),
('Sales')
ON CONFLICT (name) DO NOTHING;


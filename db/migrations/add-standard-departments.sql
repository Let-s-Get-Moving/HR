-- Add standard departments
-- This migration seeds the 6 required departments: Sales, Operations, Finance, IT, Marketing, HR

INSERT INTO departments (name) VALUES 
('Sales'),
('Operations'),
('Finance'),
('IT'),
('Marketing'),
('HR')
ON CONFLICT (name) DO NOTHING;


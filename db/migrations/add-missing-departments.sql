-- Add missing departments for complete business operations coverage
-- Date: 2026-01-19

INSERT INTO departments (name) VALUES 
('Accounting'),
('Franchise Support'),
('Customer Support'),
('Franchise Sales'),
('Lead Admin')
ON CONFLICT (name) DO NOTHING;

-- Keep existing departments: Sales, Operations, Finance, IT, Marketing, HR

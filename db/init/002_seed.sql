INSERT INTO departments (name) VALUES ('Sales'),('Operations'),('Finance'),('IT'),('Marketing'),('HR') ON CONFLICT DO NOTHING;
INSERT INTO locations (name, region) VALUES ('Downtown','ON'),('North York','ON') ON CONFLICT DO NOTHING;

-- Seed employees removed - import from Excel instead
-- INSERT INTO employees (first_name,last_name,email,hire_date,employment_type,department_id,location_id,role_title,probation_end)
-- VALUES
-- ('Ava','Ng','ava.ng@company.local','2025-01-05','Full-time',1,1,'Dispatcher','2025-04-05'),
-- ('Ben','Singh','ben.singh@company.local','2024-11-12','Part-time',2,2,'HR Coordinator','2025-02-12');

INSERT INTO trainings (code,name,mandatory,validity_months)
VALUES ('WHMIS','WHMIS 2015',TRUE,12),('HS','Health & Safety',TRUE,24) ON CONFLICT DO NOTHING;

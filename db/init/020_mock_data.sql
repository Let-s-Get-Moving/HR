-- Mock Data for HR System
-- This creates realistic test data for all system functionality

-- Insert Departments
INSERT INTO departments (name, description, manager_id, budget) VALUES
('Engineering', 'Software development and technical operations', NULL, 500000),
('Sales', 'Customer acquisition and revenue generation', NULL, 300000),
('Marketing', 'Brand awareness and lead generation', NULL, 250000),
('Human Resources', 'Employee management and organizational development', NULL, 200000),
('Finance', 'Financial planning and accounting', NULL, 180000),
('Operations', 'Business operations and process management', NULL, 220000),
('Customer Success', 'Client relationship management and support', NULL, 150000);

-- Insert Locations
INSERT INTO locations (name, address, city, province, postal_code, country) VALUES
('Toronto HQ', '123 King Street West', 'Toronto', 'ON', 'M5H 3T9', 'Canada'),
('Vancouver Office', '456 Robson Street', 'Vancouver', 'BC', 'V6B 6L5', 'Canada'),
('Montreal Branch', '789 Rue Saint-Jacques', 'Montreal', 'QC', 'H2Y 1N9', 'Canada'),
('Calgary Office', '321 8th Avenue SW', 'Calgary', 'AB', 'T2P 1C5', 'Canada'),
('Remote', 'Various locations', 'Remote', 'N/A', 'N/A', 'Canada');

-- Insert realistic employees (25 employees across departments)
INSERT INTO employees (
    email, full_name, first_name, last_name, phone, gender, birth_date,
    hire_date, employment_type, department_id, location_id, role_title,
    hourly_rate, salary, status, probation_end, sin_number, address,
    city, province, postal_code, country, emergency_contact_name,
    emergency_contact_phone, emergency_contact_relationship, notes
) VALUES
-- Engineering Team (8 employees)
('sarah.chen@company.com', 'Sarah Chen', 'Sarah', 'Chen', '416-555-0101', 'Female', '1990-03-15', '2022-01-15', 'Full-time', 1, 1, 'Senior Software Engineer', NULL, 95000, 'Active', '2022-07-15', '123-456-789', '45 Bay Street', 'Toronto', 'ON', 'M5J 2R8', 'Canada', 'David Chen', '416-555-0102', 'Spouse', 'React/Node.js specialist'),

('michael.rodriguez@company.com', 'Michael Rodriguez', 'Michael', 'Rodriguez', '416-555-0103', 'Male', '1988-07-22', '2021-09-01', 'Full-time', 1, 1, 'Lead Developer', NULL, 110000, 'Active', '2022-03-01', '234-567-890', '67 Queen Street', 'Toronto', 'ON', 'M5C 1R6', 'Canada', 'Maria Rodriguez', '416-555-0104', 'Spouse', 'Team lead, full-stack'),

('jennifer.wong@company.com', 'Jennifer Wong', 'Jennifer', 'Wong', '604-555-0201', 'Female', '1992-11-08', '2023-02-01', 'Full-time', 1, 2, 'Frontend Developer', NULL, 75000, 'Active', '2023-08-01', '345-678-901', '123 Granville Street', 'Vancouver', 'BC', 'V6C 1T2', 'Canada', 'James Wong', '604-555-0202', 'Father', 'UI/UX focus'),

('alex.kim@company.com', 'Alex Kim', 'Alex', 'Kim', '416-555-0105', 'Non-binary', '1991-05-30', '2022-06-15', 'Full-time', 1, 1, 'Backend Developer', NULL, 82000, 'Active', '2022-12-15', '456-789-012', '89 Adelaide Street', 'Toronto', 'ON', 'M5C 1K6', 'Canada', 'Susan Kim', '416-555-0106', 'Mother', 'Python/Django expert'),

('david.thompson@company.com', 'David Thompson', 'David', 'Thompson', '514-555-0301', 'Male', '1987-09-12', '2021-03-10', 'Full-time', 1, 3, 'DevOps Engineer', NULL, 92000, 'Active', '2021-09-10', '567-890-123', '456 Rue McGill', 'Montreal', 'QC', 'H2Y 2E5', 'Canada', 'Linda Thompson', '514-555-0302', 'Spouse', 'AWS/Docker specialist'),

('priya.patel@company.com', 'Priya Patel', 'Priya', 'Patel', '403-555-0401', 'Female', '1993-01-25', '2023-05-01', 'Full-time', 1, 4, 'Junior Developer', NULL, 65000, 'Active', '2023-11-01', '678-901-234', '789 Centre Street', 'Calgary', 'AB', 'T2G 1B4', 'Canada', 'Raj Patel', '403-555-0402', 'Father', 'Recent graduate, eager learner'),

('robert.johnson@company.com', 'Robert Johnson', 'Robert', 'Johnson', '416-555-0107', 'Male', '1985-12-03', '2020-08-15', 'Full-time', 1, 1, 'Senior DevOps Engineer', NULL, 105000, 'Active', '2021-02-15', '789-012-345', '234 Front Street', 'Toronto', 'ON', 'M5V 2Y1', 'Canada', 'Emily Johnson', '416-555-0108', 'Spouse', 'Infrastructure lead'),

('lisa.martinez@company.com', 'Lisa Martinez', 'Lisa', 'Martinez', '647-555-0501', 'Female', '1989-08-17', '2022-11-01', 'Contract', 1, 5, 'Contract Developer', 45.00, NULL, 'Active', NULL, '890-123-456', 'Remote Worker', 'Remote', 'N/A', 'N/A', 'Canada', 'Carlos Martinez', '647-555-0502', 'Brother', '6-month contract, remote'),

-- Sales Team (6 employees)
('james.wilson@company.com', 'James Wilson', 'James', 'Wilson', '416-555-0109', 'Male', '1986-04-20', '2021-01-15', 'Full-time', 2, 1, 'Sales Director', NULL, 120000, 'Active', '2021-07-15', '901-234-567', '567 Bay Street', 'Toronto', 'ON', 'M5G 2C2', 'Canada', 'Sarah Wilson', '416-555-0110', 'Spouse', 'Team leader, top performer'),

('amanda.davis@company.com', 'Amanda Davis', 'Amanda', 'Davis', '416-555-0111', 'Female', '1990-06-14', '2022-03-01', 'Full-time', 2, 1, 'Senior Sales Rep', NULL, 70000, 'Active', '2022-09-01', '012-345-678', '890 King Street', 'Toronto', 'ON', 'M5V 1J5', 'Canada', 'Mark Davis', '416-555-0112', 'Spouse', 'Excellent closer, B2B focus'),

('carlos.garcia@company.com', 'Carlos Garcia', 'Carlos', 'Garcia', '604-555-0203', 'Male', '1988-10-05', '2021-08-15', 'Full-time', 2, 2, 'Sales Representative', NULL, 65000, 'Active', '2022-02-15', '123-456-789', '321 Robson Street', 'Vancouver', 'BC', 'V6B 3K9', 'Canada', 'Isabella Garcia', '604-555-0204', 'Spouse', 'West coast territory'),

('michelle.brown@company.com', 'Michelle Brown', 'Michelle', 'Brown', '514-555-0303', 'Female', '1991-02-28', '2022-09-01', 'Full-time', 2, 3, 'Sales Representative', NULL, 62000, 'Active', '2023-03-01', '234-567-890', '654 Rue Sainte-Catherine', 'Montreal', 'QC', 'H3A 1M4', 'Canada', 'Pierre Brown', '514-555-0304', 'Spouse', 'Quebec market specialist'),

('kevin.lee@company.com', 'Kevin Lee', 'Kevin', 'Lee', '403-555-0403', 'Male', '1987-11-16', '2021-05-01', 'Full-time', 2, 4, 'Account Manager', NULL, 68000, 'Active', '2021-11-01', '345-678-901', '987 17th Avenue SW', 'Calgary', 'AB', 'T2S 0A4', 'Canada', 'Jenny Lee', '403-555-0404', 'Spouse', 'Key account management'),

('stephanie.taylor@company.com', 'Stephanie Taylor', 'Stephanie', 'Taylor', '647-555-0503', 'Female', '1992-07-09', '2023-01-15', 'Full-time', 2, 1, 'Junior Sales Rep', NULL, 55000, 'Active', '2023-07-15', '456-789-012', '123 Richmond Street', 'Toronto', 'ON', 'M5H 2L3', 'Canada', 'Ryan Taylor', '647-555-0504', 'Brother', 'High potential, eager to learn'),

-- Marketing Team (3 employees)
('natalie.anderson@company.com', 'Natalie Anderson', 'Natalie', 'Anderson', '416-555-0113', 'Female', '1989-12-11', '2021-10-01', 'Full-time', 3, 1, 'Marketing Manager', NULL, 85000, 'Active', '2022-04-01', '567-890-123', '456 Queen Street', 'Toronto', 'ON', 'M5V 2A4', 'Canada', 'Tom Anderson', '416-555-0114', 'Spouse', 'Digital marketing expert'),

('ryan.clark@company.com', 'Ryan Clark', 'Ryan', 'Clark', '604-555-0205', 'Male', '1990-03-07', '2022-07-01', 'Full-time', 3, 2, 'Content Specialist', NULL, 58000, 'Active', '2023-01-01', '678-901-234', '789 Hastings Street', 'Vancouver', 'BC', 'V6C 1A2', 'Canada', 'Lisa Clark', '604-555-0206', 'Sister', 'Content creation and SEO'),

('olivia.white@company.com', 'Olivia White', 'Olivia', 'White', '416-555-0115', 'Female', '1993-08-23', '2023-03-15', 'Part-time', 3, 1, 'Social Media Coordinator', 28.00, NULL, 'Active', '2023-09-15', '789-012-345', '234 College Street', 'Toronto', 'ON', 'M5S 3M2', 'Canada', 'Sarah White', '416-555-0116', 'Mother', 'Part-time, social media focus'),

-- HR Team (2 employees)
('avneet.admin@company.com', 'Avneet Admin', 'Avneet', 'Admin', '416-555-0001', 'Male', '1985-01-01', '2020-01-01', 'Full-time', 4, 1, 'HR Director', NULL, 100000, 'Active', '2020-07-01', '000-000-001', '100 King Street', 'Toronto', 'ON', 'M5X 1A1', 'Canada', 'Partner Admin', '416-555-0002', 'Spouse', 'System administrator and HR lead'),

('jessica.moore@company.com', 'Jessica Moore', 'Jessica', 'Moore', '416-555-0117', 'Female', '1988-05-18', '2021-12-01', 'Full-time', 4, 1, 'HR Specialist', NULL, 72000, 'Active', '2022-06-01', '890-123-456', '678 Yonge Street', 'Toronto', 'ON', 'M4Y 2A6', 'Canada', 'Mike Moore', '416-555-0118', 'Spouse', 'Recruitment and employee relations'),

-- Finance Team (3 employees)
('daniel.harris@company.com', 'Daniel Harris', 'Daniel', 'Harris', '416-555-0119', 'Male', '1984-09-25', '2020-06-15', 'Full-time', 5, 1, 'Finance Manager', NULL, 95000, 'Active', '2020-12-15', '901-234-567', '345 Bay Street', 'Toronto', 'ON', 'M5H 2R2', 'Canada', 'Anna Harris', '416-555-0120', 'Spouse', 'CPA, financial reporting'),

('rachel.lewis@company.com', 'Rachel Lewis', 'Rachel', 'Lewis', '416-555-0121', 'Female', '1991-01-12', '2022-04-01', 'Full-time', 5, 1, 'Accountant', NULL, 65000, 'Active', '2022-10-01', '012-345-678', '567 Wellington Street', 'Toronto', 'ON', 'M5V 1E1', 'Canada', 'David Lewis', '416-555-0122', 'Father', 'AP/AR and payroll processing'),

('thomas.walker@company.com', 'Thomas Walker', 'Thomas', 'Walker', '514-555-0305', 'Male', '1987-06-30', '2021-11-15', 'Full-time', 5, 3, 'Financial Analyst', NULL, 70000, 'Active', '2022-05-15', '123-456-789', '890 Rue Saint-Paul', 'Montreal', 'QC', 'H2Y 1H6', 'Canada', 'Marie Walker', '514-555-0306', 'Spouse', 'Budget analysis and forecasting'),

-- Operations Team (2 employees)
('christopher.hall@company.com', 'Christopher Hall', 'Christopher', 'Hall', '403-555-0405', 'Male', '1986-04-08', '2021-02-01', 'Full-time', 6, 4, 'Operations Manager', NULL, 88000, 'Active', '2021-08-01', '234-567-890', '123 6th Avenue SW', 'Calgary', 'AB', 'T2P 0P5', 'Canada', 'Jennifer Hall', '403-555-0406', 'Spouse', 'Process improvement specialist'),

('samantha.young@company.com', 'Samantha Young', 'Samantha', 'Young', '604-555-0207', 'Female', '1990-10-14', '2022-08-15', 'Full-time', 6, 2, 'Business Analyst', NULL, 75000, 'Active', '2023-02-15', '345-678-901', '456 West Georgia', 'Vancouver', 'BC', 'V6B 4R1', 'Canada', 'Robert Young', '604-555-0208', 'Father', 'Data analysis and reporting'),

-- Customer Success Team (1 employee)
('ashley.king@company.com', 'Ashley King', 'Ashley', 'King', '647-555-0505', 'Female', '1992-12-02', '2023-04-01', 'Full-time', 7, 5, 'Customer Success Manager', NULL, 68000, 'Active', '2023-10-01', '456-789-012', 'Remote Worker', 'Remote', 'N/A', 'N/A', 'Canada', 'Michael King', '647-555-0506', 'Brother', 'Remote customer success specialist');

-- Update department managers
UPDATE departments SET manager_id = (SELECT id FROM employees WHERE email = 'robert.johnson@company.com') WHERE name = 'Engineering';
UPDATE departments SET manager_id = (SELECT id FROM employees WHERE email = 'james.wilson@company.com') WHERE name = 'Sales';
UPDATE departments SET manager_id = (SELECT id FROM employees WHERE email = 'natalie.anderson@company.com') WHERE name = 'Marketing';
UPDATE departments SET manager_id = (SELECT id FROM employees WHERE email = 'avneet.admin@company.com') WHERE name = 'Human Resources';
UPDATE departments SET manager_id = (SELECT id FROM employees WHERE email = 'daniel.harris@company.com') WHERE name = 'Finance';
UPDATE departments SET manager_id = (SELECT id FROM employees WHERE email = 'christopher.hall@company.com') WHERE name = 'Operations';
UPDATE departments SET manager_id = (SELECT id FROM employees WHERE email = 'ashley.king@company.com') WHERE name = 'Customer Success';

-- Insert Payroll Periods for 2025
INSERT INTO payroll_periods (period_name, start_date, end_date, pay_date, status, year) VALUES
('2025-01', '2025-01-01', '2025-01-15', '2025-01-20', 'Processed', 2025),
('2025-02', '2025-01-16', '2025-01-31', '2025-02-05', 'Processed', 2025),
('2025-03', '2025-02-01', '2025-02-15', '2025-02-20', 'Processed', 2025),
('2025-04', '2025-02-16', '2025-02-28', '2025-03-05', 'Processed', 2025),
('2025-05', '2025-03-01', '2025-03-15', '2025-03-20', 'Processed', 2025),
('2025-06', '2025-03-16', '2025-03-31', '2025-04-05', 'Processed', 2025),
('2025-07', '2025-04-01', '2025-04-15', '2025-04-20', 'Processed', 2025),
('2025-08', '2025-04-16', '2025-04-30', '2025-05-05', 'Processed', 2025),
('2025-09', '2025-05-01', '2025-05-15', '2025-05-20', 'Processed', 2025),
('2025-10', '2025-05-16', '2025-05-31', '2025-06-05', 'Processed', 2025),
('2025-11', '2025-06-01', '2025-06-15', '2025-06-20', 'Processed', 2025),
('2025-12', '2025-06-16', '2025-06-30', '2025-07-05', 'Processed', 2025),
('2025-13', '2025-07-01', '2025-07-15', '2025-07-20', 'Processed', 2025),
('2025-14', '2025-07-16', '2025-07-31', '2025-08-05', 'Processed', 2025),
('2025-15', '2025-08-01', '2025-08-15', '2025-08-20', 'Processed', 2025),
('2025-16', '2025-08-16', '2025-08-31', '2025-09-05', 'Processed', 2025),
('2025-17', '2025-09-01', '2025-09-15', '2025-09-20', 'Open', 2025),
('2025-18', '2025-09-16', '2025-09-30', '2025-10-05', 'Draft', 2025);

-- Insert Time Entries (realistic work hours for past 3 months)
-- This will create time entries for all full-time employees
DO $$
DECLARE
    emp_record RECORD;
    current_date_iter DATE;
    hours_worked DECIMAL(5,2);
    entry_date DATE;
BEGIN
    -- Loop through all full-time employees
    FOR emp_record IN 
        SELECT id, employment_type, hire_date 
        FROM employees 
        WHERE employment_type IN ('Full-time', 'Contract') 
        AND status = 'Active'
    LOOP
        -- Generate time entries for the last 90 days
        current_date_iter := CURRENT_DATE - INTERVAL '90 days';
        
        WHILE current_date_iter <= CURRENT_DATE LOOP
            -- Only create entries for weekdays and after hire date
            IF EXTRACT(DOW FROM current_date_iter) BETWEEN 1 AND 5 
               AND current_date_iter >= emp_record.hire_date THEN
                
                -- Generate realistic hours (7.5-8.5 hours for full-time, 6-9 for contract)
                IF emp_record.employment_type = 'Full-time' THEN
                    hours_worked := 7.5 + (RANDOM() * 1.0); -- 7.5 to 8.5 hours
                ELSE
                    hours_worked := 6.0 + (RANDOM() * 3.0); -- 6 to 9 hours for contract
                END IF;
                
                -- Round to nearest 0.25 hour
                hours_worked := ROUND(hours_worked * 4) / 4;
                
                -- Insert time entry
                INSERT INTO time_entries (
                    employee_id, 
                    date, 
                    hours_worked, 
                    overtime_hours, 
                    break_time, 
                    notes, 
                    status
                ) VALUES (
                    emp_record.id,
                    current_date_iter,
                    hours_worked,
                    CASE WHEN hours_worked > 8.0 THEN hours_worked - 8.0 ELSE 0 END,
                    1.0, -- Standard 1 hour break
                    CASE 
                        WHEN RANDOM() < 0.1 THEN 'Late start due to traffic'
                        WHEN RANDOM() < 0.05 THEN 'Client meeting ran long'
                        ELSE NULL
                    END,
                    'Approved'
                );
            END IF;
            
            current_date_iter := current_date_iter + INTERVAL '1 day';
        END LOOP;
    END LOOP;
END $$;

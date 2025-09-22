-- Extended Mock Data - Leave Requests, Performance, Benefits, etc.

-- Insert Leave Requests (various types and statuses)
INSERT INTO leave_requests (
    employee_id, leave_type_id, start_date, end_date, total_days, 
    reason, status, approved_by, approved_at, notes
) VALUES
-- Recent approved leaves (assuming leave_types table has id 1=Vacation, 2=Sick, 3=Personal)
((SELECT id FROM employees WHERE email = 'sarah.chen@company.com'), 1, '2025-08-15', '2025-08-22', 6, 'Family vacation to Europe', 'Approved', (SELECT id FROM employees WHERE email = 'robert.johnson@company.com'), '2025-08-01', 'Enjoy your trip!'),
((SELECT id FROM employees WHERE email = 'michael.rodriguez@company.com'), 2, '2025-09-05', '2025-09-06', 2, 'Flu symptoms', 'Approved', (SELECT id FROM employees WHERE email = 'robert.johnson@company.com'), '2025-09-05', 'Get well soon'),
((SELECT id FROM employees WHERE email = 'james.wilson@company.com'), 3, '2025-07-20', '2025-07-20', 1, 'Moving day', 'Approved', (SELECT id FROM employees WHERE email = 'avneet.admin@company.com'), '2025-07-18', 'Approved'),
((SELECT id FROM employees WHERE email = 'amanda.davis@company.com'), 1, '2025-10-01', '2025-10-08', 6, 'Wedding anniversary trip', 'Approved', (SELECT id FROM employees WHERE email = 'james.wilson@company.com'), '2025-09-15', 'Congratulations!'),

-- Pending requests
((SELECT id FROM employees WHERE email = 'jennifer.wong@company.com'), 1, '2025-12-20', '2025-12-31', 8, 'Christmas holidays with family', 'Pending', NULL, NULL, NULL),
((SELECT id FROM employees WHERE email = 'alex.kim@company.com'), 3, '2025-10-15', '2025-10-15', 1, 'Medical appointment', 'Pending', NULL, NULL, NULL),
((SELECT id FROM employees WHERE email = 'priya.patel@company.com'), 1, '2025-11-15', '2025-11-22', 6, 'Diwali celebrations', 'Pending', NULL, NULL, NULL),

-- Some denied requests (for testing)
((SELECT id FROM employees WHERE email = 'carlos.garcia@company.com'), 1, '2025-09-20', '2025-09-27', 6, 'Last minute trip', 'Rejected', (SELECT id FROM employees WHERE email = 'james.wilson@company.com'), '2025-09-18', 'Peak sales period, please reschedule'),
((SELECT id FROM employees WHERE email = 'david.thompson@company.com'), 3, '2025-08-30', '2025-09-03', 3, 'Extended weekend', 'Rejected', (SELECT id FROM employees WHERE email = 'robert.johnson@company.com'), '2025-08-28', 'Critical deployment scheduled');

-- Insert Performance Reviews
INSERT INTO performance_reviews (
    employee_id, reviewer_id, review_date, review_period, 
    overall_rating, strengths, areas_for_improvement, goals_for_next_period,
    status, completed_date
) VALUES
-- Engineering team reviews
((SELECT id FROM employees WHERE email = 'sarah.chen@company.com'), (SELECT id FROM employees WHERE email = 'robert.johnson@company.com'), '2025-06-15', 'H1 2025', 4.5, 'Excellent technical skills, great team player, delivers on time', 'Could improve documentation practices', 'Lead a major feature development, mentor junior developers', 'Completed', '2025-06-15'),

((SELECT id FROM employees WHERE email = 'michael.rodriguez@company.com'), (SELECT id FROM employees WHERE email = 'robert.johnson@company.com'), '2025-06-20', 'H1 2025', 4.8, 'Outstanding leadership, technical expertise, drives innovation', 'Sometimes takes on too much, needs to delegate more', 'Develop team scalability plan, improve delegation skills', 'Completed', '2025-06-20'),

((SELECT id FROM employees WHERE email = 'jennifer.wong@company.com'), (SELECT id FROM employees WHERE email = 'robert.johnson@company.com'), '2025-06-10', 'H1 2025', 4.2, 'Strong frontend skills, good eye for design, learns quickly', 'Needs more backend experience, improve code review participation', 'Complete full-stack training, contribute to backend projects', 'Completed', '2025-06-10'),

-- Sales team reviews
((SELECT id FROM employees WHERE email = 'james.wilson@company.com'), (SELECT id FROM employees WHERE email = 'avneet.admin@company.com'), '2025-07-01', 'H1 2025', 4.9, 'Exceptional sales results, great team leadership, strategic thinking', 'Could improve CRM data entry consistency', 'Achieve 120% of sales target, develop new market strategy', 'Completed', '2025-07-01'),

((SELECT id FROM employees WHERE email = 'amanda.davis@company.com'), (SELECT id FROM employees WHERE email = 'james.wilson@company.com'), '2025-06-25', 'H1 2025', 4.6, 'Excellent closing skills, great client relationships, consistent performer', 'Needs to improve prospecting activities', 'Increase pipeline by 30%, mentor junior sales rep', 'Completed', '2025-06-25'),

-- Pending reviews
((SELECT id FROM employees WHERE email = 'alex.kim@company.com'), (SELECT id FROM employees WHERE email = 'robert.johnson@company.com'), '2025-09-15', 'H2 2025', NULL, NULL, NULL, NULL, 'Scheduled', NULL),
((SELECT id FROM employees WHERE email = 'stephanie.taylor@company.com'), (SELECT id FROM employees WHERE email = 'james.wilson@company.com'), '2025-09-20', 'H2 2025', NULL, NULL, NULL, NULL, 'Scheduled', NULL);

-- Insert Performance Goals
INSERT INTO performance_goals (
    employee_id, goal_title, goal_description, target_date, 
    priority, status, progress_percentage, notes
) VALUES
-- Engineering goals
((SELECT id FROM employees WHERE email = 'sarah.chen@company.com'), 'Lead Mobile App Project', 'Take technical lead on new mobile application development', '2025-12-31', 'High', 'In Progress', 65, 'Good progress, on track for Q4 delivery'),
((SELECT id FROM employees WHERE email = 'jennifer.wong@company.com'), 'Complete Backend Training', 'Gain proficiency in Node.js and database design', '2025-11-30', 'Medium', 'In Progress', 40, 'Completed Node.js course, starting database module'),
((SELECT id FROM employees WHERE email = 'alex.kim@company.com'), 'Improve Code Review Skills', 'Provide more detailed and helpful code reviews', '2025-10-31', 'Medium', 'In Progress', 75, 'Significant improvement noted by team'),

-- Sales goals
((SELECT id FROM employees WHERE email = 'james.wilson@company.com'), 'Achieve 120% Sales Target', 'Exceed annual sales quota by 20%', '2025-12-31', 'High', 'In Progress', 85, 'Ahead of target, excellent performance'),
((SELECT id FROM employees WHERE email = 'amanda.davis@company.com'), 'Expand Enterprise Accounts', 'Secure 5 new enterprise clients', '2025-12-31', 'High', 'In Progress', 60, '3 of 5 clients secured, good pipeline'),
((SELECT id FROM employees WHERE email = 'stephanie.taylor@company.com'), 'Complete Sales Training', 'Finish advanced sales methodology training', '2025-10-15', 'Medium', 'In Progress', 80, 'Almost complete, final exam scheduled'),

-- Marketing goals
((SELECT id FROM employees WHERE email = 'natalie.anderson@company.com'), 'Launch Brand Campaign', 'Execute Q4 brand awareness campaign', '2025-11-30', 'High', 'Not Started', 0, 'Planning phase, budget approved'),
((SELECT id FROM employees WHERE email = 'ryan.clark@company.com'), 'SEO Optimization', 'Improve organic search rankings by 25%', '2025-12-31', 'Medium', 'In Progress', 45, 'Good progress on content strategy');

-- Insert Commission Structures (for sales team)
INSERT INTO commission_structures (
    name, description, commission_type, rate, threshold, 
    effective_date, end_date, is_active
) VALUES
('Standard Sales Commission', 'Base commission for all sales reps', 'Percentage', 5.0, 0, '2025-01-01', NULL, true),
('Senior Rep Bonus', 'Additional commission for senior reps', 'Percentage', 2.0, 50000, '2025-01-01', NULL, true),
('Enterprise Deal Bonus', 'Bonus for deals over $100K', 'Fixed', 2500.00, 100000, '2025-01-01', NULL, true),
('Q4 Accelerator', 'Higher commission in Q4', 'Percentage', 7.5, 0, '2025-10-01', '2025-12-31', true);

-- Insert Bonus Structures
INSERT INTO bonus_structures (
    name, description, bonus_type, amount, criteria, 
    effective_date, end_date, is_active
) VALUES
('Annual Performance Bonus', 'Year-end bonus based on performance rating', 'Performance', 5000.00, 'Rating >= 4.0', '2025-01-01', '2025-12-31', true),
('Referral Bonus', 'Bonus for successful employee referrals', 'Referral', 1000.00, 'Referred employee completes 90 days', '2025-01-01', NULL, true),
('Project Completion Bonus', 'Bonus for completing major projects on time', 'Project', 2500.00, 'Project delivered on time and budget', '2025-01-01', NULL, true),
('Sales Target Bonus', 'Bonus for exceeding sales targets', 'Sales', 10000.00, 'Achieve 110% of annual target', '2025-01-01', '2025-12-31', true);

-- Insert Job Postings (for recruiting)
INSERT INTO job_postings (
    title, department_id, location_id, employment_type, salary_range,
    description, requirements, posted_date, closing_date, status,
    posted_by, applications_count
) VALUES
('Senior React Developer', 1, 1, 'Full-time', '$85,000 - $100,000', 
'We are seeking a Senior React Developer to join our growing engineering team. You will be responsible for building scalable web applications and mentoring junior developers.',
'5+ years React experience, TypeScript, Node.js, Git, Agile methodologies',
'2025-08-15', '2025-10-15', 'Open', 
(SELECT id FROM employees WHERE email = 'robert.johnson@company.com'), 12),

('Sales Development Representative', 2, 2, 'Full-time', '$55,000 - $65,000',
'Join our dynamic sales team as an SDR. You will be responsible for generating qualified leads and supporting our account executives.',
'1-2 years sales experience, excellent communication skills, CRM experience preferred',
'2025-09-01', '2025-11-01', 'Open',
(SELECT id FROM employees WHERE email = 'james.wilson@company.com'), 8),

('Marketing Coordinator', 3, 1, 'Full-time', '$50,000 - $60,000',
'Support our marketing initiatives including content creation, social media management, and campaign execution.',
'Marketing degree, social media experience, content creation skills, Adobe Creative Suite',
'2025-08-20', '2025-10-20', 'Open',
(SELECT id FROM employees WHERE email = 'natalie.anderson@company.com'), 15),

('DevOps Engineer', 1, 4, 'Full-time', '$90,000 - $110,000',
'We need a DevOps Engineer to help scale our infrastructure and improve our deployment processes.',
'AWS/Azure experience, Docker, Kubernetes, CI/CD, Infrastructure as Code',
'2025-07-30', '2025-09-30', 'Closed',
(SELECT id FROM employees WHERE email = 'robert.johnson@company.com'), 25);

-- Insert Benefits Plans
INSERT INTO benefits_plans (
    plan_name, plan_type, description, provider, monthly_cost,
    employee_contribution, employer_contribution, effective_date, is_active
) VALUES
('Extended Health Care', 'Health', 'Comprehensive medical and dental coverage', 'Great-West Life', 450.00, 150.00, 300.00, '2025-01-01', true),
('Dental Care Plus', 'Dental', 'Full dental coverage including orthodontics', 'Sun Life', 120.00, 40.00, 80.00, '2025-01-01', true),
('Vision Care', 'Vision', 'Eye exams and prescription glasses coverage', 'Sun Life', 45.00, 15.00, 30.00, '2025-01-01', true),
('Group RRSP', 'Retirement', 'Company-matched retirement savings plan', 'Manulife', 0.00, 0.00, 0.00, '2025-01-01', true),
('Life Insurance', 'Life', '2x annual salary life insurance coverage', 'Great-West Life', 85.00, 0.00, 85.00, '2025-01-01', true),
('Disability Insurance', 'Disability', 'Short and long-term disability coverage', 'Sun Life', 95.00, 25.00, 70.00, '2025-01-01', true);

-- Insert Training Programs
INSERT INTO trainings (
    title, description, duration_hours, trainer, 
    training_type, is_mandatory, effective_date
) VALUES
('Workplace Safety', 'Comprehensive workplace safety and emergency procedures', 4, 'Safety First Training Inc.', 'Safety', true, '2025-01-01'),
('Diversity & Inclusion', 'Building an inclusive workplace culture', 3, 'Internal HR Team', 'HR', true, '2025-01-01'),
('Information Security', 'Cybersecurity awareness and best practices', 2, 'SecureIT Solutions', 'Security', true, '2025-01-01'),
('Leadership Development', 'Management and leadership skills development', 16, 'Leadership Excellence Group', 'Leadership', false, '2025-01-01'),
('Technical Skills: React Advanced', 'Advanced React patterns and performance optimization', 24, 'Tech Academy', 'Technical', false, '2025-01-01'),
('Sales Methodology', 'Consultative selling and relationship building', 12, 'Sales Mastery Institute', 'Sales', false, '2025-01-01');

-- Insert Document Types (for compliance)
INSERT INTO documents (
    employee_id, document_type, document_name, file_path, 
    upload_date, expiry_date, status, uploaded_by
) VALUES
-- Sample documents for a few employees
((SELECT id FROM employees WHERE email = 'sarah.chen@company.com'), 'Contract', 'Employment Contract - Sarah Chen.pdf', '/documents/contracts/sarah_chen_contract.pdf', '2022-01-10', NULL, 'Active', (SELECT id FROM employees WHERE email = 'avneet.admin@company.com')),
((SELECT id FROM employees WHERE email = 'sarah.chen@company.com'), 'Training Certificate', 'Workplace Safety Certificate.pdf', '/documents/training/sarah_chen_safety.pdf', '2022-02-15', '2025-02-15', 'Active', (SELECT id FROM employees WHERE email = 'jessica.moore@company.com')),
((SELECT id FROM employees WHERE email = 'michael.rodriguez@company.com'), 'Contract', 'Employment Contract - Michael Rodriguez.pdf', '/documents/contracts/michael_rodriguez_contract.pdf', '2021-08-25', NULL, 'Active', (SELECT id FROM employees WHERE email = 'avneet.admin@company.com')),
((SELECT id FROM employees WHERE email = 'james.wilson@company.com'), 'Performance Review', 'Q2 2025 Performance Review.pdf', '/documents/reviews/james_wilson_q2_2025.pdf', '2025-07-01', NULL, 'Active', (SELECT id FROM employees WHERE email = 'avneet.admin@company.com'));

-- Create some sample payroll calculations for recent periods
INSERT INTO payroll_calculations (
    employee_id, period_id, regular_hours, overtime_hours, 
    commission_amount, bonus_amount, deductions, status
) VALUES
-- Sample calculations for period 16 (August 16-31, 2025)
((SELECT id FROM employees WHERE email = 'sarah.chen@company.com'), 16, 80.0, 2.0, 0, 0, 850.50, 'Processed'),
((SELECT id FROM employees WHERE email = 'michael.rodriguez@company.com'), 16, 80.0, 5.0, 0, 0, 1100.75, 'Processed'),
((SELECT id FROM employees WHERE email = 'james.wilson@company.com'), 16, 80.0, 0.0, 2500.00, 0, 1200.25, 'Processed'),
((SELECT id FROM employees WHERE email = 'amanda.davis@company.com'), 16, 80.0, 1.0, 1850.00, 0, 750.30, 'Processed'),
((SELECT id FROM employees WHERE email = 'jennifer.wong@company.com'), 16, 80.0, 3.0, 0, 0, 700.40, 'Processed');

-- Insert some applications for job postings
INSERT INTO applications (
    job_posting_id, candidate_name, candidate_email, candidate_phone,
    resume_path, cover_letter_path, application_date, status, notes
) VALUES
(1, 'John Smith', 'john.smith@email.com', '416-555-9001', '/resumes/john_smith.pdf', '/cover_letters/john_smith.pdf', '2025-08-20', 'Under Review', 'Strong React background'),
(1, 'Emily Johnson', 'emily.johnson@email.com', '416-555-9002', '/resumes/emily_johnson.pdf', '/cover_letters/emily_johnson.pdf', '2025-08-22', 'Interview Scheduled', 'Excellent portfolio'),
(1, 'David Brown', 'david.brown@email.com', '647-555-9003', '/resumes/david_brown.pdf', NULL, '2025-08-25', 'Applied', 'Recent graduate'),
(2, 'Sarah Wilson', 'sarah.wilson@email.com', '604-555-9004', '/resumes/sarah_wilson.pdf', '/cover_letters/sarah_wilson.pdf', '2025-09-02', 'Under Review', 'Previous SDR experience'),
(2, 'Michael Davis', 'michael.davis@email.com', '604-555-9005', '/resumes/michael_davis.pdf', '/cover_letters/michael_davis.pdf', '2025-09-03', 'Applied', 'Strong communication skills');

-- Update applications count for job postings
UPDATE job_postings SET applications_count = (
    SELECT COUNT(*) FROM applications WHERE job_posting_id = job_postings.id
);

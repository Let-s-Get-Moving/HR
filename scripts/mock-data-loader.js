#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function loadMockData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Loading comprehensive mock data for HR system...\n');

    // 1. Add more employees (realistic Canadian names and data)
    console.log('👥 Adding employees...');
    await client.query(`
      INSERT INTO employees (
        first_name, last_name, email, phone, gender, birth_date, hire_date,
        employment_type, department_id, location_id, role_title, hourly_rate, 
        salary, status
      ) VALUES
      -- Engineering Team
      ('Sarah', 'Chen', 'sarah.chen@company.com', '416-555-0101', 'Female', '1990-03-15', '2022-01-15', 'Full-time', 160, 1, 'Senior Software Engineer', NULL, 95000, 'Active'),
      ('Michael', 'Rodriguez', 'michael.rodriguez@company.com', '416-555-0103', 'Male', '1988-07-22', '2021-09-01', 'Full-time', 160, 1, 'Lead Developer', NULL, 110000, 'Active'),
      ('Jennifer', 'Wong', 'jennifer.wong@company.com', '604-555-0201', 'Female', '1992-11-08', '2023-02-01', 'Full-time', 160, 2, 'Frontend Developer', NULL, 75000, 'Active'),
      ('Alex', 'Kim', 'alex.kim@company.com', '416-555-0105', 'Non-binary', '1991-05-30', '2022-06-15', 'Full-time', 160, 1, 'Backend Developer', NULL, 82000, 'Active'),
      ('David', 'Thompson', 'david.thompson@company.com', '514-555-0301', 'Male', '1987-09-12', '2021-03-10', 'Full-time', 160, 1, 'DevOps Engineer', NULL, 92000, 'Active'),
      ('Priya', 'Patel', 'priya.patel@company.com', '403-555-0401', 'Female', '1993-01-25', '2023-05-01', 'Full-time', 160, 2, 'Junior Developer', NULL, 65000, 'Active'),
      
      -- Sales Team
      ('James', 'Wilson', 'james.wilson@company.com', '416-555-0109', 'Male', '1986-04-20', '2021-01-15', 'Full-time', 3, 1, 'Sales Director', NULL, 120000, 'Active'),
      ('Amanda', 'Davis', 'amanda.davis@company.com', '416-555-0111', 'Female', '1990-06-14', '2022-03-01', 'Full-time', 3, 1, 'Senior Sales Rep', NULL, 70000, 'Active'),
      ('Carlos', 'Garcia', 'carlos.garcia@company.com', '604-555-0203', 'Male', '1988-10-05', '2021-08-15', 'Full-time', 3, 2, 'Sales Representative', NULL, 65000, 'Active'),
      ('Michelle', 'Brown', 'michelle.brown@company.com', '514-555-0303', 'Female', '1991-02-28', '2022-09-01', 'Full-time', 3, 1, 'Sales Representative', NULL, 62000, 'Active'),
      
      -- Marketing Team
      ('Natalie', 'Anderson', 'natalie.anderson@company.com', '416-555-0113', 'Female', '1989-12-11', '2021-10-01', 'Full-time', 1, 1, 'Marketing Manager', NULL, 85000, 'Active'),
      ('Ryan', 'Clark', 'ryan.clark@company.com', '604-555-0205', 'Male', '1990-03-07', '2022-07-01', 'Full-time', 1, 2, 'Content Specialist', NULL, 58000, 'Active'),
      
      -- HR Team
      ('Jessica', 'Moore', 'jessica.moore@company.com', '416-555-0117', 'Female', '1988-05-18', '2021-12-01', 'Full-time', 161, 1, 'HR Specialist', NULL, 72000, 'Active'),
      
      -- Finance Team
      ('Daniel', 'Harris', 'daniel.harris@company.com', '416-555-0119', 'Male', '1984-09-25', '2020-06-15', 'Full-time', 1, 1, 'Finance Manager', NULL, 95000, 'Active'),
      ('Rachel', 'Lewis', 'rachel.lewis@company.com', '416-555-0121', 'Female', '1991-01-12', '2022-04-01', 'Full-time', 1, 1, 'Accountant', NULL, 65000, 'Active')
    `);

    // 2. Add realistic time entries for the last 3 months  
    console.log('⏰ Adding time entries...');
    await client.query(`
      INSERT INTO time_entries (employee_id, work_date, clock_in, clock_out, was_late, left_early, overtime_hours) VALUES
      -- Sample time entries for different employees
      (5, '2025-09-10', '2025-09-10 08:30:00', '2025-09-10 17:00:00', false, false, 0.5),
      (5, '2025-09-11', '2025-09-11 09:00:00', '2025-09-11 17:30:00', true, false, 0.5),
      (6, '2025-09-10', '2025-09-10 08:00:00', '2025-09-10 16:30:00', false, true, 0),
      (6, '2025-09-11', '2025-09-11 08:15:00', '2025-09-11 17:00:00', false, false, 0.75),
      (7, '2025-09-10', '2025-09-10 09:00:00', '2025-09-10 18:00:00', true, false, 1.0),
      (7, '2025-09-11', '2025-09-11 08:45:00', '2025-09-11 17:15:00', false, false, 0.5),
      (8, '2025-09-10', '2025-09-10 08:30:00', '2025-09-10 17:30:00', false, false, 1.0),
      (8, '2025-09-11', '2025-09-11 08:00:00', '2025-09-11 16:45:00', false, true, 0.75),
      (9, '2025-09-10', '2025-09-10 08:00:00', '2025-09-10 17:00:00', false, false, 1.0),
      (10, '2025-09-10', '2025-09-10 08:30:00', '2025-09-10 17:30:00', false, false, 1.0)
    `);

    // 3. Add leave requests
    console.log('🏖️ Adding leave requests...');
    await client.query(`
      INSERT INTO leave_requests (
        employee_id, leave_type_id, start_date, end_date, days_requested,
        reason, status, approved_by, created_at
      ) VALUES
      (1, 1, '2025-10-15', '2025-10-19', 5, 'Family vacation', 'Approved', 2, CURRENT_DATE - INTERVAL '10 days'),
      (3, 2, '2025-09-20', '2025-09-20', 1, 'Doctor appointment', 'Approved', 2, CURRENT_DATE - INTERVAL '5 days'),
      (5, 1, '2025-12-23', '2025-12-30', 6, 'Holiday break', 'Pending', NULL, CURRENT_DATE - INTERVAL '2 days'),
      (7, 3, '2025-11-01', '2025-11-01', 1, 'Personal matters', 'Pending', NULL, CURRENT_DATE - INTERVAL '1 day'),
      (9, 2, '2025-09-15', '2025-09-16', 2, 'Flu symptoms', 'Approved', 8, CURRENT_DATE - INTERVAL '7 days')
    `);

    // 4. Add performance reviews
    console.log('🎯 Adding performance reviews...');
    await client.query(`
      INSERT INTO performance_reviews (
        employee_id, reviewer_id, review_period, overall_rating,
        strengths, areas_for_improvement, goals_for_next_period,
        review_date, status
      ) VALUES
      (1, 2, 'Q2 2025', 4.5, 'Excellent technical skills, great teamwork', 'Could improve documentation', 'Lead mobile app project', '2025-07-15', 'Completed'),
      (3, 2, 'Q2 2025', 4.2, 'Strong frontend skills, quick learner', 'Needs backend experience', 'Complete full-stack training', '2025-07-20', 'Completed'),
      (5, 2, 'Q2 2025', 4.0, 'Solid DevOps knowledge, reliable', 'Communication could improve', 'Mentor junior developers', '2025-07-25', 'Completed'),
      (7, 8, 'Q2 2025', 4.8, 'Outstanding sales results, leadership', 'CRM data entry consistency', 'Achieve 120% target', '2025-08-01', 'Completed'),
      (9, 8, 'Q2 2025', 4.3, 'Good client relationships, consistent', 'Prospecting activities', 'Increase pipeline 30%', '2025-08-05', 'Completed')
    `);

    // 5. Add performance goals
    console.log('🎯 Adding performance goals...');
    await client.query(`
      INSERT INTO performance_goals (
        employee_id, goal_title, goal_description, target_date,
        priority, status, progress_percentage
      ) VALUES
      (1, 'Lead Mobile App', 'Technical lead on new mobile application', '2025-12-31', 'High', 'In Progress', 65),
      (3, 'Backend Training', 'Complete Node.js and database training', '2025-11-30', 'Medium', 'In Progress', 40),
      (7, 'Sales Target 120%', 'Exceed annual sales quota by 20%', '2025-12-31', 'High', 'In Progress', 85),
      (9, 'Enterprise Accounts', 'Secure 5 new enterprise clients', '2025-12-31', 'High', 'In Progress', 60),
      (11, 'Brand Campaign', 'Execute Q4 brand awareness campaign', '2025-11-30', 'High', 'Not Started', 0)
    `);

    // 6. Add job postings
    console.log('💼 Adding job postings...');
    await client.query(`
      INSERT INTO job_postings (
        title, department_id, location_id, employment_type, salary_range,
        description, requirements, posted_date, closing_date, status,
        posted_by
      ) VALUES
      ('Senior React Developer', 160, 1, 'Full-time', '$85,000 - $100,000', 
       'Join our engineering team building scalable web applications', 
       '5+ years React, TypeScript, Node.js experience', 
       CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '30 days', 'Open', 2),
      ('Sales Development Rep', 3, 2, 'Full-time', '$55,000 - $65,000',
       'Generate qualified leads for our sales team',
       '1-2 years sales experience, excellent communication',
       CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '45 days', 'Open', 8),
      ('Marketing Coordinator', 1, 1, 'Full-time', '$50,000 - $60,000',
       'Support marketing initiatives and campaigns',
       'Marketing degree, social media experience',
       CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', 'Open', 11)
    `);

    // 7. Add applications
    console.log('📝 Adding job applications...');
    await client.query(`
      INSERT INTO applications (
        job_posting_id, candidate_name, candidate_email, candidate_phone,
        application_date, status, notes
      ) VALUES
      (1, 'John Smith', 'john.smith@email.com', '416-555-9001', CURRENT_DATE - INTERVAL '12 days', 'Under Review', 'Strong React background'),
      (1, 'Emily Johnson', 'emily.johnson@email.com', '416-555-9002', CURRENT_DATE - INTERVAL '10 days', 'Interview Scheduled', 'Excellent portfolio'),
      (1, 'David Brown', 'david.brown@email.com', '647-555-9003', CURRENT_DATE - INTERVAL '8 days', 'Applied', 'Recent graduate'),
      (2, 'Sarah Wilson', 'sarah.wilson@email.com', '604-555-9004', CURRENT_DATE - INTERVAL '7 days', 'Under Review', 'Previous SDR experience'),
      (3, 'Lisa Martinez', 'lisa.martinez@email.com', '416-555-9005', CURRENT_DATE - INTERVAL '3 days', 'Applied', 'Strong marketing background')
    `);

    // 8. Add commission and bonus structures
    console.log('💰 Adding commission and bonus structures...');
    await client.query(`
      INSERT INTO commission_structures (
        name, description, commission_rate, threshold_amount,
        effective_date, is_active
      ) VALUES
      ('Standard Sales Commission', 'Base commission for all sales', 0.05, 0, '2025-01-01', true),
      ('Senior Rep Bonus', 'Additional for senior reps', 0.02, 50000, '2025-01-01', true),
      ('Enterprise Bonus', 'Bonus for large deals', 0.10, 100000, '2025-01-01', true)
    `);

    await client.query(`
      INSERT INTO bonus_structures (
        name, description, bonus_amount, criteria,
        effective_date, is_active
      ) VALUES
      ('Performance Bonus', 'Annual performance bonus', 5000, 'Rating >= 4.0', '2025-01-01', true),
      ('Referral Bonus', 'Employee referral bonus', 1000, 'Successful hire', '2025-01-01', true),
      ('Project Bonus', 'Project completion bonus', 2500, 'On-time delivery', '2025-01-01', true)
    `);

    // 9. Add training records
    console.log('📚 Adding training records...');
    await client.query(`
      INSERT INTO training_records (
        employee_id, training_id, completion_date, status, score
      ) VALUES
      (1, 1, '2022-02-01', 'Completed', 95),
      (1, 2, '2022-03-15', 'Completed', 88),
      (3, 1, '2023-03-01', 'Completed', 92),
      (5, 1, '2021-04-01', 'Completed', 90),
      (7, 6, '2021-02-15', 'Completed', 96),
      (9, 6, '2022-04-01', 'Completed', 89)
    `);

    // 10. Check final counts
    console.log('\\n📊 Final Data Summary:');
    const finalCounts = await Promise.all([
      client.query('SELECT COUNT(*) FROM employees'),
      client.query('SELECT COUNT(*) FROM time_entries'),
      client.query('SELECT COUNT(*) FROM leave_requests'),
      client.query('SELECT COUNT(*) FROM performance_reviews'),
      client.query('SELECT COUNT(*) FROM performance_goals'),
      client.query('SELECT COUNT(*) FROM job_postings'),
      client.query('SELECT COUNT(*) FROM applications')
    ]);

    console.log(`   👥 Employees: ${finalCounts[0].rows[0].count}`);
    console.log(`   ⏰ Time Entries: ${finalCounts[1].rows[0].count}`);
    console.log(`   🏖️ Leave Requests: ${finalCounts[2].rows[0].count}`);
    console.log(`   🎯 Performance Reviews: ${finalCounts[3].rows[0].count}`);
    console.log(`   🎯 Performance Goals: ${finalCounts[4].rows[0].count}`);
    console.log(`   💼 Job Postings: ${finalCounts[5].rows[0].count}`);
    console.log(`   📝 Applications: ${finalCounts[6].rows[0].count}`);

    console.log('\n🎉 Mock data loading complete! All dashboard analytics should now have data.');

  } catch (error) {
    console.error('❌ Error loading mock data:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

loadMockData();

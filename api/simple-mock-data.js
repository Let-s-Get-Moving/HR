#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function loadSimpleMockData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Loading simple mock data for existing employees...\n');

    // Get existing employees
    const employees = await client.query('SELECT id, first_name, last_name FROM employees LIMIT 10');
    console.log(`Found ${employees.rows.length} existing employees`);

    // 1. Add time entries for existing employees
    console.log('⏰ Adding time entries...');
    for (const emp of employees.rows) {
      await client.query(`
        INSERT INTO time_entries (employee_id, work_date, clock_in, clock_out, was_late, left_early, overtime_hours) VALUES
        ($1, '2025-09-10', '2025-09-10 08:30:00', '2025-09-10 17:00:00', false, false, 0.5),
        ($1, '2025-09-11', '2025-09-11 09:00:00', '2025-09-11 17:30:00', true, false, 0.5),
        ($1, '2025-09-12', '2025-09-12 08:00:00', '2025-09-12 16:30:00', false, true, 0)
      `, [emp.id]);
    }

    // 2. Add some leave requests
    console.log('🏖️ Adding leave requests...');
    if (employees.rows.length >= 3) {
      await client.query(`
        INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, status) VALUES
        ($1, 1, '2025-10-15', '2025-10-19', 5, 'Family vacation', 'Approved'),
        ($2, 1, '2025-12-23', '2025-12-30', 6, 'Holiday break', 'Pending'),
        ($3, 1, '2025-09-20', '2025-09-20', 1, 'Doctor appointment', 'Approved')
      `, [employees.rows[0].id, employees.rows[1].id, employees.rows[2].id]);
    }

    // 3. Add performance reviews
    console.log('🎯 Adding performance reviews...');
    if (employees.rows.length >= 2) {
      await client.query(`
        INSERT INTO performance_reviews (employee_id, reviewer_id, review_period, overall_rating, strengths, areas_for_improvement, goals_for_next_period, review_date) VALUES
        ($1, $2, 'Q2 2025', 4.5, 'Excellent technical skills, great teamwork', 'Could improve documentation', 'Lead mobile app project', '2025-07-15'),
        ($2, $1, 'Q2 2025', 4.2, 'Strong problem-solving skills', 'Needs better time management', 'Complete advanced training', '2025-07-20')
      `, [employees.rows[0].id, employees.rows[1].id]);
    }

    // 4. Add performance goals
    console.log('🎯 Adding performance goals...');
    for (let i = 0; i < Math.min(3, employees.rows.length); i++) {
      await client.query(`
        INSERT INTO performance_goals (employee_id, goal_title, goal_description, target_date, priority, status) VALUES
        ($1, 'Professional Development', 'Complete advanced training program', '2025-12-31', 'High', 'In Progress')
      `, [employees.rows[i].id]);
    }

    // 5. Add job postings
    console.log('💼 Adding job postings...');
    await client.query(`
      INSERT INTO job_postings (title, department_id, location_id, opened_on, status, budget_cad) VALUES
      ('Software Developer', 160, 1, CURRENT_DATE - INTERVAL '10 days', 'Open', 80000),
      ('Sales Representative', 3, 2, CURRENT_DATE - INTERVAL '5 days', 'Open', 60000)
    `);

    // 6. Skip applications for now due to status constraints
    console.log('📝 Skipping job applications (constraint issues)...');

    // Check final counts
    console.log('\n📊 Final Data Summary:');
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

    console.log('\n🎉 Mock data loading complete! Dashboard should now have data to display.');

  } catch (error) {
    console.error('❌ Error loading mock data:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

loadSimpleMockData();

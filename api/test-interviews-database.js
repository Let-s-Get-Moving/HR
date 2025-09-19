import pkg from 'pg';
const { Pool } = pkg;

// Test the interviews database directly
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
});

async function testInterviewsDatabase() {
  console.log('🧪 Testing Interviews Database...');
  console.log('=====================================\n');

  try {
    // Test 1: Check if interviews table exists
    console.log('1️⃣ Checking if interviews table exists...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'interviews'
      );
    `);
    console.log(`   Table exists: ${tableCheck.rows[0].exists}`);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Interviews table does not exist!');
      return;
    }

    // Test 2: Check table structure
    console.log('\n2️⃣ Checking table structure...');
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'interviews'
      ORDER BY ordinal_position;
    `);
    console.log('   Columns:');
    structure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Test 3: Count existing interviews
    console.log('\n3️⃣ Counting existing interviews...');
    const count = await pool.query('SELECT COUNT(*) FROM interviews');
    console.log(`   Total interviews: ${count.rows[0].count}`);

    // Test 4: Get all interviews
    console.log('\n4️⃣ Fetching all interviews...');
    const interviews = await pool.query(`
      SELECT * FROM interviews
      ORDER BY interview_date DESC, interview_time DESC
    `);
    console.log(`   Found ${interviews.rows.length} interviews:`);
    interviews.rows.forEach((interview, index) => {
      console.log(`   ${index + 1}. ID: ${interview.id}, Date: ${interview.interview_date}, Time: ${interview.interview_time}, Type: ${interview.interview_type}`);
    });

    // Test 5: Create a test interview
    console.log('\n5️⃣ Creating test interview...');
    const newInterview = await pool.query(`
      INSERT INTO interviews 
      (candidate_id, job_posting_id, interview_date, interview_time, interview_type, interviewer_id, location, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [99, 99, '2025-09-28', '16:00', 'Video', 99, 'Test Location', 'Database test interview']);
    
    console.log(`   ✅ Created interview with ID: ${newInterview.rows[0].id}`);

    // Test 6: Verify the new interview
    console.log('\n6️⃣ Verifying new interview...');
    const verify = await pool.query('SELECT * FROM interviews WHERE id = $1', [newInterview.rows[0].id]);
    console.log(`   ✅ Found interview: ${verify.rows[0].interview_type} on ${verify.rows[0].interview_date}`);

    console.log('\n🎉 All database tests passed!');
    console.log('✅ The interviews database is working correctly.');

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await pool.end();
  }
}

testInterviewsDatabase();

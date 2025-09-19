import pkg from 'pg';
const { Pool } = pkg;

// Create connection pool for Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function createInterviewsTable() {
  const client = await pool.connect();
  try {
    console.log('🔄 Creating interviews table...');
    
    // Create interviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS interviews (
        id SERIAL PRIMARY KEY,
        candidate_id INT NOT NULL,
        job_posting_id INT NOT NULL,
        interview_date DATE NOT NULL,
        interview_time TIME NOT NULL,
        interview_type VARCHAR(50) NOT NULL CHECK (interview_type IN ('Phone', 'Video', 'In-person')),
        interviewer_id INT NOT NULL,
        location VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Interviews table created successfully');
    
    // Test insert
    const testResult = await client.query(`
      INSERT INTO interviews 
      (candidate_id, job_posting_id, interview_date, interview_time, interview_type, interviewer_id, location, notes)
      VALUES (1, 1, '2025-09-25', '14:00', 'Video', 1, 'Zoom Meeting', 'Test interview')
      RETURNING *
    `);
    
    console.log('✅ Test insert successful:', testResult.rows[0]);
    
    // Clean up test data
    await client.query('DELETE FROM interviews WHERE notes = $1', ['Test interview']);
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Error creating interviews table:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createInterviewsTable();

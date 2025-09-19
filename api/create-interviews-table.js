#!/usr/bin/env node

/**
 * Create interviews table for recruiting functionality
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
});

async function createInterviewsTable() {
  try {
    console.log('Creating interviews table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interviews (
        id SERIAL PRIMARY KEY,
        candidate_id INTEGER NOT NULL,
        job_posting_id INTEGER NOT NULL,
        interview_date DATE NOT NULL,
        interview_time TIME NOT NULL,
        interview_type VARCHAR(20) NOT NULL CHECK (interview_type IN ('Phone', 'Video', 'In-person')),
        interviewer_id INTEGER NOT NULL,
        location VARCHAR(255),
        notes TEXT,
        status VARCHAR(20) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'No Show')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Interviews table created successfully!');
    
    // Add some sample data
    await pool.query(`
      INSERT INTO interviews (candidate_id, job_posting_id, interview_date, interview_time, interview_type, interviewer_id, location, notes)
      VALUES 
        (1, 1, '2025-01-25', '14:00', 'Video', 1, 'Virtual', 'Initial screening'),
        (2, 1, '2025-01-26', '10:00', 'In-person', 2, 'Office', 'Technical interview')
      ON CONFLICT DO NOTHING;
    `);
    
    console.log('✅ Sample interview data added!');
    
  } catch (error) {
    console.error('Error creating interviews table:', error);
  } finally {
    await pool.end();
  }
}

createInterviewsTable();

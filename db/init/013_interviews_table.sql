-- Create interviews table for recruiting functionality
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

-- Add foreign key constraints (only if tables exist)
DO $$ 
BEGIN
  -- Check if candidates table exists before adding constraint
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidates') THEN
    ALTER TABLE interviews 
    ADD CONSTRAINT fk_interviews_candidate 
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE;
  END IF;
  
  -- Check if job_postings table exists before adding constraint
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_postings') THEN
    ALTER TABLE interviews 
    ADD CONSTRAINT fk_interviews_job_posting 
    FOREIGN KEY (job_posting_id) REFERENCES job_postings(id) ON DELETE CASCADE;
  END IF;
  
  -- Check if employees table exists before adding constraint
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
    ALTER TABLE interviews 
    ADD CONSTRAINT fk_interviews_interviewer 
    FOREIGN KEY (interviewer_id) REFERENCES employees(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_job_posting_id ON interviews(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id ON interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews(interview_date);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);

-- Insert sample data (DISABLED - no mock data)
-- All mock data removed - candidates, job postings, and employees will be created through the app

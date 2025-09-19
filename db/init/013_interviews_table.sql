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

-- Add foreign key constraints
ALTER TABLE interviews 
ADD CONSTRAINT fk_interviews_candidate 
FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE;

ALTER TABLE interviews 
ADD CONSTRAINT fk_interviews_job_posting 
FOREIGN KEY (job_posting_id) REFERENCES job_postings(id) ON DELETE CASCADE;

ALTER TABLE interviews 
ADD CONSTRAINT fk_interviews_interviewer 
FOREIGN KEY (interviewer_id) REFERENCES employees(id) ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_job_posting_id ON interviews(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id ON interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews(interview_date);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);

-- Insert sample data
INSERT INTO interviews (candidate_id, job_posting_id, interview_date, interview_time, interview_type, interviewer_id, location, notes)
VALUES 
  (1, 1, '2025-01-25', '14:00', 'Video', 1, 'Virtual', 'Initial screening interview'),
  (2, 1, '2025-01-26', '10:00', 'In-person', 2, 'Office Conference Room A', 'Technical interview'),
  (3, 2, '2025-01-27', '15:30', 'Phone', 3, 'Phone Call', 'HR screening'),
  (1, 2, '2025-01-28', '09:00', 'Video', 1, 'Virtual', 'Final interview')
ON CONFLICT DO NOTHING;

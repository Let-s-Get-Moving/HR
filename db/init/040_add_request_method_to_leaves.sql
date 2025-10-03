-- Add request_method field to track how employees communicated leave requests
-- This helps HR keep better records of communication channels

ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS request_method TEXT 
CHECK (request_method IN ('Email', 'Phone', 'In-Person', 'Slack', 'Written', 'Other'));

-- Add comment for documentation
COMMENT ON COLUMN leave_requests.request_method IS 'How the employee communicated the leave request to HR';

-- Create index for reporting
CREATE INDEX IF NOT EXISTS idx_leave_requests_method ON leave_requests(request_method);


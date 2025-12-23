-- Clean all leave records from database
-- This removes all leave requests and leave entries that appear in the calendar
-- Does NOT delete leave_types, leave_policies, leave_balances, or leave_calendar (holidays)

-- Delete all leave requests
DELETE FROM leave_requests;

-- Delete all leaves (older table, still used for calendar display)
DELETE FROM leaves;

-- Reset sequences to start from 1 (optional, but clean)
ALTER SEQUENCE IF EXISTS leave_requests_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS leaves_id_seq RESTART WITH 1;


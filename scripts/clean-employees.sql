-- Clean ALL employees from the database
-- WARNING: This is destructive and will cascade delete all related data

BEGIN;

-- Show current counts
SELECT 'Before deletion:' as status;
SELECT COUNT(*) as employee_count FROM employees;

-- Delete all employees (cascades to related tables)
DELETE FROM employees;

-- Reset sequence
ALTER SEQUENCE employees_id_seq RESTART WITH 1;

-- Show final counts
SELECT 'After deletion:' as status;
SELECT COUNT(*) as employee_count FROM employees;

-- Check key related tables
SELECT 'time_entries:' as table_name, COUNT(*) as count FROM time_entries
UNION ALL
SELECT 'timecards:', COUNT(*) FROM timecards
UNION ALL
SELECT 'timecard_entries:', COUNT(*) FROM timecard_entries
UNION ALL
SELECT 'payroll_calculations:', COUNT(*) FROM payroll_calculations
UNION ALL
SELECT 'agent_commission:', COUNT(*) FROM agent_commission
UNION ALL
SELECT 'employee_commission_monthly:', COUNT(*) FROM employee_commission_monthly
UNION ALL
SELECT 'hourly_payout:', COUNT(*) FROM hourly_payout;

COMMIT;

SELECT '✅ All employees deleted successfully!' as result;


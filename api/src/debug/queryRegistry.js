// Map keys to safe SQL templates you want to examine.
// Use $1, $2 binds; never accept raw SQL from user input here.
export const queryRegistry = {
  timecardsByGroupAndRange: {
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
      SELECT *
      FROM timecards
      WHERE app_norm(group_name) = app_norm($1)
        AND period_start >= $2 AND period_start < $3
      ORDER BY period_start DESC
      LIMIT 200
    `,
    params: ['group', 'start', 'end'], // Documentation
    description: 'Timecards filtered by normalized group and date range'
  },
  
  commissionsByGroupAndPeriod: {
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
      SELECT *
      FROM commissions
      WHERE app_norm(group_name) = app_norm($1)
        AND period_id = $2
      LIMIT 500
    `,
    params: ['group', 'period_id'],
    description: 'Commissions by normalized group and period'
  },
  
  employeesByName: {
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
      SELECT id, first_name, last_name, email, status
      FROM employees
      WHERE full_name ILIKE '%' || $1 || '%'
      LIMIT 50
    `,
    params: ['search_term'],
    description: 'Employee search by name (trigram index candidate)'
  },
  
  payrollByPeriod: {
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
      SELECT p.*, e.first_name, e.last_name
      FROM payroll p
      LEFT JOIN employees e ON e.id = p.employee_id
      WHERE p.period_start >= $1 AND p.period_start < $2
      ORDER BY p.period_start DESC, e.last_name
      LIMIT 200
    `,
    params: ['start', 'end'],
    description: 'Payroll records with employee join by date range'
  },
  
  uploadVerification: {
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
      SELECT upload_id, COUNT(*) as count, 
             MIN(created_at) as first_row, 
             MAX(created_at) as last_row
      FROM probe_table
      WHERE upload_id = $1
      GROUP BY upload_id
    `,
    params: ['upload_id'],
    description: 'Verify uploaded data visibility'
  }
};

// Helper to list all available query keys
export function listQueryKeys() {
  return Object.entries(queryRegistry).map(([key, config]) => ({
    key,
    description: config.description,
    params: config.params
  }));
}


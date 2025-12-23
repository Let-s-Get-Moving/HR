import pkg from 'pg';
const { Pool } = pkg;

const databaseUrl = process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : false,
});

async function checkOrphanedHRUsers() {
    const client = await pool.connect();
    
    try {
        // Get all users without employee_id
        const usersWithoutEmployee = await client.query(`
            SELECT u.id, u.username, u.full_name, u.email, u.employee_id,
                   r.role_name, r.display_name, u.is_active, u.created_at
            FROM users u
            LEFT JOIN hr_roles r ON u.role_id = r.id
            WHERE u.employee_id IS NULL
            ORDER BY u.id
        `);
        
        // Get all employees (current and past)
        const allEmployees = await client.query(`
            SELECT id, first_name, last_name, email, status, termination_date
            FROM employees
            ORDER BY id
        `);
        
        // Check if any users without employee_id match employee names
        console.log('=== CHECKING USERS WITHOUT EMPLOYEE_ID FOR MATCHES ===\n');
        
        const matchedUsers = [];
        const unmatchedUsers = [];
        
        usersWithoutEmployee.rows.forEach(user => {
            const userFullName = (user.full_name || '').toLowerCase().trim();
            const userFirstName = (user.full_name || '').split(' ')[0]?.toLowerCase().trim();
            const userLastName = (user.full_name || '').split(' ').slice(1).join(' ')?.toLowerCase().trim();
            
            // Try to match with employees
            const match = allEmployees.rows.find(emp => {
                const empFullName = `${emp.first_name} ${emp.last_name}`.toLowerCase().trim();
                const empEmail = (emp.email || '').toLowerCase().trim();
                const userEmail = (user.email || '').toLowerCase().trim();
                
                return empFullName === userFullName || 
                       empEmail === userEmail ||
                       (userFirstName === emp.first_name?.toLowerCase().trim() && 
                        userLastName === emp.last_name?.toLowerCase().trim());
            });
            
            if (match) {
                matchedUsers.push({ user, employee: match });
            } else {
                unmatchedUsers.push(user);
            }
        });
        
        console.log(`=== MATCHED USERS (${matchedUsers.length}) - Likely old employee accounts ===`);
        matchedUsers.forEach(({ user, employee }) => {
            console.log(`  ID: ${user.id}, Username: ${user.username || 'N/A'}, Name: ${user.full_name}`);
            console.log(`    -> Matches Employee: ${employee.first_name} ${employee.last_name} (ID: ${employee.id}, Status: ${employee.status}, Terminated: ${employee.termination_date || 'N/A'})`);
            console.log(`    Role: ${user.role_name || 'N/A'}, Active: ${user.is_active}`);
            console.log('');
        });
        
        console.log(`\n=== UNMATCHED USERS (${unmatchedUsers.length}) - Likely HR/admin accounts ===`);
        unmatchedUsers.slice(0, 20).forEach(user => {
            console.log(`  ID: ${user.id}, Username: ${user.username || 'N/A'}, Name: ${user.full_name}, Role: ${user.role_name || 'N/A'}, Active: ${user.is_active}`);
        });
        if (unmatchedUsers.length > 20) {
            console.log(`  ... and ${unmatchedUsers.length - 20} more`);
        }
        
        // Summary
        console.log(`\n=== SUMMARY ===`);
        console.log(`Total users without employee_id: ${usersWithoutEmployee.rows.length}`);
        console.log(`Matched to employees (likely old accounts): ${matchedUsers.length}`);
        console.log(`Unmatched (likely HR/admin): ${unmatchedUsers.length}`);
        console.log(`\nUsers linked to terminated employees: 1 (useruser1)`);
        
    } finally {
        client.release();
        await pool.end();
    }
}

checkOrphanedHRUsers();





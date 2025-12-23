import pkg from 'pg';
const { Pool } = pkg;

const databaseUrl = process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : false,
});

async function checkUserEmployeeStatus() {
    const client = await pool.connect();
    
    try {
        // Check users linked to terminated employees
        const terminated = await client.query(`
            SELECT u.id, u.username, u.full_name, u.email, u.employee_id, 
                   e.first_name, e.last_name, e.status, e.termination_date
            FROM users u
            JOIN employees e ON u.employee_id = e.id
            WHERE e.status = 'Terminated'
            ORDER BY u.id
        `);
        
        // Check all users with employee_id and their employee status
        const allLinked = await client.query(`
            SELECT u.id, u.username, u.full_name, u.email, u.employee_id,
                   e.first_name, e.last_name, e.status, e.termination_date,
                   e.hire_date
            FROM users u
            LEFT JOIN employees e ON u.employee_id = e.id
            WHERE u.employee_id IS NOT NULL
            ORDER BY e.status, u.id
        `);
        
        // Check users without employee_id
        const hrUsers = await client.query(`
            SELECT u.id, u.username, u.full_name, u.email, u.employee_id,
                   r.role_name, r.display_name
            FROM users u
            LEFT JOIN hr_roles r ON u.role_id = r.id
            WHERE u.employee_id IS NULL
            ORDER BY u.id
        `);
        
        console.log('=== USERS LINKED TO TERMINATED EMPLOYEES ===');
        console.log(`Count: ${terminated.rows.length}`);
        terminated.rows.forEach(u => {
            console.log(`  ID: ${u.id}, Username: ${u.username || 'N/A'}, Name: ${u.full_name}, Employee: ${u.first_name} ${u.last_name} (Status: ${u.status}, Terminated: ${u.termination_date})`);
        });
        
        console.log(`\n=== ALL USERS WITH EMPLOYEE_ID (by status) ===`);
        console.log(`Total: ${allLinked.rows.length}`);
        const byStatus = {};
        allLinked.rows.forEach(u => {
            const status = u.status || 'NO_EMPLOYEE';
            if (!byStatus[status]) byStatus[status] = [];
            byStatus[status].push(u);
        });
        Object.keys(byStatus).forEach(status => {
            console.log(`\n  Status: ${status} (${byStatus[status].length} users)`);
            byStatus[status].slice(0, 5).forEach(u => {
                console.log(`    - ${u.username || u.full_name || u.email} -> ${u.first_name || ''} ${u.last_name || ''} (Term: ${u.termination_date || 'N/A'})`);
            });
            if (byStatus[status].length > 5) console.log(`    ... and ${byStatus[status].length - 5} more`);
        });
        
        console.log(`\n=== HR/ADMIN USERS (no employee_id) ===`);
        console.log(`Count: ${hrUsers.rows.length}`);
        hrUsers.rows.slice(0, 10).forEach(u => {
            console.log(`  ID: ${u.id}, Username: ${u.username || 'N/A'}, Name: ${u.full_name}, Role: ${u.role_name || 'N/A'}`);
        });
        if (hrUsers.rows.length > 10) console.log(`  ... and ${hrUsers.rows.length - 10} more`);
        
    } finally {
        client.release();
        await pool.end();
    }
}

checkUserEmployeeStatus();





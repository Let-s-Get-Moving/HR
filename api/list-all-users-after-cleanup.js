import pkg from 'pg';
const { Pool } = pkg;

const databaseUrl = process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : false,
});

async function listAllUsers() {
    const client = await pool.connect();
    
    try {
        // Get all remaining users
        const allUsers = await client.query(`
            SELECT u.id, u.username, u.full_name, u.email, u.employee_id, u.is_active,
                   r.role_name, r.display_name as role_display,
                   e.first_name as emp_first_name, e.last_name as emp_last_name, 
                   e.status as emp_status, e.termination_date
            FROM users u
            LEFT JOIN hr_roles r ON u.role_id = r.id
            LEFT JOIN employees e ON u.employee_id = e.id
            ORDER BY u.employee_id NULLS LAST, u.id
        `);
        
        // Get all employees
        const allEmployees = await client.query(`
            SELECT id, first_name, last_name, email, status, termination_date, hire_date
            FROM employees
            ORDER BY id
        `);
        
        console.log('=== REMAINING USERS IN DATABASE ===\n');
        console.log(`Total users: ${allUsers.rows.length}\n`);
        
        const usersWithEmployee = allUsers.rows.filter(u => u.employee_id);
        const usersWithoutEmployee = allUsers.rows.filter(u => !u.employee_id);
        
        console.log(`=== USERS WITH EMPLOYEE_ID (${usersWithEmployee.length}) ===`);
        usersWithEmployee.forEach(u => {
            console.log(`  ID: ${u.id}`);
            console.log(`    Username: ${u.username || 'N/A'}`);
            console.log(`    Name: ${u.full_name || 'N/A'}`);
            console.log(`    Email: ${u.email || 'N/A'}`);
            console.log(`    Employee ID: ${u.employee_id}`);
            console.log(`    Employee: ${u.emp_first_name || ''} ${u.emp_last_name || ''} (Status: ${u.emp_status || 'N/A'})`);
            console.log(`    Role: ${u.role_name || 'N/A'} (${u.role_display || 'N/A'})`);
            console.log(`    Active: ${u.is_active}`);
            console.log('');
        });
        
        console.log(`\n=== USERS WITHOUT EMPLOYEE_ID (${usersWithoutEmployee.length}) ===`);
        usersWithoutEmployee.forEach(u => {
            console.log(`  ID: ${u.id}`);
            console.log(`    Username: ${u.username || 'N/A'}`);
            console.log(`    Name: ${u.full_name || 'N/A'}`);
            console.log(`    Email: ${u.email || 'N/A'}`);
            console.log(`    Role: ${u.role_name || 'N/A'} (${u.role_display || 'N/A'})`);
            console.log(`    Active: ${u.is_active}`);
            console.log('');
        });
        
        console.log(`\n=== ALL EMPLOYEES IN DATABASE (${allEmployees.rows.length}) ===`);
        allEmployees.rows.forEach(emp => {
            console.log(`  ID: ${emp.id}, Name: ${emp.first_name} ${emp.last_name}, Email: ${emp.email}, Status: ${emp.status}, Hire: ${emp.hire_date}, Terminated: ${emp.termination_date || 'N/A'}`);
        });
        
    } finally {
        client.release();
        await pool.end();
    }
}

listAllUsers();


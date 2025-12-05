import pkg from 'pg';
const { Pool } = pkg;

const databaseUrl = process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : false,
});

async function removeInvalidUsers() {
    let client;
    
    try {
        console.log('🔌 Connecting to database...');
        client = await pool.connect();
        console.log('✅ Connected!\n');

        // Start transaction
        await client.query('BEGIN');

        // Get current user counts
        console.log('📊 Current database status:');
        const totalUsers = await client.query('SELECT COUNT(*) FROM users');
        const usersWithEmployeeId = await client.query('SELECT COUNT(*) FROM users WHERE employee_id IS NOT NULL');
        const usersWithoutEmployeeId = await client.query('SELECT COUNT(*) FROM users WHERE employee_id IS NULL');
        const totalEmployees = await client.query('SELECT COUNT(*) FROM employees');

        console.log(`  - Total users: ${totalUsers.rows[0].count}`);
        console.log(`  - Users with employee_id: ${usersWithEmployeeId.rows[0].count}`);
        console.log(`  - Users without employee_id (HR/admin): ${usersWithoutEmployeeId.rows[0].count}`);
        console.log(`  - Total employees: ${totalEmployees.rows[0].count}\n`);

        // Get all employees for matching
        const allEmployees = await client.query('SELECT id, first_name, last_name, email, status FROM employees');
        
        // Identify invalid users:
        // 1. Users with employee_id pointing to non-existent employees (orphaned)
        // 2. Users linked to terminated employees
        // 3. Users without employee_id that don't match any employees (old accounts)
        console.log('🔍 Identifying invalid users...');
        
        // 1. Orphaned users (employee_id pointing to non-existent employee)
        const orphanedUsersQuery = `
            SELECT u.id, u.username, u.full_name, u.email, u.employee_id, u.is_active,
                   r.role_name, r.display_name as role_display, 'orphaned' as reason
            FROM users u
            LEFT JOIN employees e ON u.employee_id = e.id
            LEFT JOIN hr_roles r ON u.role_id = r.id
            WHERE u.employee_id IS NOT NULL 
              AND e.id IS NULL
            ORDER BY u.id
        `;
        const orphanedResult = await client.query(orphanedUsersQuery);
        
        // 2. Users linked to terminated employees
        const terminatedUsersQuery = `
            SELECT u.id, u.username, u.full_name, u.email, u.employee_id, u.is_active,
                   r.role_name, r.display_name as role_display, 
                   e.status, e.termination_date, 'terminated' as reason
            FROM users u
            JOIN employees e ON u.employee_id = e.id
            LEFT JOIN hr_roles r ON u.role_id = r.id
            WHERE e.status = 'Terminated'
            ORDER BY u.id
        `;
        const terminatedResult = await client.query(terminatedUsersQuery);
        
        // 3. Users without employee_id that don't match any employees
        const usersWithoutEmployee = await client.query(`
            SELECT u.id, u.username, u.full_name, u.email, u.employee_id, u.is_active,
                   r.role_name, r.display_name as role_display
            FROM users u
            LEFT JOIN hr_roles r ON u.role_id = r.id
            WHERE u.employee_id IS NULL
            ORDER BY u.id
        `);
        
        // Check which users without employee_id match employees
        const unmatchedUsers = [];
        usersWithoutEmployee.rows.forEach(user => {
            const userFullName = (user.full_name || '').toLowerCase().trim();
            const userFirstName = (user.full_name || '').split(' ')[0]?.toLowerCase().trim();
            const userLastName = (user.full_name || '').split(' ').slice(1).join(' ')?.toLowerCase().trim();
            const userEmail = (user.email || '').toLowerCase().trim();
            
            const match = allEmployees.rows.find(emp => {
                const empFullName = `${emp.first_name} ${emp.last_name}`.toLowerCase().trim();
                const empEmail = (emp.email || '').toLowerCase().trim();
                
                return empFullName === userFullName || 
                       empEmail === userEmail ||
                       (userFirstName === emp.first_name?.toLowerCase().trim() && 
                        userLastName === emp.last_name?.toLowerCase().trim());
            });
            
            if (!match) {
                unmatchedUsers.push({ ...user, reason: 'no_employee_match' });
            }
        });
        
        // Combine all invalid users
        const invalidUsers = [
            ...orphanedResult.rows,
            ...terminatedResult.rows,
            ...unmatchedUsers
        ];

        if (invalidUsers.length === 0) {
            console.log('✅ No invalid users found. All users are valid.\n');
            await client.query('ROLLBACK');
            return;
        }

        // Preview invalid users
        console.log(`⚠️  Found ${invalidUsers.length} invalid user(s) to delete:\n`);
        
        if (orphanedResult.rows.length > 0) {
            console.log(`  Category 1: Orphaned users (employee_id points to non-existent employee) - ${orphanedResult.rows.length}`);
            orphanedResult.rows.forEach((user, index) => {
                console.log(`    ${index + 1}. ID: ${user.id}, Username: ${user.username || 'N/A'}, Name: ${user.full_name}, Employee ID: ${user.employee_id} (orphaned)`);
            });
            console.log('');
        }
        
        if (terminatedResult.rows.length > 0) {
            console.log(`  Category 2: Users linked to terminated employees - ${terminatedResult.rows.length}`);
            terminatedResult.rows.forEach((user, index) => {
                console.log(`    ${index + 1}. ID: ${user.id}, Username: ${user.username || 'N/A'}, Name: ${user.full_name}, Employee: Terminated on ${user.termination_date || 'N/A'}`);
            });
            console.log('');
        }
        
        if (unmatchedUsers.length > 0) {
            console.log(`  Category 3: Users without employee_id that don't match any employees - ${unmatchedUsers.length}`);
            unmatchedUsers.slice(0, 10).forEach((user, index) => {
                console.log(`    ${index + 1}. ID: ${user.id}, Username: ${user.username || 'N/A'}, Name: ${user.full_name}, Role: ${user.role_name || 'N/A'}`);
            });
            if (unmatchedUsers.length > 10) {
                console.log(`    ... and ${unmatchedUsers.length - 10} more`);
            }
            console.log('');
        }

        console.log('⚠️  WARNING: This will DELETE the above users and all related data!');
        console.log('⚠️  Related data that will be automatically deleted (CASCADE):');
        console.log('     - User sessions');
        console.log('     - User permissions');
        console.log('     - User activity logs');
        console.log('     - MFA secrets');
        console.log('     - Trusted devices');
        console.log('     - Notifications');
        console.log('     - Chat messages and threads');
        console.log('     - Other related records\n');

        // Delete invalid users
        console.log('🗑️  Deleting invalid users...');
        
        const userIdsToDelete = invalidUsers.map(u => u.id);
        const deleteQuery = `DELETE FROM users WHERE id = ANY($1::int[])`;
        const deleteResult = await client.query(deleteQuery, [userIdsToDelete]);
        const deletedCount = deleteResult.rowCount;

        // Verify deletion - check all three categories
        const verifyOrphaned = await client.query(`
            SELECT COUNT(*) as count
            FROM users u
            LEFT JOIN employees e ON u.employee_id = e.id
            WHERE u.employee_id IS NOT NULL 
              AND e.id IS NULL
        `);
        
        const verifyTerminated = await client.query(`
            SELECT COUNT(*) as count
            FROM users u
            JOIN employees e ON u.employee_id = e.id
            WHERE e.status = 'Terminated'
        `);
        
        // Re-check unmatched users
        const remainingUsersWithoutEmployee = await client.query(`
            SELECT u.id, u.full_name, u.email
            FROM users u
            WHERE u.employee_id IS NULL
        `);
        const allEmployeesAfter = await client.query('SELECT first_name, last_name, email FROM employees');
        let remainingUnmatched = 0;
        remainingUsersWithoutEmployee.rows.forEach(user => {
            const userFullName = (user.full_name || '').toLowerCase().trim();
            const userEmail = (user.email || '').toLowerCase().trim();
            const match = allEmployeesAfter.rows.find(emp => {
                const empFullName = `${emp.first_name} ${emp.last_name}`.toLowerCase().trim();
                const empEmail = (emp.email || '').toLowerCase().trim();
                return empFullName === userFullName || empEmail === userEmail;
            });
            if (!match) remainingUnmatched++;
        });

        if (verifyOrphaned.rows[0].count > 0 || verifyTerminated.rows[0].count > 0 || remainingUnmatched > 0) {
            console.warn(`⚠️  Warning: Some invalid users may still exist:`);
            console.warn(`   - Orphaned: ${verifyOrphaned.rows[0].count}`);
            console.warn(`   - Terminated: ${verifyTerminated.rows[0].count}`);
            console.warn(`   - Unmatched: ${remainingUnmatched}`);
        }

        // Commit transaction
        await client.query('COMMIT');

        // Final summary
        console.log('\n✅ Cleanup complete!');
        console.log(`   - Deleted ${deletedCount} invalid user(s)`);
        console.log(`   - Breakdown:`);
        console.log(`     • Orphaned users: ${orphanedResult.rows.length}`);
        console.log(`     • Terminated employee users: ${terminatedResult.rows.length}`);
        console.log(`     • Unmatched users (no employee_id, no match): ${unmatchedUsers.length}`);
        console.log(`\n   - Deleted users (first 20):`);
        invalidUsers.slice(0, 20).forEach((user) => {
            console.log(`     • ${user.username || user.full_name || user.email || `ID ${user.id}`} (${user.reason || 'unknown'})`);
        });
        if (invalidUsers.length > 20) {
            console.log(`     ... and ${invalidUsers.length - 20} more`);
        }
        
        // Verify HR/admin users are preserved
        const hrUsersAfter = await client.query('SELECT COUNT(*) FROM users WHERE employee_id IS NULL');
        console.log(`\n✅ HR/admin users preserved: ${hrUsersAfter.rows[0].count} user(s) without employee_id`);
        
        // Final counts
        const finalTotalUsers = await client.query('SELECT COUNT(*) FROM users');
        console.log(`\n📊 Final database status:`);
        console.log(`   - Total users remaining: ${finalTotalUsers.rows[0].count}`);
        console.log(`   - HR/admin users: ${hrUsersAfter.rows[0].count}`);
        console.log(`   - Employee-linked users: ${parseInt(finalTotalUsers.rows[0].count) - parseInt(hrUsersAfter.rows[0].count)}`);

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('\n❌ Error during cleanup:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

removeInvalidUsers()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });


import pkg from 'pg';
const { Pool } = pkg;

async function transferTimecardsAndDeleteEmployee() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('❌ DATABASE_URL environment variable is not set.');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : false,
    });

    let client;
    try {
        console.log('🔌 Connecting to database...');
        client = await pool.connect();
        console.log('✅ Connected!');

        // Step 1: Find both employees
        console.log('\n📋 Step 1: Finding employees...');
        
        const sourceName = 'Simranjit Singh';
        const targetName = 'Simranjit Rikhra';
        
        // Find source employee (Simranjit Singh)
        const sourceResult = await client.query(
            `SELECT id, first_name, last_name, email 
             FROM employees 
             WHERE LOWER(TRIM(first_name || ' ' || last_name)) = LOWER(TRIM($1))
             LIMIT 1`,
            [sourceName]
        );
        
        if (sourceResult.rows.length === 0) {
            console.error(`❌ Source employee "${sourceName}" not found.`);
            process.exit(1);
        }
        
        const sourceEmployee = sourceResult.rows[0];
        console.log(`   ✓ Found source employee: ${sourceEmployee.first_name} ${sourceEmployee.last_name} (ID: ${sourceEmployee.id})`);
        
        // Find target employee (Simrajit Rikhra)
        const targetResult = await client.query(
            `SELECT id, first_name, last_name, email 
             FROM employees 
             WHERE LOWER(TRIM(first_name || ' ' || last_name)) = LOWER(TRIM($1))
             LIMIT 1`,
            [targetName]
        );
        
        if (targetResult.rows.length === 0) {
            console.error(`❌ Target employee "${targetName}" not found.`);
            process.exit(1);
        }
        
        const targetEmployee = targetResult.rows[0];
        console.log(`   ✓ Found target employee: ${targetEmployee.first_name} ${targetEmployee.last_name} (ID: ${targetEmployee.id})`);

        // Step 2: Check for conflicts
        console.log('\n📊 Step 2: Checking for timecard conflicts...');
        
        const sourceTimecards = await client.query(
            `SELECT id, pay_period_start, pay_period_end, total_hours, overtime_hours, status
             FROM timecards 
             WHERE employee_id = $1
             ORDER BY pay_period_start`,
            [sourceEmployee.id]
        );
        
        console.log(`   - Source employee has ${sourceTimecards.rows.length} timecard(s)`);
        
        if (sourceTimecards.rows.length === 0) {
            console.log('   ⚠️  No timecards to transfer.');
        } else {
            // Check for conflicts with target employee
            const conflictPeriods = [];
            for (const timecard of sourceTimecards.rows) {
                const conflictCheck = await client.query(
                    `SELECT id FROM timecards 
                     WHERE employee_id = $1 
                     AND pay_period_start = $2 
                     AND pay_period_end = $3`,
                    [targetEmployee.id, timecard.pay_period_start, timecard.pay_period_end]
                );
                
                if (conflictCheck.rows.length > 0) {
                    conflictPeriods.push({
                        period: `${timecard.pay_period_start} to ${timecard.pay_period_end}`,
                        sourceId: timecard.id,
                        targetId: conflictCheck.rows[0].id
                    });
                }
            }
            
            if (conflictPeriods.length > 0) {
                console.log(`   ⚠️  Found ${conflictPeriods.length} conflicting pay period(s):`);
                conflictPeriods.forEach(conflict => {
                    console.log(`      - ${conflict.period}`);
                });
                console.log('   → Will skip conflicting periods (target employee already has timecards for these periods)');
            } else {
                console.log('   ✓ No conflicts found - all timecards can be transferred');
            }
        }

        // Step 3: Transfer timecards
        console.log('\n🔄 Step 3: Transferring timecards...');
        
        let transferred = 0;
        let skipped = 0;
        
        if (sourceTimecards.rows.length === 0) {
            console.log('   → No timecards to transfer');
        } else {
            
            await client.query('BEGIN');
            
            try {
                for (const timecard of sourceTimecards.rows) {
                    // Check if target already has a timecard for this period
                    const conflictCheck = await client.query(
                        `SELECT id FROM timecards 
                         WHERE employee_id = $1 
                         AND pay_period_start = $2 
                         AND pay_period_end = $3`,
                        [targetEmployee.id, timecard.pay_period_start, timecard.pay_period_end]
                    );
                    
                    if (conflictCheck.rows.length > 0) {
                        console.log(`   ⏭️  Skipping period ${timecard.pay_period_start} to ${timecard.pay_period_end} (conflict)`);
                        skipped++;
                        continue;
                    }
                    
                    // Update timecard employee_id
                    await client.query(
                        `UPDATE timecards 
                         SET employee_id = $1, updated_at = CURRENT_TIMESTAMP
                         WHERE id = $2`,
                        [targetEmployee.id, timecard.id]
                    );
                    
                    transferred++;
                    console.log(`   ✓ Transferred timecard ${timecard.id} (${timecard.pay_period_start} to ${timecard.pay_period_end})`);
                }
                
                await client.query('COMMIT');
                console.log(`\n   ✅ Transferred ${transferred} timecard(s), skipped ${skipped} conflicting period(s)`);
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        }

        // Step 4: Transfer timecard entries
        console.log('\n🔄 Step 4: Transferring timecard entries...');
        
        const sourceEntries = await client.query(
            `SELECT COUNT(*) as count FROM timecard_entries WHERE employee_id = $1`,
            [sourceEmployee.id]
        );
        
        const entryCount = parseInt(sourceEntries.rows[0].count);
        console.log(`   - Found ${entryCount} timecard entry/entries for source employee`);
        
        if (entryCount > 0) {
            const updateResult = await client.query(
                `UPDATE timecard_entries 
                 SET employee_id = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE employee_id = $2`,
                [targetEmployee.id, sourceEmployee.id]
            );
            
            console.log(`   ✅ Transferred ${updateResult.rowCount} timecard entry/entries`);
        } else {
            console.log('   → No timecard entries to transfer');
        }

        // Step 5: Handle user record (if exists)
        console.log('\n👤 Step 5: Checking for user account...');
        
        const userCheck = await client.query(
            `SELECT id, username, email, employee_id FROM users WHERE employee_id = $1`,
            [sourceEmployee.id]
        );
        
        if (userCheck.rows.length > 0) {
            const user = userCheck.rows[0];
            console.log(`   - Found user account: ${user.username || user.email} (ID: ${user.id})`);
            console.log('   → Deleting user account (required before deleting employee)...');
            
            const deleteUserResult = await client.query(
                `DELETE FROM users WHERE id = $1`,
                [user.id]
            );
            
            if (deleteUserResult.rowCount > 0) {
                console.log(`   ✅ Deleted user account`);
            }
        } else {
            console.log('   → No user account found for this employee');
        }

        // Step 6: Delete source employee
        console.log('\n🗑️  Step 6: Deleting source employee...');
        console.log(`   ⚠️  This will delete employee "${sourceEmployee.first_name} ${sourceEmployee.last_name}" (ID: ${sourceEmployee.id})`);
        console.log('   ⚠️  Related data will be cascade deleted due to foreign key constraints');
        
        const deleteResult = await client.query(
            `DELETE FROM employees WHERE id = $1`,
            [sourceEmployee.id]
        );
        
        if (deleteResult.rowCount > 0) {
            console.log(`   ✅ Successfully deleted employee "${sourceEmployee.first_name} ${sourceEmployee.last_name}"`);
        } else {
            console.log('   ⚠️  Employee was not deleted (may have been deleted already)');
        }

        // Summary
        console.log('\n✅ Transfer complete!');
        console.log(`   - Timecards transferred: ${transferred}`);
        if (skipped > 0) {
            console.log(`   - Timecards skipped (conflicts): ${skipped}`);
        }
        console.log(`   - Timecard entries transferred: ${entryCount}`);
        console.log(`   - Source employee deleted: ${sourceEmployee.first_name} ${sourceEmployee.last_name}`);
        console.log(`   - All data now belongs to: ${targetEmployee.first_name} ${targetEmployee.last_name}`);

    } catch (error) {
        console.error('❌ Transfer failed:', error);
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                // Ignore rollback errors
            }
        }
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

transferTimecardsAndDeleteEmployee();


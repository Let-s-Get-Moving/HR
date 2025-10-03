/**
 * Fix all employee emails to use correct format:
 * firstname@letsgetmovinggroup.com
 * 
 * Excludes: admin accounts, hr accounts, test accounts
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixEmployeeEmails() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking existing employee emails...\n');
    
    // Get current employee emails
    const beforeResult = await client.query(`
      SELECT id, first_name, last_name, email, 
             LOWER(first_name) || '@letsgetmovinggroup.com' as new_email
      FROM employees
      WHERE status <> 'Terminated'
        AND email NOT ILIKE '%admin%'
        AND email NOT ILIKE '%test%'
      ORDER BY id
    `);
    
    console.log(`Found ${beforeResult.rows.length} employees to check\n`);
    
    // Show first 10 examples
    console.log('📋 Sample of current emails (first 10):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    beforeResult.rows.slice(0, 10).forEach(row => {
      const needsUpdate = row.email !== row.new_email;
      const status = needsUpdate ? '❌ WRONG' : '✅ OK';
      console.log(`${status} | ${row.first_name} ${row.last_name}`);
      console.log(`     Current: ${row.email}`);
      console.log(`     Correct: ${row.new_email}`);
      console.log('');
    });
    
    // Count how many need updating
    const needsUpdate = beforeResult.rows.filter(row => row.email !== row.new_email);
    console.log(`\n📊 Summary:`);
    console.log(`   Total employees: ${beforeResult.rows.length}`);
    console.log(`   Need updating: ${needsUpdate.length}`);
    console.log(`   Already correct: ${beforeResult.rows.length - needsUpdate.length}`);
    
    if (needsUpdate.length === 0) {
      console.log('\n✅ All employee emails are already correct!');
      return;
    }
    
    console.log('\n🔧 Updating employee emails (handling duplicates)...\n');
    
    await client.query('BEGIN');
    
    // Update employees one by one to handle duplicates
    let updatedCount = 0;
    const updated = [];
    
    for (const emp of needsUpdate) {
      let newEmail = `${emp.first_name.toLowerCase()}@letsgetmovinggroup.com`;
      
      // Check if email already exists
      const existingCheck = await client.query(
        'SELECT id FROM employees WHERE email = $1 AND id <> $2',
        [newEmail, emp.id]
      );
      
      // If duplicate, append first letter of last name
      if (existingCheck.rows.length > 0) {
        const lastNameInitial = emp.last_name ? emp.last_name[0].toLowerCase() : '';
        newEmail = `${emp.first_name.toLowerCase()}.${lastNameInitial}@letsgetmovinggroup.com`;
        
        // If still duplicate, append number
        const existingCheck2 = await client.query(
          'SELECT id FROM employees WHERE email = $1 AND id <> $2',
          [newEmail, emp.id]
        );
        
        if (existingCheck2.rows.length > 0) {
          newEmail = `${emp.first_name.toLowerCase()}.${emp.last_name.toLowerCase()}@letsgetmovinggroup.com`;
        }
      }
      
      // Update the email
      await client.query(
        'UPDATE employees SET email = $1 WHERE id = $2',
        [newEmail, emp.id]
      );
      
      updatedCount++;
      updated.push({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        old_email: emp.email,
        new_email: newEmail
      });
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ Updated ${updatedCount} employee emails!\n`);
    
    // Show updated emails (first 10)
    if (updated.length > 0) {
      console.log('📋 Sample of updated emails (first 10):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      updated.slice(0, 10).forEach(row => {
        console.log(`✅ ${row.first_name} ${row.last_name}`);
        console.log(`   Old: ${row.old_email}`);
        console.log(`   New: ${row.new_email}`);
        console.log('');
      });
      
      // Show any duplicates that were handled
      const withLastName = updated.filter(u => u.new_email.includes('.'));
      if (withLastName.length > 0) {
        console.log(`\n⚠️  ${withLastName.length} duplicates detected - used lastname format:`);
        withLastName.slice(0, 5).forEach(row => {
          console.log(`   ${row.first_name} ${row.last_name} → ${row.new_email}`);
        });
        console.log('');
      }
    }
    
    // Verify final state
    const afterResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE email = LOWER(first_name) || '@letsgetmovinggroup.com') as correct_format,
        COUNT(*) FILTER (WHERE email <> LOWER(first_name) || '@letsgetmovinggroup.com') as wrong_format
      FROM employees
      WHERE status <> 'Terminated'
        AND email NOT ILIKE '%admin%'
        AND email NOT ILIKE '%test%'
    `);
    
    const stats = afterResult.rows[0];
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FINAL STATUS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Correct format: ${stats.correct_format} / ${stats.total}`);
    console.log(`❌ Wrong format:   ${stats.wrong_format} / ${stats.total}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (parseInt(stats.wrong_format) > 0) {
      console.log('⚠️  Some emails still have wrong format. Checking...\n');
      const wrongEmails = await client.query(`
        SELECT id, first_name, last_name, email
        FROM employees
        WHERE status <> 'Terminated'
          AND email NOT ILIKE '%admin%'
          AND email NOT ILIKE '%test%'
          AND email <> LOWER(first_name) || '@letsgetmovinggroup.com'
        LIMIT 10
      `);
      
      console.log('Employees with wrong format:');
      wrongEmails.rows.forEach(row => {
        console.log(`   ${row.first_name} ${row.last_name}: ${row.email}`);
      });
    } else {
      console.log('🎉 SUCCESS! All employee emails now use correct format!');
      console.log('   Format: firstname@letsgetmovinggroup.com\n');
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating emails:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
fixEmployeeEmails()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


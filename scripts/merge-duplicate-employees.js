/**
 * Script to merge duplicate employees in the HR system
 * 
 * This script will:
 * 1. Identify which employee to keep (the one with more complete data)
 * 2. Update all related records to point to the kept employee
 * 3. Mark the duplicate as Terminated
 * 
 * Usage: node scripts/merge-duplicate-employees.js <keep_id> <duplicate_id>
 * 
 * Example: node scripts/merge-duplicate-employees.js 96 44
 *   (Keeps employee 96, removes employee 44)
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

// Tables that reference employee_id
const RELATED_TABLES = [
  'time_entries',
  'timecard_entries',
  'timecards',
  'timecard_uploads',
  'documents',
  'training_records',
  'performance_reviews',
  'leave_requests'
];

async function mergeEmployees(keepId, duplicateId) {
  const client = await pool.connect();
  
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔄 Merging employee ${duplicateId} into ${keepId}`);
    console.log('='.repeat(80));
    
    await client.query('BEGIN');
    
    // Get both employee records
    const { rows: [keepEmp] } = await client.query(
      'SELECT * FROM employees WHERE id = $1',
      [keepId]
    );
    
    const { rows: [dupEmp] } = await client.query(
      'SELECT * FROM employees WHERE id = $1',
      [duplicateId]
    );
    
    if (!keepEmp || !dupEmp) {
      throw new Error('One or both employees not found');
    }
    
    console.log(`\n✅ KEEPING:`);
    console.log(`   ID: ${keepEmp.id}`);
    console.log(`   Name: ${keepEmp.first_name} ${keepEmp.last_name}`);
    console.log(`   Email: ${keepEmp.email}`);
    console.log(`   Hire Date: ${keepEmp.hire_date ? new Date(keepEmp.hire_date).toLocaleDateString() : 'N/A'}`);
    console.log(`   Source: ${keepEmp.onboarding_source || 'Manual'}`);
    
    console.log(`\n❌ REMOVING:`);
    console.log(`   ID: ${dupEmp.id}`);
    console.log(`   Name: ${dupEmp.first_name} ${dupEmp.last_name}`);
    console.log(`   Email: ${dupEmp.email}`);
    console.log(`   Hire Date: ${dupEmp.hire_date ? new Date(dupEmp.hire_date).toLocaleDateString() : 'N/A'}`);
    console.log(`   Source: ${dupEmp.onboarding_source || 'Manual'}`);
    
    // Merge data: Take non-null values from duplicate if keep has null
    const updateFields = {};
    const mergeableFields = [
      'phone', 'gender', 'birth_date', 'role_title', 'hourly_rate',
      'full_address', 'emergency_contact_name', 'emergency_contact_phone',
      'sin_number', 'sin_expiry_date', 'bank_name', 'bank_transit_number',
      'bank_account_number', 'contract_status', 'contract_signed_date'
    ];
    
    mergeableFields.forEach(field => {
      if (!keepEmp[field] && dupEmp[field]) {
        updateFields[field] = dupEmp[field];
      }
    });
    
    if (Object.keys(updateFields).length > 0) {
      console.log(`\n📝 Updating kept employee with missing data:`);
      Object.entries(updateFields).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
      
      const setClause = Object.keys(updateFields)
        .map((key, i) => `${key} = $${i + 2}`)
        .join(', ');
      
      await client.query(
        `UPDATE employees SET ${setClause} WHERE id = $1`,
        [keepId, ...Object.values(updateFields)]
      );
    }
    
    // Update all related records
    console.log(`\n🔗 Updating related records...`);
    
    for (const table of RELATED_TABLES) {
      const { rowCount } = await client.query(
        `UPDATE ${table} SET employee_id = $1 WHERE employee_id = $2`,
        [keepId, duplicateId]
      );
      
      if (rowCount > 0) {
        console.log(`   ✓ ${table}: ${rowCount} record(s) updated`);
      }
    }
    
    // Mark duplicate as terminated
    await client.query(
      `UPDATE employees 
       SET status = 'Terminated', 
           termination_date = CURRENT_DATE,
           termination_reason = 'Merged with employee ID ${keepId} (duplicate)'
       WHERE id = $1`,
      [duplicateId]
    );
    
    console.log(`\n✅ Marked employee ${duplicateId} as Terminated`);
    
    await client.query('COMMIT');
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ Successfully merged employee ${duplicateId} into ${keepId}`);
    console.log(`${'='.repeat(80)}\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`\n❌ Error during merge:`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.log(`
❌ Invalid usage

Usage: node scripts/merge-duplicate-employees.js <keep_id> <duplicate_id>

Example: node scripts/merge-duplicate-employees.js 96 44
  (Keeps employee 96, removes employee 44)

Run 'node scripts/find-duplicate-employees.js' to find duplicates first.
    `);
    process.exit(1);
  }
  
  const keepId = parseInt(args[0]);
  const duplicateId = parseInt(args[1]);
  
  if (isNaN(keepId) || isNaN(duplicateId)) {
    console.error('❌ Both arguments must be valid employee IDs (numbers)');
    process.exit(1);
  }
  
  if (keepId === duplicateId) {
    console.error('❌ Cannot merge an employee with itself');
    process.exit(1);
  }
  
  try {
    await mergeEmployees(keepId, duplicateId);
    await pool.end();
  } catch (error) {
    await pool.end();
    process.exit(1);
  }
}

main();


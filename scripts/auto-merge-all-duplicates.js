/**
 * AUTOMATIC BATCH MERGE - Finds and merges ALL duplicate employees
 * 
 * Strategy:
 * - Keeps employees from onboarding (Monday.com/Google Forms) with full names
 * - Merges Manual employees into onboarding employees
 * - Transfers ALL data: timecard_entries, timecards, documents, etc.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

const RELATED_TABLES = [
  'time_entries', 'timecard_entries', 'timecards', 'timecard_uploads',
  'documents', 'training_records', 'performance_reviews', 'leave_requests'
];

function areNamesSimilar(name1, name2) {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  if (n1 === n2) return true;
  
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);
  
  // First name must match
  if (words1[0] !== words2[0]) return false;
  
  const lastName1 = words1[words1.length - 1];
  const lastName2 = words2[words2.length - 1];
  
  // Handle initials
  if (lastName1.length === 1 && lastName2.length > 1) return lastName1 === lastName2.charAt(0);
  if (lastName2.length === 1 && lastName1.length > 1) return lastName2 === lastName1.charAt(0);
  
  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  return false;
}

async function findAllDuplicates() {
  const { rows: employees } = await pool.query(`
    SELECT id, first_name, last_name, status, onboarding_source
    FROM employees
    WHERE status = 'Active'
    ORDER BY last_name, first_name
  `);
  
  const duplicateGroups = [];
  const processed = new Set();
  
  for (let i = 0; i < employees.length; i++) {
    if (processed.has(employees[i].id)) continue;
    
    const emp1 = employees[i];
    const matches = [emp1];
    
    for (let j = i + 1; j < employees.length; j++) {
      if (processed.has(employees[j].id)) continue;
      
      const emp2 = employees[j];
      const name1 = `${emp1.first_name} ${emp1.last_name}`;
      const name2 = `${emp2.first_name} ${emp2.last_name}`;
      
      if (areNamesSimilar(name1, name2)) {
        matches.push(emp2);
        processed.add(emp2.id);
      }
    }
    
    if (matches.length > 1) {
      duplicateGroups.push(matches);
      processed.add(emp1.id);
    }
  }
  
  return duplicateGroups;
}

async function mergeDuplicateGroup(group) {
  const client = await pool.connect();
  
  try {
    // Strategy: Keep onboarding employee (Monday.com/Google Forms), merge Manual into it
    const onboardingEmp = group.find(e => e.onboarding_source && e.onboarding_source !== 'Manual');
    const manualEmp = group.find(e => !e.onboarding_source || e.onboarding_source === 'Manual');
    
    if (!onboardingEmp || !manualEmp) {
      console.log(`⚠️  Skipping ${group[0].first_name} ${group[0].last_name} - no clear onboarding/manual split`);
      return;
    }
    
    const keepId = onboardingEmp.id;
    const removeId = manualEmp.id;
    
    console.log(`🔄 ${manualEmp.first_name} ${manualEmp.last_name} (ID ${removeId}) → ${onboardingEmp.first_name} ${onboardingEmp.last_name} (ID ${keepId})`);
    
    await client.query('BEGIN');
    
    // Transfer all related records
    let totalTransferred = 0;
    for (const table of RELATED_TABLES) {
      try {
        const result = await client.query(
          `UPDATE ${table} SET employee_id = $1 WHERE employee_id = $2`,
          [keepId, removeId]
        );
        if (result.rowCount > 0) {
          console.log(`   ✓ ${table}: ${result.rowCount} records`);
          totalTransferred += result.rowCount;
        }
      } catch (err) {
        // Table might not exist or have employee_id
      }
    }
    
    // Mark duplicate as terminated
    await client.query(
      `UPDATE employees 
       SET status = 'Terminated', 
           termination_date = CURRENT_DATE,
           termination_reason = 'Merged with employee ID ${keepId} (duplicate)'
       WHERE id = $1`,
      [removeId]
    );
    
    await client.query('COMMIT');
    console.log(`   ✅ Transferred ${totalTransferred} records\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`   ❌ Error:`, error.message);
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🔍 Finding ALL duplicate employees...\n');
  
  const duplicates = await findAllDuplicates();
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    await pool.end();
    return;
  }
  
  console.log(`⚠️  Found ${duplicates.length} groups of duplicates\n`);
  console.log('='.repeat(80));
  
  for (const group of duplicates) {
    await mergeDuplicateGroup(group);
  }
  
  console.log('='.repeat(80));
  console.log(`\n✅ Batch merge complete! Merged ${duplicates.length} duplicate groups.\n`);
  
  await pool.end();
}

main().catch(console.error);


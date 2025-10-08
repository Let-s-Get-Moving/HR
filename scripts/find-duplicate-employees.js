/**
 * Script to detect potential duplicate employees in the HR system
 * 
 * Looks for:
 * 1. Exact same first + last name
 * 2. Similar first names (abbreviations like "Brian N" vs "Brian Nguyen")
 * 3. Same last name with partial first name match
 * 
 * Usage: node scripts/find-duplicate-employees.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

// Helper function to check if two names are likely duplicates
function areNamesSimilar(name1, name2) {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  // Exact match
  if (n1 === n2) return true;
  
  // One is an abbreviation of the other (e.g., "Brian N" vs "Brian Nguyen")
  if (n1.startsWith(n2) || n2.startsWith(n1)) return true;
  
  // Check if one name is just initial(s) of the other
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);
  
  // If one has single letter words, it might be an abbreviation
  const hasInitial1 = words1.some(w => w.length === 1);
  const hasInitial2 = words2.some(w => w.length === 1);
  
  if (hasInitial1 || hasInitial2) {
    // Check if first words match
    if (words1[0] === words2[0]) return true;
  }
  
  return false;
}

async function findDuplicates() {
  try {
    console.log('🔍 Searching for duplicate employees...\n');
    
    // Get all employees (including terminated ones for complete check)
    const { rows: employees } = await pool.query(`
      SELECT id, first_name, last_name, email, hire_date, role_title, 
             department_id, onboarding_source, status
      FROM employees
      ORDER BY last_name, first_name
    `);
    
    console.log(`📊 Found ${employees.length} active employees\n`);
    
    const duplicateGroups = [];
    const processed = new Set();
    
    // Find potential duplicates
    for (let i = 0; i < employees.length; i++) {
      if (processed.has(employees[i].id)) continue;
      
      const emp1 = employees[i];
      const matches = [emp1];
      
      for (let j = i + 1; j < employees.length; j++) {
        if (processed.has(employees[j].id)) continue;
        
        const emp2 = employees[j];
        
        // Check if same last name and similar first name
        if (emp1.last_name.toLowerCase() === emp2.last_name.toLowerCase() &&
            areNamesSimilar(emp1.first_name, emp2.first_name)) {
          matches.push(emp2);
          processed.add(emp2.id);
        }
      }
      
      if (matches.length > 1) {
        duplicateGroups.push(matches);
        processed.add(emp1.id);
      }
    }
    
    if (duplicateGroups.length === 0) {
      console.log('✅ No duplicates found!');
      await pool.end();
      return;
    }
    
    console.log(`⚠️  Found ${duplicateGroups.length} groups of potential duplicates:\n`);
    
    duplicateGroups.forEach((group, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`GROUP ${index + 1}: ${group[0].last_name} (${group.length} employees)`);
      console.log('='.repeat(80));
      
      group.forEach((emp, empIndex) => {
        console.log(`\n  ${empIndex + 1}. ID: ${emp.id}`);
        console.log(`     Name: ${emp.first_name} ${emp.last_name}`);
        console.log(`     Email: ${emp.email || 'N/A'}`);
        console.log(`     Role: ${emp.role_title || 'N/A'}`);
        console.log(`     Hire Date: ${emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : 'N/A'}`);
        console.log(`     Source: ${emp.onboarding_source || 'Manual'}`);
        console.log(`     Status: ${emp.status}`);
      });
    });
    
    console.log(`\n${'='.repeat(80)}\n`);
    console.log(`📋 Summary: ${duplicateGroups.length} duplicate groups found`);
    console.log(`\n💡 Next step: Review these duplicates and use merge-duplicate-employees.js to merge them\n`);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error finding duplicates:', error);
    await pool.end();
    process.exit(1);
  }
}

findDuplicates();


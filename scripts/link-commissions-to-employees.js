const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

// Manual mappings for commission names to employee IDs (from analysis)
const COMMISSION_TO_EMPLOYEE_MAPPINGS = {
  // Already matched - List 1 (36 employees)
  'Akash': null, // Will match to Aakash Navaney
  'Alexander E': 498,
  'alexander fraser': 498,
  'Ander g': 498,
  'Ander G': 498,
  'andres I': 101,
  'Andres I': 101,
  'Christian,  Colin Prafullchandra': 96,
  'Clarke-Rennie,  Cheyana': 496,
  'Colin C': 96,
  'Daniel A': 39,
  'Daniel Azza': 39,
  'Danial a': 39, // Likely Daniel Azza
  'Darrius': 27,
  'Darrius S': 27,
  'Gambhir,  Rachit': 35,
  'Guerrero Guevara,  Paula Andrea': 495,
  'Jamie S': 94, // Jamie Serieux
  'John M': 499,
  'john madas': 499,
  'Josephine O': 28,
  'Josephine Orji': 28,
  'Josh S': 497, // Josh Smith
  'josh smith': 497, // Josh Smith (NOT Onwugbonu or Sanchez Trejo!)
  'Kalyan,  Rhythm': 49, // Using Rhythm Kalyan
  'Lawrence': 97,
  'Lawrence W': 97,
  'Muskan A.': 174,
  'Nambuya,  Gloria': 45,
  'Navaney,  Aakash': 40,
  'Onwugbonu,  Joshua': 527, // SEPARATE from Josh Smith!
  'Rhona D': 21,
  'Rhythm K': 49,
  'Sam L': 13, // Using Sam Lopka
  'Sanchez Trejo,  Joshua': 528, // SEPARATE from Josh Smith and Onwugbonu!
  'Sebastian': 16,
  'Sebastian DL': 16,
  'Tiwari,  Vanshika': 98,
  'Vivian': 102
};

// Employees to create (List 2 - 22 missing employees)
const EMPLOYEES_TO_CREATE = [
  { name_raw: 'Alison S', first_name: 'Alison', last_name: 'S', email: 'alison.s@company.com' },
  { name_raw: 'Calle,  Isaura', first_name: 'Isaura', last_name: 'Calle', email: 'isaura.calle@company.com' },
  { name_raw: 'Danil B', first_name: 'Danil', last_name: 'B', email: 'danil.b@company.com' },
  { name_raw: 'Dougal M', first_name: 'Dougal', last_name: 'M', email: 'dougal.m@company.com' },
  { name_raw: 'Felipe S', first_name: 'Felipe', last_name: 'S', email: 'felipe.s@company.com' },
  { name_raw: '_Felipe S', first_name: 'Felipe', last_name: 'S', email: 'felipe.s@company.com' },
  { name_raw: 'Jay o', first_name: 'Jay', last_name: 'O', email: 'jay.o@company.com' },
  { name_raw: 'Kim T', first_name: 'Kim', last_name: 'T', email: 'kim.t@company.com' },
  { name_raw: 'Ndakadji Noella,  Nkiele', first_name: 'Nkiele', last_name: 'Ndakadji Noella', email: 'nkiele.ndakadji@company.com' },
  { name_raw: 'raphael', first_name: 'Raphael', last_name: 'Unknown', email: 'raphael@company.com' },
  { name_raw: 'raphael  (new structure)', first_name: 'Raphael', last_name: 'Unknown', email: 'raphael@company.com' },
  { name_raw: 'raphael (old structure)', first_name: 'Raphael', last_name: 'Unknown', email: 'raphael@company.com' },
  { name_raw: 'Ronicia V', first_name: 'Ronicia', last_name: 'V', email: 'ronicia.v@company.com' },
  { name_raw: 'Saleh,  Ali', first_name: 'Ali', last_name: 'Saleh', email: 'ali.saleh@company.com' },
  { name_raw: 'Schwarz Costamilan,  Ricardo', first_name: 'Ricardo', last_name: 'Schwarz Costamilan', email: 'ricardo.schwarz@company.com' },
  { name_raw: 'Sean Wu', first_name: 'Sean', last_name: 'Wu', email: 'sean.wu@company.com' },
  { name_raw: 'Sehi,  Ange Valerie', first_name: 'Ange Valerie', last_name: 'Sehi', email: 'ange.sehi@company.com' },
  { name_raw: 'Suraj S', first_name: 'Suraj', last_name: 'S', email: 'suraj.s@company.com' },
  { name_raw: 'Wu,  Johnny', first_name: 'Johnny', last_name: 'Wu', email: 'johnny.wu@company.com' }
];

async function linkCommissionsToEmployees() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('LINKING COMMISSIONS TO EMPLOYEES');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // STEP 1: Link existing employees (36 matched)
    console.log('STEP 1: Linking existing employees...\n');
    
    let linkedCount = 0;
    for (const [commissionName, employeeId] of Object.entries(COMMISSION_TO_EMPLOYEE_MAPPINGS)) {
      if (!employeeId) continue; // Skip null mappings for now
      
      // Update agent_commission_us
      const result1 = await client.query(`
        UPDATE agent_commission_us
        SET employee_id = $1, updated_at = NOW()
        WHERE name_raw = $2 AND employee_id IS NULL
      `, [employeeId, commissionName]);
      
      // Update employee_commission_monthly
      const result2 = await client.query(`
        UPDATE employee_commission_monthly
        SET employee_id = $1, updated_at = NOW()
        WHERE name_raw = $2 AND employee_id IS NULL
      `, [employeeId, commissionName]);
      
      // Update hourly_payout
      const result3 = await client.query(`
        UPDATE hourly_payout
        SET employee_id = $1, updated_at = NOW()
        WHERE name_raw = $2 AND employee_id IS NULL
      `, [employeeId, commissionName]);
      
      const totalUpdated = result1.rowCount + result2.rowCount + result3.rowCount;
      if (totalUpdated > 0) {
        console.log(`✅ Linked "${commissionName}" to employee ID ${employeeId} (${totalUpdated} records)`);
        linkedCount++;
      }
    }
    
    console.log(`\n✅ Linked ${linkedCount} commission names to existing employees\n`);
    
    // STEP 2: Create missing employees and link them
    console.log('STEP 2: Creating missing employees and linking...\n');
    
    const createdEmployees = [];
    const newEmployeeMappings = {};
    
    for (const emp of EMPLOYEES_TO_CREATE) {
      // Skip if already exists (check by name)
      const existing = await client.query(`
        SELECT id FROM employees 
        WHERE LOWER(first_name) = LOWER($1) AND LOWER(last_name) = LOWER($2)
      `, [emp.first_name, emp.last_name]);
      
      let employeeId;
      
      if (existing.rows.length > 0) {
        employeeId = existing.rows[0].id;
        console.log(`ℹ️  Employee already exists: ${emp.first_name} ${emp.last_name} (ID: ${employeeId})`);
      } else {
        // Create new employee (all commission employees are sales)
        const result = await client.query(`
          INSERT INTO employees (
            first_name, 
            last_name, 
            email, 
            work_email,
            status,
            hire_date,
            employment_type,
            role_title
          ) VALUES ($1, $2, $3, $3, 'Active', CURRENT_DATE, 'Full-time', 'Sales')
          RETURNING id
        `, [emp.first_name, emp.last_name, emp.email]);
        
        employeeId = result.rows[0].id;
        console.log(`✅ Created employee: ${emp.first_name} ${emp.last_name} (ID: ${employeeId})`);
        createdEmployees.push({ ...emp, id: employeeId });
      }
      
      // Link to commissions
      const result1 = await client.query(`
        UPDATE agent_commission_us
        SET employee_id = $1, updated_at = NOW()
        WHERE name_raw = $2 AND employee_id IS NULL
      `, [employeeId, emp.name_raw]);
      
      const result2 = await client.query(`
        UPDATE employee_commission_monthly
        SET employee_id = $1, updated_at = NOW()
        WHERE name_raw = $2 AND employee_id IS NULL
      `, [employeeId, emp.name_raw]);
      
      const result3 = await client.query(`
        UPDATE hourly_payout
        SET employee_id = $1, updated_at = NOW()
        WHERE name_raw = $2 AND employee_id IS NULL
      `, [employeeId, emp.name_raw]);
      
      const totalUpdated = result1.rowCount + result2.rowCount + result3.rowCount;
      if (totalUpdated > 0) {
        console.log(`   → Linked ${totalUpdated} commission records to this employee`);
      }
      
      newEmployeeMappings[emp.name_raw] = employeeId;
    }
    
    console.log(`\n✅ Created ${createdEmployees.length} new employees\n`);
    
    // STEP 3: Handle special cases (Akash -> Aakash Navaney)
    console.log('STEP 3: Handling special name variations...\n');
    
    // Akash -> Aakash Navaney (ID: 40)
    const akashResult1 = await client.query(`
      UPDATE agent_commission_us
      SET employee_id = 40, updated_at = NOW()
      WHERE name_raw = 'Akash' AND employee_id IS NULL
    `);
    
    const akashResult2 = await client.query(`
      UPDATE employee_commission_monthly
      SET employee_id = 40, updated_at = NOW()
      WHERE name_raw = 'Akash' AND employee_id IS NULL
    `);
    
    const akashResult3 = await client.query(`
      UPDATE hourly_payout
      SET employee_id = 40, updated_at = NOW()
      WHERE name_raw = 'Akash' AND employee_id IS NULL
    `);
    
    const akashTotal = akashResult1.rowCount + akashResult2.rowCount + akashResult3.rowCount;
    if (akashTotal > 0) {
      console.log(`✅ Linked "Akash" to Aakash Navaney (ID: 40) - ${akashTotal} records`);
    }
    
    // Handle "63" (invalid name)
    console.log('⚠️  Skipping "63" (invalid commission name)\n');
    
    // STEP 4: Verify results
    console.log('STEP 4: Verification...\n');
    
    const verification = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM agent_commission_us WHERE employee_id IS NOT NULL) as agent_linked,
        (SELECT COUNT(*) FROM agent_commission_us WHERE employee_id IS NULL) as agent_unlinked,
        (SELECT COUNT(*) FROM employee_commission_monthly WHERE employee_id IS NOT NULL) as monthly_linked,
        (SELECT COUNT(*) FROM employee_commission_monthly WHERE employee_id IS NULL) as monthly_unlinked,
        (SELECT COUNT(*) FROM hourly_payout WHERE employee_id IS NOT NULL) as hourly_linked,
        (SELECT COUNT(*) FROM hourly_payout WHERE employee_id IS NULL) as hourly_unlinked,
        (SELECT COUNT(DISTINCT employee_id) FROM agent_commission_us WHERE employee_id IS NOT NULL) as unique_agents,
        (SELECT COUNT(DISTINCT employee_id) FROM employee_commission_monthly WHERE employee_id IS NOT NULL) as unique_monthly,
        (SELECT COUNT(DISTINCT employee_id) FROM hourly_payout WHERE employee_id IS NOT NULL) as unique_hourly
    `);
    
    const stats = verification.rows[0];
    console.log('Commission Records Status:');
    console.log(`  agent_commission_us:`);
    console.log(`    - Linked: ${stats.agent_linked}`);
    console.log(`    - Unlinked: ${stats.agent_unlinked}`);
    console.log(`    - Unique employees: ${stats.unique_agents}`);
    console.log(`  employee_commission_monthly:`);
    console.log(`    - Linked: ${stats.monthly_linked}`);
    console.log(`    - Unlinked: ${stats.monthly_unlinked}`);
    console.log(`    - Unique employees: ${stats.unique_monthly}`);
    console.log(`  hourly_payout:`);
    console.log(`    - Linked: ${stats.hourly_linked}`);
    console.log(`    - Unlinked: ${stats.hourly_unlinked}`);
    console.log(`    - Unique employees: ${stats.unique_hourly}\n`);
    
    await client.query('COMMIT');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! All commissions have been linked to employees');
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
linkCommissionsToEmployees()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed:', error.message);
    process.exit(1);
  });


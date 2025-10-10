const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

const excelPath = path.join(__dirname, '..', 'Onboarding_Form_1759757641.xlsx');

// Helper to parse Excel dates (Excel stores dates as numbers since 1900)
function parseExcelDate(excelDate) {
  if (!excelDate) return null;
  if (typeof excelDate === 'string') {
    // Already a string date like "July 15, 2025"
    try {
      return new Date(excelDate).toISOString().split('T')[0];
    } catch {
      return null;
    }
  }
  // Excel date number
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

async function reimportTerminatedEmployees() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting terminated employees reimport process...\n');
    
    // ===== STEP 1: Remove all current terminated employees =====
    await client.query('BEGIN');
    
    console.log('📋 STEP 1: Removing all current terminated employees...\n');
    
    const currentTerminated = await client.query(
      "SELECT id, first_name, last_name FROM employees WHERE status = 'Terminated' ORDER BY id"
    );
    
    console.log(`Found ${currentTerminated.rows.length} terminated employees to remove:\n`);
    currentTerminated.rows.forEach((emp, idx) => {
      console.log(`   ${idx + 1}. ID ${emp.id}: ${emp.first_name} ${emp.last_name}`);
    });
    
    if (currentTerminated.rows.length > 0) {
      console.log('\n🗑️  Deleting...\n');
      
      for (const emp of currentTerminated.rows) {
        // Delete termination_details
        await client.query('DELETE FROM termination_details WHERE employee_id = $1', [emp.id]);
        
        // Delete timecard_entries
        const entriesResult = await client.query(
          'DELETE FROM timecard_entries WHERE employee_id = $1',
          [emp.id]
        );
        
        // Delete timecards
        const timecardsResult = await client.query(
          'DELETE FROM timecards WHERE employee_id = $1',
          [emp.id]
        );
        
        // Delete employee
        await client.query('DELETE FROM employees WHERE id = $1', [emp.id]);
        
        console.log(`   ✓ Deleted: ${emp.first_name} ${emp.last_name} (ID ${emp.id})`);
      }
      
      console.log(`\n✅ Removed ${currentTerminated.rows.length} terminated employees\n`);
    } else {
      console.log('\n✅ No terminated employees to remove\n');
    }
    
    // ===== STEP 2: Read Excel and find terminated employees =====
    console.log('📊 STEP 2: Reading Excel file...\n');
    
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { range: 2 });
    
    // Find ALL employees marked as "Inactive"
    const terminatedEmployees = data.filter(row => {
      const status = row['Status'];
      return status && status.toString().toLowerCase() === 'inactive';
    });
    
    console.log(`✅ Found ${terminatedEmployees.length} terminated employees in Excel\n`);
    
    // ===== STEP 3: Import terminated employees =====
    console.log('📥 STEP 3: Importing terminated employees...\n');
    
    const today = new Date().toISOString().split('T')[0];
    let importedCount = 0;
    
    for (const emp of terminatedEmployees) {
      const firstName = emp['First Name'];
      const lastName = emp['Last Name'];
      
      // Skip if no name
      if (!firstName || !lastName) {
        console.log(`\n   ⚠️  Skipping employee with missing name data`);
        continue;
      }
      
      const email = emp['Email Address'];
      const phone = emp['Phone Number'];
      const hireDate = parseExcelDate(emp['Date of Joining']) || today;
      const birthDate = parseExcelDate(emp['Date of Birth']);
      const position = emp['Designation/Position'] || 'Not specified';
      const address = emp['Full Address With Postal Code'];
      const sinNumber = emp['SIN (Social Insurance Number)'] || emp['Sin number'];
      const sinExpiry = parseExcelDate(emp['SIN Expiry Date (Optional)']);
      const bankName = emp['Bank'];
      const transitNumber = emp['Transit Number'];
      const accountNumber = emp['Account Number'];
      const emergencyName = emp['Emergency Contact Name'];
      const emergencyPhone = emp['Emergency Contact Phone Number'];
      const lastDayWorked = emp['Last Day Worked'];
      
      // Parse last day worked as termination date, or use today if not specified
      const terminationDate = parseExcelDate(lastDayWorked) || today;
      
      // Generate work email
      const workEmail = `${firstName.toLowerCase().replace(/\s+/g, '')}@letsgetmovinggroup.com`;
      
      console.log(`\n   Processing: ${firstName} ${lastName}`);
      console.log(`   Email: ${email}`);
      console.log(`   Work Email: ${workEmail}`);
      console.log(`   Last Day Worked: ${lastDayWorked} (${terminationDate})`);
      
      // Check if employee already exists with this email (personal or work)
      const existingEmp = await client.query(
        'SELECT id, first_name, last_name FROM employees WHERE email = $1 OR work_email = $2',
        [email, workEmail]
      );
      
      if (existingEmp.rows.length > 0) {
        console.log(`   ⚠️  Skipping: Employee already exists (ID ${existingEmp.rows[0].id}: ${existingEmp.rows[0].first_name} ${existingEmp.rows[0].last_name})`);
        continue;
      }
      
      // Insert employee
      const result = await client.query(
        `INSERT INTO employees (
          first_name, last_name, work_email, email, phone,
          hire_date, birth_date, role_title, employment_type,
          hourly_rate, status, termination_date, termination_reason, termination_type,
          full_address, sin_number, sin_expiry_date,
          bank_name, bank_transit_number, bank_account_number,
          emergency_contact_name, emergency_contact_phone
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, $16, $17,
          $18, $19, $20,
          $21, $22
        ) RETURNING id`,
        [
          firstName, lastName, workEmail, email, phone,
          hireDate, birthDate, position, 'Full-time',
          25, 'Terminated', terminationDate, 'Imported as terminated', 'Involuntary',
          address, sinNumber, sinExpiry,
          bankName, transitNumber, accountNumber,
          emergencyName, emergencyPhone
        ]
      );
      
      const employeeId = result.rows[0].id;
      
      // Insert termination_details
      await client.query(
        `INSERT INTO termination_details (
          employee_id, termination_date, termination_reason,
          termination_type, initiated_by
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          employeeId,
          terminationDate,
          'Imported as terminated',
          'Involuntary', // Generic termination type
          'System Import'
        ]
      );
      
      console.log(`   ✅ Imported: ${firstName} ${lastName} (ID ${employeeId})`);
      importedCount++;
    }
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ REIMPORT COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   - Removed: ${currentTerminated.rows.length} old terminated employees`);
    console.log(`   - Imported: ${importedCount} new terminated employees`);
    console.log('');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during reimport:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

reimportTerminatedEmployees();


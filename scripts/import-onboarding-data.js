/**
 * Onboarding Data Import Script
 * 
 * Imports employee data from onboarding forms (XLSX files) into the database
 * - Parses employee information from Monday.com and Google Forms exports
 * - Matches employees by name (first + last name)
 * - Updates existing employees or creates new ones
 * - Stores document URLs (from Monday.com/Google Drive) for later access
 * 
 * Usage: node scripts/import-onboarding-data.js
 */

const XLSX = require('xlsx');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

// File paths
const FILE1 = 'Onboarding_Form_1759757641.xlsx';
const FILE2 = 'Onboarding Form (Responses).xlsx';

// Excel date to JS date converter
function excelDateToJSDate(excelDate) {
  if (!excelDate || excelDate === '') return null;
  if (typeof excelDate === 'string') return excelDate; // Already a date string
  
  // Excel dates are days since 1900-01-01 (with a leap year bug)
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0]; // Return YYYY-MM-DD
}

// Clean phone number
function cleanPhone(phone) {
  if (!phone) return null;
  return phone.toString().replace(/\D/g, ''); // Remove non-digits
}

// Parse Monday.com file (Onboarding_Form_1759757641.xlsx)
function parseFile1() {
  console.log(`\n📄 Parsing ${FILE1}...`);
  
  const workbook = XLSX.readFile(FILE1);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Headers are in row index 2 (0-based)
  const headers = data[2];
  const employees = [];
  
  // Data starts at row 3
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[2]) continue; // Skip empty rows
    
    const employee = {
      first_name: row[2]?.trim(),
      last_name: row[3]?.trim(),
      status: row[4],
      contract_status: row[5] === 'Signed & returned' ? 'Signed' : (row[5] ? 'Sent' : null),
      contract_url: row[6],
      gift_card_sent: row[7] === 'Done',
      hire_date: excelDateToJSDate(row[8]),
      birth_date: excelDateToJSDate(row[9]),
      phone: cleanPhone(row[10]),
      email: row[11]?.trim().toLowerCase(),
      role_title: row[12],
      full_address: row[13],
      sin_number: row[14] ? row[14].toString() : null,
      sin_expiry_date: excelDateToJSDate(row[15]),
      bank_name: row[19],
      bank_transit_number: row[20] ? row[20].toString() : null,
      bank_account_number: row[21] ? row[21].toString() : null,
      emergency_contact_phone: cleanPhone(row[22]),
      emergency_contact_name: row[23],
      termination_date: excelDateToJSDate(row[24]),
      documents: {
        void_cheque_url: row[16],
        status_proof_url: row[17],
        sin_document_url: row[18],
        contract_url: row[6]
      },
      source: 'Monday.com'
    };
    
    if (employee.first_name && employee.last_name) {
      employees.push(employee);
    }
  }
  
  console.log(`✅ Parsed ${employees.length} employees from ${FILE1}`);
  return employees;
}

// Parse Google Forms file (Onboarding Form (Responses).xlsx)
function parseFile2() {
  console.log(`\n📄 Parsing ${FILE2}...`);
  
  const workbook = XLSX.readFile(FILE2);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Headers are in row 0
  const headers = data[0];
  const employees = [];
  
  // Data starts at row 1
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[2]) continue; // Skip empty rows
    
    // Split full name
    const fullName = row[2]?.trim().split(' ');
    const firstName = fullName[0];
    const lastName = fullName.slice(1).join(' ');
    
    const employee = {
      first_name: firstName,
      last_name: lastName,
      termination_date: excelDateToJSDate(row[3]),
      contract_status: row[5] === 'Signed & returned' ? 'Signed' : (row[4] ? 'Sent' : null),
      role_title: row[6],
      birth_date: excelDateToJSDate(row[7]),
      phone: cleanPhone(row[8]),
      email: row[9]?.trim().toLowerCase(),
      full_address: row[10],
      hire_date: excelDateToJSDate(row[12]),
      emergency_contact_name: row[13],
      emergency_contact_phone: cleanPhone(row[14]),
      sin_number: row[15] ? row[15].toString() : null,
      sin_expiry_date: row[16] === 'Does not expire' || row[16] === 'No Expiration' || row[16] === 'N/A' ? null : excelDateToJSDate(row[16]),
      bank_name: row[17],
      bank_transit_number: row[18] ? row[18].toString() : null,
      bank_account_number: row[19] ? row[19].toString() : null,
      documents: {
        // Google Drive URLs are in the last column, comma-separated
        google_drive_urls: row[20] ? row[20].split(',').map(url => url.trim()) : []
      },
      source: 'Google Forms'
    };
    
    if (employee.first_name && employee.last_name) {
      employees.push(employee);
    }
  }
  
  console.log(`✅ Parsed ${employees.length} employees from ${FILE2}`);
  return employees;
}

// Find existing employee by name
async function findEmployeeByName(firstName, lastName) {
  const result = await pool.query(
    `SELECT * FROM employees 
     WHERE LOWER(first_name) = LOWER($1) 
     AND LOWER(last_name) = LOWER($2)
     LIMIT 1`,
    [firstName, lastName]
  );
  return result.rows[0];
}

// Create or update employee
async function upsertEmployee(employeeData) {
  const existing = await findEmployeeByName(employeeData.first_name, employeeData.last_name);
  
  if (existing) {
    console.log(`   ↻ Updating: ${employeeData.first_name} ${employeeData.last_name}`);
    
    // Update existing employee - only update fields that have values
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    // Helper to add non-null updates
    const addUpdate = (field, value) => {
      if (value !== null && value !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    };
    
    addUpdate('email', employeeData.email);
    addUpdate('phone', employeeData.phone);
    addUpdate('birth_date', employeeData.birth_date);
    addUpdate('hire_date', employeeData.hire_date);
    addUpdate('role_title', employeeData.role_title);
    addUpdate('full_address', employeeData.full_address);
    addUpdate('sin_number', employeeData.sin_number);
    addUpdate('sin_expiry_date', employeeData.sin_expiry_date);
    addUpdate('bank_name', employeeData.bank_name);
    addUpdate('bank_transit_number', employeeData.bank_transit_number);
    addUpdate('bank_account_number', employeeData.bank_account_number);
    addUpdate('emergency_contact_name', employeeData.emergency_contact_name);
    addUpdate('emergency_contact_phone', employeeData.emergency_contact_phone);
    addUpdate('contract_status', employeeData.contract_status);
    addUpdate('gift_card_sent', employeeData.gift_card_sent);
    addUpdate('onboarding_source', employeeData.source);
    addUpdate('imported_at', new Date().toISOString());
    
    if (updates.length > 0) {
      values.push(existing.id);
      const query = `UPDATE employees SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await pool.query(query, values);
      return result.rows[0];
    }
    
    return existing;
    
  } else {
    console.log(`   ✚ Creating: ${employeeData.first_name} ${employeeData.last_name}`);
    
    // Create new employee
    const result = await pool.query(
      `INSERT INTO employees (
        first_name, last_name, email, phone, birth_date, hire_date,
        employment_type, role_title, full_address, status,
        sin_number, sin_expiry_date,
        bank_name, bank_transit_number, bank_account_number,
        emergency_contact_name, emergency_contact_phone,
        contract_status, gift_card_sent, onboarding_source, imported_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *`,
      [
        employeeData.first_name,
        employeeData.last_name,
        employeeData.email || `${employeeData.first_name.toLowerCase()}@letsgetmovinggroup.com`,
        employeeData.phone,
        employeeData.birth_date,
        employeeData.hire_date || new Date().toISOString().split('T')[0],
        'Full-time', // Default
        employeeData.role_title,
        employeeData.full_address,
        employeeData.status || 'Active',
        employeeData.sin_number,
        employeeData.sin_expiry_date,
        employeeData.bank_name,
        employeeData.bank_transit_number,
        employeeData.bank_account_number,
        employeeData.emergency_contact_name,
        employeeData.emergency_contact_phone,
        employeeData.contract_status,
        employeeData.gift_card_sent || false,
        employeeData.source,
        new Date().toISOString()
      ]
    );
    return result.rows[0];
  }
}

// Store document URLs for an employee
async function storeDocumentUrls(employeeId, documents, source) {
  const docMappings = [];
  
  if (source === 'Monday.com') {
    if (documents.void_cheque_url) {
      docMappings.push({ type: 'VoidCheque', url: documents.void_cheque_url, category: 'Financial' });
    }
    if (documents.status_proof_url) {
      // Could be Work Permit, PR, or Citizenship - we'll mark as WorkPermit and let HR correct if needed
      docMappings.push({ type: 'WorkPermit', url: documents.status_proof_url, category: 'Immigration' });
    }
    if (documents.sin_document_url) {
      docMappings.push({ type: 'SIN_Document', url: documents.sin_document_url, category: 'Financial' });
    }
    if (documents.contract_url) {
      docMappings.push({ type: 'Contract', url: documents.contract_url, category: 'Employment' });
    }
  } else if (source === 'Google Forms') {
    // Google Forms has multiple URLs in one field
    if (documents.google_drive_urls && documents.google_drive_urls.length > 0) {
      documents.google_drive_urls.forEach((url, index) => {
        // Try to guess document type from URL or just number them
        let docType = 'Other';
        let category = 'Personal';
        
        if (url.toLowerCase().includes('sin') || url.toLowerCase().includes('social')) {
          docType = 'SIN_Document';
          category = 'Financial';
        } else if (url.toLowerCase().includes('permit') || url.toLowerCase().includes('work')) {
          docType = 'WorkPermit';
          category = 'Immigration';
        } else if (url.toLowerCase().includes('void') || url.toLowerCase().includes('cheque') || url.toLowerCase().includes('bank')) {
          docType = 'VoidCheque';
          category = 'Financial';
        } else if (url.toLowerCase().includes('contract')) {
          docType = 'Contract';
          category = 'Employment';
        } else {
          docType = index === 0 ? 'VoidCheque' : index === 1 ? 'WorkPermit' : 'SIN_Document';
          category = index === 0 ? 'Financial' : 'Immigration';
        }
        
        docMappings.push({ type: docType, url, category });
      });
    }
  }
  
  // Insert documents
  for (const doc of docMappings) {
    try {
      // Check if document URL already exists for this employee
      const existing = await pool.query(
        `SELECT id FROM documents WHERE employee_id = $1 AND file_url = $2`,
        [employeeId, doc.url]
      );
      
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO documents (
            employee_id, doc_type, file_name, file_url, 
            document_category, uploaded_on
          ) VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            employeeId,
            doc.type,
            `${doc.type}_from_onboarding`,
            doc.url,
            doc.category
          ]
        );
        console.log(`      📎 Added document: ${doc.type}`);
      }
    } catch (error) {
      console.error(`      ❌ Error adding document ${doc.type}:`, error.message);
    }
  }
}

// Main import function
async function importOnboardingData() {
  console.log('🚀 Starting Onboarding Data Import...\n');
  
  try {
    // Parse both files
    const employeesFile1 = parseFile1();
    const employeesFile2 = parseFile2();
    
    // Combine and deduplicate by name
    const allEmployees = [...employeesFile1];
    
    // Add employees from file 2 that aren't already in file 1
    for (const emp2 of employeesFile2) {
      const exists = employeesFile1.find(emp1 => 
        emp1.first_name.toLowerCase() === emp2.first_name.toLowerCase() &&
        emp1.last_name.toLowerCase() === emp2.last_name.toLowerCase()
      );
      if (!exists) {
        allEmployees.push(emp2);
      } else {
        console.log(`   ⚠️  Duplicate found: ${emp2.first_name} ${emp2.last_name} (skipping file 2 version)`);
      }
    }
    
    console.log(`\n📊 Total unique employees to process: ${allEmployees.length}\n`);
    console.log('=' .repeat(60));
    
    // Process each employee
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    for (const employeeData of allEmployees) {
      try {
        const existing = await findEmployeeByName(employeeData.first_name, employeeData.last_name);
        const employee = await upsertEmployee(employeeData);
        
        if (existing) {
          updated++;
        } else {
          created++;
        }
        
        // Store document URLs
        await storeDocumentUrls(employee.id, employeeData.documents, employeeData.source);
        
      } catch (error) {
        errors++;
        console.error(`   ❌ Error processing ${employeeData.first_name} ${employeeData.last_name}:`, error.message);
      }
    }
    
    console.log('=' .repeat(60));
    console.log('\n✅ Import Complete!\n');
    console.log(`📈 Summary:`);
    console.log(`   • Created: ${created} new employees`);
    console.log(`   • Updated: ${updated} existing employees`);
    console.log(`   • Errors: ${errors}`);
    console.log(`   • Total processed: ${created + updated}\n`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run import
if (require.main === module) {
  importOnboardingData()
    .then(() => {
      console.log('🎉 Import completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importOnboardingData };


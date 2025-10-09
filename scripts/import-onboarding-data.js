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
  if (!excelDate || excelDate === '' || excelDate === 'NA' || excelDate === 'N/A') return null;
  
  // Handle string dates in various formats
  if (typeof excelDate === 'string') {
    excelDate = excelDate.trim();
    
    // Format: DD-MM-YYYY or DD/MM/YYYY
    const ddmmyyyy = excelDate.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      
      // Validate month and day
      if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
        console.log(`      ⚠️  Invalid date: ${excelDate} - ignoring`);
        return null;
      }
      
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Format: YYYY-MM-DD
    const yyyymmdd = excelDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd;
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      
      // Validate month and day
      if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
        console.log(`      ⚠️  Invalid date: ${excelDate} - ignoring`);
        return null;
      }
      
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try parsing as ISO date
    const parsed = new Date(excelDate);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    console.log(`      ⚠️  Invalid date format: ${excelDate} - ignoring`);
    return null;
  }
  
  // Excel dates are days since 1900-01-01 (with a leap year bug)
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0]; // Return YYYY-MM-DD
}

// Clean phone number
function cleanPhone(phone) {
  if (!phone) return null;
  return phone.toString().replace(/\D/g, ''); // Remove non-digits
}

// Map position/role to department ID
function mapDepartmentId(positionOrName) {
  if (!positionOrName) return null;
  
  const pos = positionOrName.toLowerCase().trim();
  
  // Sales Department (ID: 3)
  if (pos.includes('sales') || pos.includes('franchise sales')) {
    return 3;
  }
  
  // Customer Service Department - maps to Operations (ID: 1)
  if (pos.includes('customer service') || pos.includes('customer support') || 
      pos.includes('moving consultant')) {
    return 1; // Operations
  }
  
  // Marketing Department - maps to Operations (ID: 1)
  if (pos.includes('marketing') || pos.includes('seo')) {
    return 1; // Operations
  }
  
  // IT/Engineering Department (ID: 160)
  if (pos.includes('it') || pos.includes('tech') || pos.includes('developer') || 
      pos.includes('software') || pos.includes('web design') || pos.includes('engineer')) {
    return 160;
  }
  
  // Finance/Accounting - maps to Operations (ID: 1)
  if (pos.includes('finance') || pos.includes('accounting') || pos.includes('cfo')) {
    return 1; // Operations
  }
  
  // Operations Department (ID: 1)
  if (pos.includes('operations') || pos.includes('coo') || pos.includes('franchise success')) {
    return 1;
  }
  
  // HR Department (ID: 2)
  if (pos.includes('hr') || pos.includes('human resources')) {
    return 2;
  }
  
  // Admin/Executive roles - Operations (ID: 1)
  if (pos.includes('cdo') || pos.includes('lead admin')) {
    return 1;
  }
  
  // Default: null (user can edit later)
  return null;
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
    if (!row || row.length === 0) continue; // Skip completely empty rows
    
    // Import if we have at least a first name OR last name
    const firstName = row[2]?.trim();
    const lastName = row[3]?.trim();
    if (!firstName && !lastName) {
      // Debug: log skipped rows
      if (i >= 77 && i <= 78) {
        console.log(`   ⚠️  Row ${i}: Skipped - firstName='${firstName}' lastName='${lastName}'`);
      }
      continue; // Skip only if both are missing
    }
    
    // Debug: log included rows with partial names
    if ((firstName && !lastName) || (!firstName && lastName)) {
      console.log(`   ℹ️  Row ${i}: Partial name - firstName='${firstName || '(empty)'}' lastName='${lastName || '(empty)'}'`);
    }
    
    const employee = {
      first_name: row[2]?.trim(),
      last_name: row[3]?.trim(),
      status: row[4]?.trim(),
      contract_status: row[5] === 'Signed & returned' ? 'Signed' : (row[5] ? 'Sent' : null),
      contract_url: row[6],
      gift_card_sent: row[7] === 'Done',
      hire_date: excelDateToJSDate(row[8]),
      birth_date: excelDateToJSDate(row[9]),
      phone: cleanPhone(row[10]),
      email: row[11]?.trim().toLowerCase(),
      role_title: row[12],
      department_id: mapDepartmentId(row[0]) || mapDepartmentId(row[12]), // Use Name (col 0) or Position (col 12)
      full_address: row[13],
      sin_number: row[14] ? row[14].toString().trim() : null,
      sin_expiry_date: excelDateToJSDate(row[15]),
      bank_name: row[19],
      bank_transit_number: row[20] ? row[20].toString().trim() : null,
      bank_account_number: row[21] ? row[21].toString().trim() : null,
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
    
    // Add employee if we have at least a first name OR last name
    if (employee.first_name || employee.last_name) {
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
      department_id: mapDepartmentId(row[6]), // Map from Position column
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

// Find existing employee by name (with fuzzy matching)
async function findEmployeeByName(firstName, lastName) {
  // If no first name, can't search
  if (!firstName) return null;
  
  // If no last name, search by first name only
  if (!lastName || lastName === '') {
    const result = await pool.query(
      `SELECT * FROM employees 
       WHERE LOWER(TRIM(first_name)) = LOWER(TRIM($1))
       AND (last_name IS NULL OR last_name = '' OR LENGTH(last_name) <= 2)
       AND status <> 'Terminated'
       LIMIT 1`,
      [firstName]
    );
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  }
  
  // First try exact match
  const exactResult = await pool.query(
    `SELECT * FROM employees 
     WHERE LOWER(TRIM(first_name)) = LOWER(TRIM($1))
     AND LOWER(TRIM(last_name)) = LOWER(TRIM($2))
     AND status <> 'Terminated'
     LIMIT 1`,
    [firstName, lastName]
  );
  
  if (exactResult.rows.length > 0) {
    return exactResult.rows[0];
  }
  
  // Try email match (duplicate email = same person)
  const emailToSearch = `${firstName.toLowerCase()}@letsgetmovinggroup.com`;
  const emailResult = await pool.query(
    `SELECT * FROM employees 
     WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
     LIMIT 1`,
    [emailToSearch]
  );
  
  if (emailResult.rows.length > 0) {
    console.log(`   🔗 Matched by email: ${firstName} → ${emailResult.rows[0].first_name} ${emailResult.rows[0].last_name}`);
    return emailResult.rows[0];
  }
  
  // Try fuzzy match - get all employees with same last name
  const candidatesResult = await pool.query(
    `SELECT * FROM employees 
     WHERE LOWER(TRIM(last_name)) = LOWER(TRIM($1))
     AND status <> 'Terminated'`,
    [lastName]
  );
  
  if (candidatesResult.rows.length === 0) {
    return null;
  }
  
  // Check for similar names (handles variations, typos, middle names)
  const searchName = `${firstName} ${lastName}`.toLowerCase();
  
  for (const candidate of candidatesResult.rows) {
    const candidateName = `${candidate.first_name} ${candidate.last_name}`.toLowerCase();
    
    // Check if names are similar
    if (areNamesSimilar(searchName, candidateName)) {
      console.log(`   🔗 Fuzzy matched: "${searchName}" → "${candidateName}" (ID: ${candidate.id})`);
      return candidate;
    }
  }
  
  return null;
}

// Helper function to check if two names are similar
function areNamesSimilar(name1, name2) {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  if (n1 === n2) return true;
  
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);
  
  // First names must be similar
  if (!areWordsSimilar(words1[0], words2[0])) return false;
  
  const lastName1 = words1[words1.length - 1];
  const lastName2 = words2[words2.length - 1];
  
  // Handle initials
  if (lastName1.length === 1 && lastName2.length > 1) {
    return lastName1 === lastName2.charAt(0);
  }
  if (lastName2.length === 1 && lastName1.length > 1) {
    return lastName2 === lastName1.charAt(0);
  }
  
  // Last names must be similar
  if (!areWordsSimilar(lastName1, lastName2)) {
    // Check if one name contains the other (handles middle names)
    if (n1.includes(n2) || n2.includes(n1)) return true;
    return false;
  }
  
  return true;
}

// Check if two words are similar (handles typos, variations)
function areWordsSimilar(word1, word2) {
  if (word1 === word2) return true;
  if (word1.startsWith(word2) || word2.startsWith(word1)) return true;
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(word1, word2);
  const maxLen = Math.max(word1.length, word2.length);
  const threshold = maxLen <= 4 ? 1 : 2;
  
  return distance <= threshold;
}

// Levenshtein distance (edit distance) calculation
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]
        );
      }
    }
  }
  
  return dp[m][n];
}

// Create or update employee
async function upsertEmployee(employeeData) {
  // Sanitize data - remove invalid fields instead of failing
  const sanitizedData = { ...employeeData };
  
  // Ensure we have at least first name OR last name
  if (!sanitizedData.first_name && !sanitizedData.last_name) {
    console.log(`      ⚠️  No name provided - skipping employee`);
    return null;
  }
  
  // Set default values for missing names
  if (!sanitizedData.first_name) {
    sanitizedData.first_name = 'Unknown';
    console.log(`      ⚠️  Missing first name - using "Unknown"`);
  }
  if (!sanitizedData.last_name) {
    sanitizedData.last_name = '';
    console.log(`      ⚠️  Missing last name - using blank`);
  }
  
  // Validate and sanitize dates
  if (sanitizedData.birth_date && !isValidDate(sanitizedData.birth_date)) {
    console.log(`      ⚠️  Invalid birth_date: ${sanitizedData.birth_date} - skipping field`);
    sanitizedData.birth_date = null;
  }
  if (sanitizedData.hire_date && !isValidDate(sanitizedData.hire_date)) {
    console.log(`      ⚠️  Invalid hire_date: ${sanitizedData.hire_date} - skipping field`);
    sanitizedData.hire_date = null;
  }
  if (sanitizedData.sin_expiry_date && !isValidDate(sanitizedData.sin_expiry_date)) {
    console.log(`      ⚠️  Invalid sin_expiry_date: ${sanitizedData.sin_expiry_date} - skipping field`);
    sanitizedData.sin_expiry_date = null;
  }
  if (sanitizedData.contract_signed_date && !isValidDate(sanitizedData.contract_signed_date)) {
    console.log(`      ⚠️  Invalid contract_signed_date: ${sanitizedData.contract_signed_date} - skipping field`);
    sanitizedData.contract_signed_date = null;
  }
  
  // Validate status field
  const validStatuses = ['Active', 'On Leave', 'Terminated'];
  if (sanitizedData.status) {
    // Trim and normalize status
    let normalizedStatus = sanitizedData.status.toString().trim();
    
    // Map common variations
    if (normalizedStatus === 'Inactive') {
      console.log(`      ⚠️  Mapping "Inactive" → "Terminated"`);
      normalizedStatus = 'Terminated';
    }
    
    if (!validStatuses.includes(normalizedStatus)) {
      console.log(`      ⚠️  Invalid status: "${sanitizedData.status}" - defaulting to Active`);
      sanitizedData.status = 'Active';
    } else {
      sanitizedData.status = normalizedStatus;
    }
  } else {
    // If no status provided, default to Active
    sanitizedData.status = 'Active';
  }
  
  const existing = await findEmployeeByName(sanitizedData.first_name, sanitizedData.last_name);
  
  if (existing) {
    console.log(`   ↻ Updating: ${sanitizedData.first_name} ${sanitizedData.last_name}`);
    
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
    
    addUpdate('email', sanitizedData.email);
    addUpdate('phone', sanitizedData.phone);
    addUpdate('birth_date', sanitizedData.birth_date);
    addUpdate('hire_date', sanitizedData.hire_date);
    addUpdate('role_title', sanitizedData.role_title);
    addUpdate('department_id', sanitizedData.department_id);
    addUpdate('full_address', sanitizedData.full_address);
    addUpdate('sin_number', sanitizedData.sin_number);
    addUpdate('sin_expiry_date', sanitizedData.sin_expiry_date);
    addUpdate('bank_name', sanitizedData.bank_name);
    addUpdate('bank_transit_number', sanitizedData.bank_transit_number);
    addUpdate('bank_account_number', sanitizedData.bank_account_number);
    addUpdate('emergency_contact_name', sanitizedData.emergency_contact_name);
    addUpdate('emergency_contact_phone', sanitizedData.emergency_contact_phone);
    addUpdate('contract_status', sanitizedData.contract_status);
    addUpdate('gift_card_sent', sanitizedData.gift_card_sent);
    addUpdate('onboarding_source', sanitizedData.source);
    addUpdate('imported_at', new Date().toISOString());
    
    if (updates.length > 0) {
      try {
        values.push(existing.id);
        const query = `UPDATE employees SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        const result = await pool.query(query, values);
        return result.rows[0];
      } catch (updateError) {
        // If email conflict during update, skip email and retry
        if (updateError.code === '23505' && updateError.constraint === 'employees_email_key') {
          console.log(`      ⚠️  Email conflict - updating without email change`);
          // Remove email from updates and retry
          const noEmailUpdates = [];
          const noEmailValues = [];
          let newParamCount = 1;
          
          for (let i = 0; i < updates.length; i++) {
            if (!updates[i].includes('email =')) {
              noEmailUpdates.push(updates[i].replace(/\$\d+/, `$${newParamCount}`));
              noEmailValues.push(values[i]);
              newParamCount++;
            }
          }
          
          if (noEmailUpdates.length > 0) {
            noEmailValues.push(existing.id);
            const retryQuery = `UPDATE employees SET ${noEmailUpdates.join(', ')} WHERE id = $${newParamCount} RETURNING *`;
            const retryResult = await pool.query(retryQuery, noEmailValues);
            return retryResult.rows[0];
          }
        } else {
          throw updateError;
        }
      }
    }
    
    return existing;
    
  } else {
    console.log(`   ✚ Creating: ${sanitizedData.first_name} ${sanitizedData.last_name}`);
    console.log(`      Status will be: "${sanitizedData.status}"`);
    
    // Create new employee
    try {
      const result = await pool.query(
        `INSERT INTO employees (
          first_name, last_name, email, phone, birth_date, hire_date,
          employment_type, role_title, department_id, full_address, status,
          sin_number, sin_expiry_date,
          bank_name, bank_transit_number, bank_account_number,
          emergency_contact_name, emergency_contact_phone,
          contract_status, gift_card_sent, onboarding_source, imported_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        ) RETURNING *`,
      [
        sanitizedData.first_name,
        sanitizedData.last_name,
        sanitizedData.email || `${sanitizedData.first_name.toLowerCase()}@letsgetmovinggroup.com`,
        sanitizedData.phone,
        sanitizedData.birth_date,
        sanitizedData.hire_date || new Date().toISOString().split('T')[0],
        'Full-time', // Default
        sanitizedData.role_title,
        sanitizedData.department_id,
        sanitizedData.full_address,
        sanitizedData.status || 'Active',
        sanitizedData.sin_number,
        sanitizedData.sin_expiry_date,
        sanitizedData.bank_name,
        sanitizedData.bank_transit_number,
        sanitizedData.bank_account_number,
        sanitizedData.emergency_contact_name,
        sanitizedData.emergency_contact_phone,
        sanitizedData.contract_status,
        sanitizedData.gift_card_sent || false,
        sanitizedData.source,
        new Date().toISOString()
      ]
    );
    return result.rows[0];
    } catch (error) {
      // If duplicate email error, it means same person - update existing
      if (error.code === '23505' && error.constraint === 'employees_email_key') {
        console.log(`      ↻ Email exists - treating as update`);
        // Find by email and update
        const existing = await pool.query(
          `SELECT * FROM employees WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [sanitizedData.email || `${sanitizedData.first_name.toLowerCase()}@letsgetmovinggroup.com`]
        );
        if (existing.rows.length > 0) {
          // Update the existing employee
          const updates = [];
          const values = [];
          let paramCount = 1;
          
          const addUpdate = (field, value) => {
            if (value !== null && value !== undefined) {
              updates.push(`${field} = $${paramCount}`);
              values.push(value);
              paramCount++;
            }
          };
          
          addUpdate('phone', sanitizedData.phone);
          addUpdate('birth_date', sanitizedData.birth_date);
          addUpdate('role_title', sanitizedData.role_title);
          addUpdate('department_id', sanitizedData.department_id);
          addUpdate('full_address', sanitizedData.full_address);
          addUpdate('sin_number', sanitizedData.sin_number);
          addUpdate('sin_expiry_date', sanitizedData.sin_expiry_date);
          addUpdate('bank_name', sanitizedData.bank_name);
          addUpdate('bank_transit_number', sanitizedData.bank_transit_number);
          addUpdate('bank_account_number', sanitizedData.bank_account_number);
          addUpdate('emergency_contact_name', sanitizedData.emergency_contact_name);
          addUpdate('emergency_contact_phone', sanitizedData.emergency_contact_phone);
          addUpdate('contract_status', sanitizedData.contract_status);
          addUpdate('onboarding_source', sanitizedData.source);
          
          if (updates.length > 0) {
            values.push(existing.rows[0].id);
            const query = `UPDATE employees SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
            const updateResult = await pool.query(query, values);
            return updateResult.rows[0];
          }
          return existing.rows[0];
        }
      }
      throw error;
    }
  }
}

// Helper function to validate dates
function isValidDate(dateString) {
  if (!dateString || dateString === 'NA' || dateString === 'N/A') return false;
  
  // Try to parse as a date
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;
  
  // Check if date is reasonable (not too far in past/future)
  const year = date.getFullYear();
  if (year < 1900 || year > 2100) return false;
  
  return true;
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
        
        // Always try to create/update - skip only invalid fields
        const employee = await upsertEmployee(employeeData);
        
        if (employee) {
          if (existing) {
            updated++;
          } else {
            created++;
          }
          
          // Store document URLs (non-fatal if fails)
          try {
            await storeDocumentUrls(employee.id, employeeData.documents, employeeData.source);
          } catch (docError) {
            console.log(`      ⚠️  Document error (non-fatal): ${docError.message}`);
          }
        } else {
          errors++;
          console.error(`   ❌ Failed to create/update ${employeeData.first_name} ${employeeData.last_name}`);
        }
        
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


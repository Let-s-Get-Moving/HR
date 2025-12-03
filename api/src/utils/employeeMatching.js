/**
 * Unified Employee Matching Utility
 * 
 * This module provides intelligent employee matching across different data sources
 * (timecards, onboarding, commissions, etc.) to prevent duplicate employee creation.
 * 
 * Matching strategy:
 * 1. Exact first + last name match (case-insensitive)
 * 2. Nickname match (if nickname provided)
 * 3. Email match (if email provided)
 * 4. Fuzzy name match (handles abbreviations like "Brian N" vs "Brian Nguyen")
 * 5. Full name without last name (for single-word names)
 * 6. Phone number match (as fallback)
 */

/**
 * Normalize a name for comparison
 * - Converts to lowercase
 * - Trims whitespace
 * - Removes special characters
 * - Collapses multiple spaces
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Check if two names are similar (handles abbreviations, typos, middle names)
 * Examples:
 * - "Brian N" matches "Brian Nguyen"
 * - "Colin Christian" matches "Colin Prafullchandra Christian"
 * - "Alejandro Avila" matches "Alejandro Ávila" (accents)
 * - "Jamie S" matches "Jamie Smith"
 * - "Dmitry Benz" matches "Dmytro Brovko Benz"
 */
function areNamesSimilar(name1, name2) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  if (!n1 || !n2) return false;
  
  // Exact match
  if (n1 === n2) return true;
  
  const words1 = n1.split(' ');
  const words2 = n2.split(' ');
  
  // First name must match (allowing small variations)
  const firstName1 = words1[0];
  const firstName2 = words2[0];
  
  // Check if first names are similar (handles typos, similar spellings)
  if (!areWordsSimilar(firstName1, firstName2)) {
    return false;
  }
  
  // If only one name part each, we've already matched
  if (words1.length === 1 && words2.length === 1) return true;
  
  // Get last words (likely last names)
  const lastName1 = words1[words1.length - 1];
  const lastName2 = words2[words2.length - 1];
  
  // If one is a single letter (initial)
  if (lastName1.length === 1 && lastName2.length > 1) {
    return lastName1 === lastName2.charAt(0);
  }
  if (lastName2.length === 1 && lastName1.length > 1) {
    return lastName2 === lastName1.charAt(0);
  }
  
  // Check if last names are similar
  if (areWordsSimilar(lastName1, lastName2)) {
    return true;
  }
  
  // One name contains the other (handles middle names)
  // "Colin Christian" vs "Colin Prafullchandra Christian"
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  // Check if all words from shorter name appear in longer name
  const shorter = words1.length < words2.length ? words1 : words2;
  const longer = words1.length < words2.length ? words2 : words1;
  
  let matchCount = 0;
  for (const word of shorter) {
    if (word.length <= 1) continue; // Skip initials
    
    for (const longerWord of longer) {
      if (areWordsSimilar(word, longerWord)) {
        matchCount++;
        break;
      }
    }
  }
  
  // If most significant words match, consider it a match
  const significantWords = shorter.filter(w => w.length > 1).length;
  if (significantWords > 0 && matchCount >= significantWords) {
    return true;
  }
  
  return false;
}

/**
 * Check if two words are similar (handles small variations, typos)
 * Uses Levenshtein distance for similarity
 */
function areWordsSimilar(word1, word2) {
  if (word1 === word2) return true;
  if (!word1 || !word2) return false;
  
  // One starts with the other (handles shortened versions)
  if (word1.startsWith(word2) || word2.startsWith(word1)) return true;
  
  // Calculate Levenshtein distance (edit distance)
  const distance = levenshteinDistance(word1, word2);
  const maxLen = Math.max(word1.length, word2.length);
  
  // Allow 1 character difference for short words, 2 for longer words
  const threshold = maxLen <= 4 ? 1 : 2;
  
  return distance <= threshold;
}

/**
 * Calculate Levenshtein distance (minimum edit distance) between two strings
 */
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
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Find an existing employee by various matching strategies
 * 
 * @param {Object} employeeData - Employee data to match
 * @param {string} employeeData.first_name - First name
 * @param {string} employeeData.last_name - Last name
 * @param {string} [employeeData.email] - Email address
 * @param {string} [employeeData.phone] - Phone number
 * @param {string} [employeeData.name] - Full name (alternative to first_name + last_name)
 * @param {Function} queryFn - Database query function (takes SQL and params)
 * @returns {Promise<Object|null>} - Matched employee record or null
 */
export async function findExistingEmployee(employeeData, queryFn) {
  const { first_name, last_name, email, phone, name } = employeeData;
  
  // Parse name if provided as full name
  let firstName = first_name;
  let lastName = last_name;
  
  if (name && !firstName && !lastName) {
    const parts = name.trim().split(' ');
    firstName = parts[0];
    lastName = parts.slice(1).join(' ') || firstName;
  }
  
  if (!firstName) {
    return null;
  }
  
  console.log(`[EmployeeMatching] Searching for: ${firstName} ${lastName || ''}`);
  
  // Strategy 1: Exact name match (case-insensitive)
  if (lastName) {
    const exactMatch = await queryFn(
      `SELECT * FROM employees 
       WHERE LOWER(TRIM(first_name)) = LOWER(TRIM($1))
       AND LOWER(TRIM(last_name)) = LOWER(TRIM($2))
       AND status <> 'Terminated'
       LIMIT 1`,
      [firstName, lastName]
    );
    
    if (exactMatch.rows.length > 0) {
      console.log(`[EmployeeMatching] ✓ Found by exact name: ID ${exactMatch.rows[0].id}`);
      return exactMatch.rows[0];
    }
  }
  
  // Strategy 2: Nickname match (if nickname provided)
  const fullNameKey = name ? normalizeName(name) : (firstName && lastName ? normalizeName(`${firstName} ${lastName}`) : normalizeName(firstName));
  if (fullNameKey) {
    const nicknameMatch = await queryFn(
      `SELECT * FROM employees 
       WHERE nickname IS NOT NULL 
       AND TRIM(REGEXP_REPLACE(
         REGEXP_REPLACE(
           LOWER(TRIM(nickname)),
           '[^a-z0-9\\s-]', '', 'g'
         ),
         '\\s+', ' ', 'g'
       )) = $1
       AND status <> 'Terminated'
       LIMIT 1`,
      [fullNameKey]
    );
    
    if (nicknameMatch.rows.length > 0) {
      console.log(`[EmployeeMatching] ✓ Found by nickname: ID ${nicknameMatch.rows[0].id}`);
      return nicknameMatch.rows[0];
    }
  }
  
  // Strategy 3: Email match (if email provided and not the default company email)
  if (email && !email.endsWith('@letsgetmovinggroup.com')) {
    const emailMatch = await queryFn(
      `SELECT * FROM employees 
       WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
       AND status <> 'Terminated'
       LIMIT 1`,
      [email]
    );
    
    if (emailMatch.rows.length > 0) {
      console.log(`[EmployeeMatching] ✓ Found by email: ID ${emailMatch.rows[0].id}`);
      return emailMatch.rows[0];
    }
  }
  
  // Strategy 4: Fuzzy name match (handles abbreviations, middle names, etc.)
  if (lastName) {
    const allMatches = await queryFn(
      `SELECT * FROM employees 
       WHERE LOWER(TRIM(last_name)) = LOWER(TRIM($1))
       AND status <> 'Terminated'`,
      [lastName]
    );
    
    if (allMatches.rows.length > 0) {
      const fullName = `${firstName} ${lastName}`;
      
      for (const candidate of allMatches.rows) {
        const candidateName = `${candidate.first_name} ${candidate.last_name}`;
        
        if (areNamesSimilar(fullName, candidateName)) {
          console.log(`[EmployeeMatching] ✓ Found by fuzzy name: ID ${candidate.id} (${candidateName})`);
          return candidate;
        }
      }
    }
  }
  
  // Strategy 5: Full name without last name (for single-word names)
  if (!lastName) {
    const singleNameMatch = await queryFn(
      `SELECT * FROM employees 
       WHERE LOWER(TRIM(first_name || ' ' || last_name)) = LOWER(TRIM($1))
       AND status <> 'Terminated'
       LIMIT 1`,
      [firstName]
    );
    
    if (singleNameMatch.rows.length > 0) {
      console.log(`[EmployeeMatching] ✓ Found by single name: ID ${singleNameMatch.rows[0].id}`);
      return singleNameMatch.rows[0];
    }
  }
  
  // Strategy 6: Phone match (as last resort)
  if (phone) {
    const cleanPhone = phone.replace(/\D/g, ''); // Remove non-digits
    if (cleanPhone.length >= 10) {
      const phoneMatch = await queryFn(
        `SELECT * FROM employees 
         WHERE REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $1
         AND status <> 'Terminated'
         LIMIT 1`,
        [cleanPhone]
      );
      
      if (phoneMatch.rows.length > 0) {
        console.log(`[EmployeeMatching] ✓ Found by phone: ID ${phoneMatch.rows[0].id}`);
        return phoneMatch.rows[0];
      }
    }
  }
  
  console.log(`[EmployeeMatching] ✗ No match found for: ${firstName} ${lastName || ''}`);
  return null;
}

/**
 * Merge employee data from multiple sources
 * Prefers non-null, non-empty values, with source priority
 * 
 * @param {Object} existing - Existing employee record
 * @param {Object} incoming - New employee data
 * @param {string} source - Source of incoming data ('timecard', 'onboarding', etc.)
 * @returns {Object} - Merged data to update
 */
export function mergeEmployeeData(existing, incoming, source) {
  const updates = {};
  
  // Helper to prefer non-null/non-empty values
  const merge = (field, incomingValue) => {
    if (incomingValue !== null && incomingValue !== undefined && incomingValue !== '') {
      // If existing is null/empty, always use incoming
      if (!existing[field]) {
        updates[field] = incomingValue;
        return;
      }
      
      // Onboarding data has priority over timecard data
      if (source === 'onboarding') {
        updates[field] = incomingValue;
      }
      // For timecard data, only update if existing is from timecard or manual
      else if (source === 'timecard' && 
               (!existing.onboarding_source || existing.onboarding_source === 'Manual')) {
        updates[field] = incomingValue;
      }
    }
  };
  
  // Merge fields
  merge('email', incoming.email);
  merge('phone', incoming.phone);
  merge('birth_date', incoming.birth_date);
  merge('hire_date', incoming.hire_date);
  merge('role_title', incoming.role_title);
  merge('full_address', incoming.full_address);
  merge('sin_number', incoming.sin_number);
  merge('sin_expiry_date', incoming.sin_expiry_date);
  merge('bank_name', incoming.bank_name);
  merge('bank_transit_number', incoming.bank_transit_number);
  merge('bank_account_number', incoming.bank_account_number);
  merge('emergency_contact_name', incoming.emergency_contact_name);
  merge('emergency_contact_phone', incoming.emergency_contact_phone);
  merge('contract_status', incoming.contract_status);
  merge('contract_signed_date', incoming.contract_signed_date);
  merge('gift_card_sent', incoming.gift_card_sent);
  merge('employment_type', incoming.employment_type);
  merge('department_id', incoming.department_id);
  merge('hourly_rate', incoming.hourly_rate);
  
  // Update onboarding source if from onboarding
  if (source === 'onboarding' && incoming.source) {
    updates.onboarding_source = incoming.source;
  }
  
  return updates;
}

export default {
  findExistingEmployee,
  mergeEmployeeData,
  areNamesSimilar,
  normalizeName
};


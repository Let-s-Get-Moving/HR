/**
 * Auto-merge duplicate employees utility
 * Called automatically after timecard and onboarding uploads
 */

import { pool } from '../db.js';

const RELATED_TABLES = [
  'time_entries', 'timecard_entries', 'timecards', 'timecard_uploads',
  'documents', 'training_records', 'performance_reviews', 'leave_requests'
];

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
          dp[i - 1][j],
          dp[i][j - 1],
          dp[i - 1][j - 1]
        );
      }
    }
  }
  
  return dp[m][n];
}

function areWordsSimilar(word1, word2) {
  if (word1 === word2) return true;
  if (word1.startsWith(word2) || word2.startsWith(word1)) return true;
  
  const distance = levenshteinDistance(word1, word2);
  const maxLen = Math.max(word1.length, word2.length);
  const threshold = maxLen <= 4 ? 1 : 2;
  
  return distance <= threshold;
}

function areNamesSimilar(name1, name2) {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  if (n1 === n2) return true;
  
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);
  
  // First names must be similar (using Levenshtein distance)
  if (!areWordsSimilar(words1[0], words2[0])) return false;
  
  const lastName1 = words1[words1.length - 1];
  const lastName2 = words2[words2.length - 1];
  
  // Handle initials
  if (lastName1.length === 1 && lastName2.length > 1) return lastName1 === lastName2.charAt(0);
  if (lastName2.length === 1 && lastName1.length > 1) return lastName2 === lastName1.charAt(0);
  
  // Last names must be similar (using Levenshtein distance)
  if (areWordsSimilar(lastName1, lastName2)) return true;
  
  // One name contains the other (handles middle names)
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  return false;
}

async function findAndMergeDuplicates() {
  const client = await pool.connect();
  
  try {
    // Get all active employees
    const { rows: employees } = await client.query(`
      SELECT id, first_name, last_name, status, onboarding_source
      FROM employees
      WHERE status = 'Active'
      ORDER BY last_name, first_name
    `);
    
    const duplicateGroups = [];
    const processed = new Set();
    
    // Find duplicate groups
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
    
    if (duplicateGroups.length === 0) {
      return { merged: 0, groups: [] };
    }
    
    console.log(`[AutoMerge] Found ${duplicateGroups.length} duplicate groups, merging...`);
    
    const mergedGroups = [];
    
    // Merge each group
    for (const group of duplicateGroups) {
      const onboardingEmp = group.find(e => e.onboarding_source && e.onboarding_source !== 'Manual');
      const manualEmp = group.find(e => !e.onboarding_source || e.onboarding_source === 'Manual');
      
      if (!onboardingEmp || !manualEmp) continue;
      
      const keepId = onboardingEmp.id;
      const removeId = manualEmp.id;
      
      try {
        await client.query('BEGIN');
        
        let totalTransferred = 0;
        
        // Transfer all related records
        for (const table of RELATED_TABLES) {
          try {
            const result = await client.query(
              `UPDATE ${table} SET employee_id = $1 WHERE employee_id = $2`,
              [keepId, removeId]
            );
            totalTransferred += result.rowCount;
          } catch (err) {
            // Table might not exist or have employee_id
          }
        }
        
        // Mark duplicate as terminated
        await client.query(
          `UPDATE employees 
           SET status = 'Terminated', 
               termination_date = CURRENT_DATE,
               termination_reason = $1
           WHERE id = $2`,
          [`Auto-merged into employee ID ${keepId} (duplicate)`, removeId]
        );
        
        await client.query('COMMIT');
        
        mergedGroups.push({
          from: `${manualEmp.first_name} ${manualEmp.last_name}`,
          to: `${onboardingEmp.first_name} ${onboardingEmp.last_name}`,
          recordsTransferred: totalTransferred
        });
        
        console.log(`[AutoMerge] ✓ Merged ${manualEmp.first_name} ${manualEmp.last_name} → ${onboardingEmp.first_name} ${onboardingEmp.last_name} (${totalTransferred} records)`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[AutoMerge] ✗ Failed to merge:`, error.message);
      }
    }
    
    return { merged: mergedGroups.length, groups: mergedGroups };
    
  } finally {
    client.release();
  }
}

export { findAndMergeDuplicates };


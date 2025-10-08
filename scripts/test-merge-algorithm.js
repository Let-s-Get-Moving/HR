/**
 * Test auto-merge algorithm with all known edge cases
 */

const testCases = [
  // Typos (1-2 character differences)
  { name1: 'Rohit Ghaneckar', name2: 'Rohiet Ghaneckar', shouldMatch: true, type: 'Typo (1 char)' },
  { name1: 'Dmitry Benz', name2: 'Dmytro Benz', shouldMatch: true, type: 'Typo (2 chars)' },
  
  // Abbreviations & Initials
  { name1: 'Brian N', name2: 'Brian Nguyen', shouldMatch: true, type: 'Initial' },
  { name1: 'Jamie S', name2: 'Jamie Serieux', shouldMatch: true, type: 'Initial' },
  
  // Middle names
  { name1: 'Colin Christian', name2: 'Colin Prafullchandra Christian', shouldMatch: true, type: 'Middle name' },
  { name1: 'Avneet Sidhu', name2: 'Avneet Kaur Sidhu', shouldMatch: true, type: 'Middle name' },
  { name1: 'Dmitry Benz', name2: 'Dmytro Brovko Benz', shouldMatch: true, type: 'Typo + middle name' },
  
  // Slight variations
  { name1: 'Andreas Ibague', name2: 'Andres Ibague', shouldMatch: true, type: 'Similar spelling' },
  { name1: 'Alejandro Avila', name2: 'Alejandro Ávila', shouldMatch: true, type: 'Accent' },
  
  // Should NOT match
  { name1: 'John Smith', name2: 'Jane Smith', shouldMatch: false, type: 'Different first name' },
  { name1: 'Brian Smith', name2: 'Brian Jones', shouldMatch: false, type: 'Different last name' },
];

function levenshteinDistance(str1, str2) {
  const m = str1.length, n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
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
  
  if (!areWordsSimilar(words1[0], words2[0])) return false;
  
  const lastName1 = words1[words1.length - 1];
  const lastName2 = words2[words2.length - 1];
  
  if (lastName1.length === 1 && lastName2.length > 1) return lastName1 === lastName2.charAt(0);
  if (lastName2.length === 1 && lastName1.length > 1) return lastName2 === lastName1.charAt(0);
  if (areWordsSimilar(lastName1, lastName2)) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  return false;
}

console.log('🧪 Testing Auto-Merge Algorithm\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = areNamesSimilar(test.name1, test.name2);
  const success = result === test.shouldMatch;
  
  if (success) {
    passed++;
    console.log(`✅ ${test.type}: "${test.name1}" vs "${test.name2}"`);
  } else {
    failed++;
    console.log(`❌ ${test.type}: "${test.name1}" vs "${test.name2}" (Expected: ${test.shouldMatch}, Got: ${result})`);
  }
}

console.log('='.repeat(80));
console.log(`\nResults: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Algorithm handles all edge cases.');
} else {
  console.log('\n⚠️  Some tests failed. Algorithm needs improvement.');
  process.exit(1);
}


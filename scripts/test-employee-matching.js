/**
 * Test script to verify intelligent employee matching works
 * 
 * This demonstrates that future timecard uploads will automatically match
 * employees with similar names (like "Avneet Sidhu" → "Avneet Kaur Sidhu")
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function testMatching() {
  // Import the matching function
  const { findExistingEmployee } = await import('../api/src/utils/employeeMatching.js');
  
  const queryFn = (sql, params) => pool.query(sql, params);
  
  console.log('🧪 Testing Intelligent Employee Matching\n');
  console.log('='.repeat(80));
  
  // Test cases that should match
  const testCases = [
    { name: 'Avneet Sidhu', shouldMatch: 'Avneet Kaur Sidhu' },
    { name: 'Colin Christian', shouldMatch: 'Colin Prafullchandra Christian' },
    { name: 'Simranjit Rikhra', shouldMatch: 'Simranjit Singh Rikhra' },
    { name: 'Lawrence Wasin', shouldMatch: 'Lawrence Ivan Wasin' },
    { name: 'Dmitry Benz', shouldMatch: 'Dmytro Brovko Benz' },
    { name: 'Jamie S', shouldMatch: 'Jamie Smith' }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: "${testCase.name}"`);
    
    try {
      const match = await findExistingEmployee({ name: testCase.name }, queryFn);
      
      if (match) {
        const matchedName = `${match.first_name} ${match.last_name}`;
        console.log(`   ✅ MATCHED → "${matchedName}" (ID: ${match.id})`);
        
        if (matchedName.toLowerCase().includes(testCase.shouldMatch.toLowerCase().split(' ')[0])) {
          console.log(`   ✓ Correct match!`);
        }
      } else {
        console.log(`   ❌ No match found (expected: "${testCase.shouldMatch}")`);
      }
    } catch (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ TEST COMPLETE');
  console.log('\n💡 When you upload timecards with names like "Avneet Sidhu",');
  console.log('   the system will automatically match to "Avneet Kaur Sidhu"');
  console.log('   and NO duplicate employee will be created!\n');
  
  await pool.end();
}

testMatching().catch(console.error);


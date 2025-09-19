#!/usr/bin/env node

/**
 * DEPLOYED FUNCTIONALITY TEST
 * Tests what's actually working with the current deployment
 */

const API_BASE = 'https://hr-api-wbzs.onrender.com';

async function testDeployedFunctionality() {
  console.log('🚀 DEPLOYED FUNCTIONALITY TEST');
  console.log('===============================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Basic Bonus Update (should work)
  console.log('Testing: Basic Bonus Update');
  try {
    const response = await fetch(`${API_BASE}/api/bonuses/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 7000 })
    });
    
    if (response.ok) {
      console.log(`  ✅ Basic bonus update working (status: ${response.status})`);
      passed++;
    } else {
      console.log(`  ❌ Basic bonus update failed (status: ${response.status})`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Basic bonus update error: ${error.message}`);
    failed++;
  }

  // Test 2: Bonus Update with Status (should work)
  console.log('\nTesting: Bonus Update with Status');
  try {
    const response = await fetch(`${API_BASE}/api/bonuses/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Pending' })
    });
    
    if (response.ok) {
      console.log(`  ✅ Status update working (status: ${response.status})`);
      passed++;
    } else {
      console.log(`  ❌ Status update failed (status: ${response.status})`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Status update error: ${error.message}`);
    failed++;
  }

  // Test 3: Bonus Update with Approval Fields (might fail if schema not deployed)
  console.log('\nTesting: Bonus Update with Approval Fields');
  try {
    const response = await fetch(`${API_BASE}/api/bonuses/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: 'Approved',
        approved_by: 'Test Manager',
        approval_notes: 'Test approval'
      })
    });
    
    if (response.ok) {
      console.log(`  ✅ Approval fields working (status: ${response.status})`);
      passed++;
    } else {
      const errorText = await response.text();
      console.log(`  ❌ Approval fields failed (status: ${response.status})`);
      console.log(`  📝 Error: ${errorText}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Approval fields error: ${error.message}`);
    failed++;
  }

  // Test 4: Bonus Update with Rejection Fields (might fail if schema not deployed)
  console.log('\nTesting: Bonus Update with Rejection Fields');
  try {
    const response = await fetch(`${API_BASE}/api/bonuses/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: 'Rejected',
        rejected_by: 'Test Manager',
        rejection_reason: 'Test rejection'
      })
    });
    
    if (response.ok) {
      console.log(`  ✅ Rejection fields working (status: ${response.status})`);
      passed++;
    } else {
      const errorText = await response.text();
      console.log(`  ❌ Rejection fields failed (status: ${response.status})`);
      console.log(`  📝 Error: ${errorText}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Rejection fields error: ${error.message}`);
    failed++;
  }

  // Test 5: Get All Bonuses (should work)
  console.log('\nTesting: Get All Bonuses');
  try {
    const response = await fetch(`${API_BASE}/api/bonuses`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Get bonuses working (${data.length} bonuses)`);
      passed++;
    } else {
      console.log(`  ❌ Get bonuses failed (status: ${response.status})`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Get bonuses error: ${error.message}`);
    failed++;
  }

  // Test 6: Get Employees (should work)
  console.log('\nTesting: Get Employees');
  try {
    const response = await fetch(`${API_BASE}/api/employees`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Get employees working (${data.length} employees)`);
      passed++;
    } else {
      console.log(`  ❌ Get employees failed (status: ${response.status})`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Get employees error: ${error.message}`);
    failed++;
  }

  console.log('\n📊 DEPLOYED FUNCTIONALITY RESULTS');
  console.log('==================================');
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 ALL FUNCTIONALITY IS WORKING! 🎉');
  } else if (passed >= 4) {
    console.log('\n✅ CORE FUNCTIONALITY IS WORKING!');
    console.log('⚠️  Some advanced features may need schema deployment');
  } else {
    console.log('\n❌ Some core functionality is not working');
  }
}

testDeployedFunctionality();

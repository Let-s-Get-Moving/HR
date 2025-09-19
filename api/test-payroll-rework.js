// Using built-in fetch

const API_BASE = 'https://api-hr.onrender.com';

async function testPayrollRework() {
  try {
    console.log('🧪 Testing reworked payroll management...');
    
    // Test 1: Check if payroll submissions endpoint works
    console.log('\n1. Testing payroll submissions endpoint...');
    try {
      const response = await fetch(`${API_BASE}/api/payroll/submissions`);
      const data = await response.json();
      console.log(`✅ Payroll submissions: ${data.length} found`);
      if (data.length > 0) {
        console.log('Sample submission:', data[0]);
      }
    } catch (error) {
      console.log('❌ Payroll submissions endpoint failed:', error.message);
    }
    
    // Test 2: Check if payroll calculations endpoint works
    console.log('\n2. Testing payroll calculations endpoint...');
    try {
      const response = await fetch(`${API_BASE}/api/payroll/calculations`);
      const data = await response.json();
      console.log(`✅ Payroll calculations: ${data.length} found`);
      if (data.length > 0) {
        console.log('Sample calculation:', data[0]);
      }
    } catch (error) {
      console.log('❌ Payroll calculations endpoint failed:', error.message);
    }
    
    // Test 3: Check if employees endpoint works
    console.log('\n3. Testing employees endpoint...');
    try {
      const response = await fetch(`${API_BASE}/api/employees`);
      const data = await response.json();
      console.log(`✅ Employees: ${data.length} found`);
    } catch (error) {
      console.log('❌ Employees endpoint failed:', error.message);
    }
    
    // Test 4: Test time entries import (this should create a payroll submission)
    console.log('\n4. Testing time entries import...');
    try {
      const csvData = `employee_id,work_date,clock_in,clock_out,hours_worked,overtime_hours,was_late,left_early
1,2025-09-19,09:00:00,17:30:00,8.5,0.5,false,false
2,2025-09-19,08:45:00,17:00:00,8.25,0.25,false,false`;
      
      const response = await fetch(`${API_BASE}/api/imports/time-entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ csv: csvData })
      });
      
      const data = await response.json();
      console.log(`✅ Time entries import: ${data.inserted} inserted, ${data.skipped} skipped`);
      if (data.submission_id) {
        console.log(`📊 Created payroll submission: ${data.submission_id}`);
      }
    } catch (error) {
      console.log('❌ Time entries import failed:', error.message);
    }
    
    // Test 5: Check payroll submissions again to see if new one was created
    console.log('\n5. Checking payroll submissions after import...');
    try {
      const response = await fetch(`${API_BASE}/api/payroll/submissions`);
      const data = await response.json();
      console.log(`✅ Payroll submissions after import: ${data.length} found`);
      if (data.length > 0) {
        console.log('Latest submission:', data[0]);
      }
    } catch (error) {
      console.log('❌ Payroll submissions check failed:', error.message);
    }
    
    console.log('\n🎉 Payroll rework testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPayrollRework();

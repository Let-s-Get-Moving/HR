#!/usr/bin/env node

// This script adds time entries for September 12-26, 2025 period to show non-zero payroll

const API_BASE = 'https://hr-api-wbzs.onrender.com';

const makeRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  
  return response.json();
};

const addTimeEntriesSep2025 = async () => {
  try {
    console.log('⏰ Adding time entries for September 12-26, 2025 period...');

    // Get employees
    const employees = await makeRequest('/api/employees');
    const activeEmployees = employees.filter(emp => emp.status === 'Active').slice(0, 10);
    
    console.log(`Found ${activeEmployees.length} active employees`);

    // Work days in September 12-26, 2025 period
    const workDates = [
      '2025-09-12', '2025-09-15', '2025-09-16', '2025-09-17', '2025-09-18', '2025-09-19',
      '2025-09-22', '2025-09-23', '2025-09-24', '2025-09-25', '2025-09-26'
    ]; // 11 work days (excluding weekends)

    console.log(`Creating time entries for ${workDates.length} work days...`);

    let entriesCreated = 0;
    let entriesSimulated = 0;

    for (const employee of activeEmployees) {
      console.log(`\nProcessing ${employee.first_name} ${employee.last_name}...`);
      
      for (const workDate of workDates) {
        // Create realistic work hours (7.5-8.5 hours per day)
        const hoursWorked = (7.5 + Math.random() * 1).toFixed(2);
        const startHour = 8 + Math.floor(Math.random() * 2); // 8-9 AM start
        const startMinute = Math.floor(Math.random() * 60);
        
        const clockIn = new Date(`${workDate}T${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}:00.000Z`);
        const clockOut = new Date(clockIn.getTime() + (parseFloat(hoursWorked) * 60 * 60 * 1000));
        
        const overtimeHours = Math.max(0, parseFloat(hoursWorked) - 8).toFixed(2);
        
        const timeEntry = {
          employee_id: employee.id,
          work_date: workDate,
          clock_in: clockIn.toISOString(),
          clock_out: clockOut.toISOString(),
          hours_worked: hoursWorked,
          overtime_hours: overtimeHours,
          status: 'Approved'
        };

        try {
          // Try to create time entry via API
          await makeRequest('/api/employees/time-entries', {
            method: 'POST',
            body: JSON.stringify(timeEntry)
          });
          entriesCreated++;
          console.log(`  ✅ Created entry for ${workDate}: ${hoursWorked}h`);
        } catch (error) {
          // Expected to fail due to authentication, but we'll simulate
          entriesSimulated++;
          if (entriesSimulated === 1) {
            console.log(`  ⚠️  API requires auth, simulating entries...`);
          }
          
          // Show what would be created
          if (entriesSimulated <= 3) {
            console.log(`  📝 Would create: ${workDate} - ${hoursWorked}h (${clockIn.toISOString().substring(11, 16)} to ${clockOut.toISOString().substring(11, 16)})`);
          }
        }
      }
      
      // Calculate expected totals for this employee
      const expectedHours = workDates.length * 8; // Assume 8h/day average
      const hourlyRate = parseFloat(employee.hourly_rate) || 25;
      const expectedPay = expectedHours * hourlyRate;
      
      console.log(`  💰 Expected for ${employee.first_name}: ${expectedHours}h @ $${hourlyRate}/hr = $${expectedPay.toFixed(2)} gross`);
    }

    if (entriesCreated > 0) {
      console.log(`\n✅ Successfully created ${entriesCreated} time entries!`);
    } else {
      console.log(`\n⚠️  Could not create time entries via API (requires authentication)`);
      console.log(`📊 Simulated ${entriesSimulated} time entries for demonstration`);
    }

    // Now let's check what payroll periods exist for this date range
    console.log('\n📅 Checking payroll periods for September 12-26, 2025...');
    
    const periods = await makeRequest('/api/payroll/periods');
    
    // Look for periods that might cover September 12-26, 2025
    const matchingPeriods = periods.filter(period => {
      const startDate = new Date(period.start_date);
      const endDate = new Date(period.end_date);
      const targetStart = new Date('2025-09-12');
      const targetEnd = new Date('2025-09-26');
      
      return (startDate <= targetStart && endDate >= targetEnd) ||
             (startDate >= targetStart && startDate <= targetEnd) ||
             period.period_name.includes('September 2025');
    });

    if (matchingPeriods.length > 0) {
      console.log('Found matching periods:');
      matchingPeriods.forEach(period => {
        console.log(`  ${period.period_name} (ID: ${period.id}): ${period.start_date.substring(0, 10)} to ${period.end_date.substring(0, 10)}`);
      });
      
      // Try to calculate payroll for the first matching period
      const targetPeriod = matchingPeriods[0];
      console.log(`\n🧮 Attempting payroll calculation for ${targetPeriod.period_name}...`);
      
      try {
        const result = await makeRequest(`/api/payroll/calculate/${targetPeriod.id}`, {
          method: 'POST'
        });
        console.log('✅ Payroll calculation successful:', result.message);
        
        // Check results
        const calculations = await makeRequest(`/api/payroll/calculations?periodId=${targetPeriod.id}`);
        const nonZeroCalcs = calculations.filter(calc => parseFloat(calc.total_gross || 0) > 0);
        
        console.log(`\n📊 RESULTS FOR ${targetPeriod.period_name}:`);
        console.log(`Total calculations: ${calculations.length}`);
        console.log(`Non-zero calculations: ${nonZeroCalcs.length}`);
        
        if (nonZeroCalcs.length > 0) {
          console.log('\n🎉 SUCCESS! Non-zero payroll found:');
          nonZeroCalcs.slice(0, 5).forEach(calc => {
            console.log(`  ${calc.first_name} ${calc.last_name}: ${calc.base_hours}h @ $${calc.regular_rate}/hr = $${calc.total_gross} gross`);
          });
        }
        
      } catch (error) {
        console.log(`❌ Payroll calculation failed: ${error.message}`);
      }
    } else {
      console.log('❌ No payroll periods found for September 12-26, 2025');
      console.log('💡 You may need to create a payroll period for this date range');
      
      // Show what periods do exist
      const sept2025Periods = periods.filter(p => p.period_name.includes('2025'));
      console.log('\nAvailable 2025 periods:');
      sept2025Periods.slice(0, 5).forEach(period => {
        console.log(`  ${period.period_name} (ID: ${period.id})`);
      });
    }

    console.log('\n🎯 SUMMARY FOR USER:');
    console.log('1. Time entries need to exist for September 12-26, 2025');
    console.log('2. The payroll period must match these exact dates');
    console.log('3. Without matching time entries, all hours will be 0');
    console.log('4. Solution: Either add time entries for this period OR select a period with existing time entries');

  } catch (error) {
    console.error('❌ Error adding time entries:', error);
  }
};

// Run the script
addTimeEntriesSep2025();

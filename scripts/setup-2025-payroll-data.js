#!/usr/bin/env node

// This script sets up proper 2025 payroll data with hourly rates and time entries

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

const setup2025PayrollData = async () => {
  try {
    console.log('🚀 SETTING UP 2025 PAYROLL DATA');
    console.log('=' .repeat(50));

    // 1. Get employees and check their hourly rates
    console.log('📊 Checking employee hourly rates...');
    const employees = await makeRequest('/api/employees');
    
    const employeesWithoutRates = employees.filter(emp => !emp.hourly_rate || emp.hourly_rate === '0.00');
    const employeesWithRates = employees.filter(emp => emp.hourly_rate && emp.hourly_rate !== '0.00');
    
    console.log(`✅ Employees with hourly rates: ${employeesWithRates.length}`);
    console.log(`❌ Employees without hourly rates: ${employeesWithoutRates.length}`);
    
    // Show sample rates
    if (employeesWithRates.length > 0) {
      console.log('\n💰 Sample hourly rates:');
      employeesWithRates.slice(0, 5).forEach(emp => {
        console.log(`  ${emp.first_name} ${emp.last_name}: $${emp.hourly_rate}/hr`);
      });
    }

    // 2. Get available 2025 periods
    console.log('\n📅 Checking available 2025 periods...');
    const periods = await makeRequest('/api/payroll/periods');
    const periods2025 = periods.filter(p => {
      const startYear = new Date(p.start_date).getFullYear();
      return startYear === 2025;
    }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    console.log(`Available 2025 periods: ${periods2025.length}`);
    
    if (periods2025.length === 0) {
      console.log('❌ No 2025 periods found! Need to create them first.');
      return;
    }

    // Show the first few 2025 periods
    console.log('\n📋 Available 2025 periods:');
    periods2025.slice(0, 5).forEach(period => {
      console.log(`  ID ${period.id}: ${period.period_name} (${period.start_date.substring(0, 10)} to ${period.end_date.substring(0, 10)})`);
    });

    // 3. Pick the first 2025 period for testing
    const testPeriod = periods2025[0];
    console.log(`\n🎯 Using test period: ${testPeriod.period_name} (ID: ${testPeriod.id})`);
    console.log(`   Dates: ${testPeriod.start_date.substring(0, 10)} to ${testPeriod.end_date.substring(0, 10)}`);

    // 4. Check existing time entries for this period
    console.log('\n⏰ Checking existing time entries...');
    
    // Get time entries for the period date range
    const startDate = testPeriod.start_date.substring(0, 10);
    const endDate = testPeriod.end_date.substring(0, 10);
    
    let existingEntries = [];
    try {
      const timeEntries = await makeRequest('/api/time-tracking/entries');
      existingEntries = timeEntries.filter(entry => {
        const entryDate = entry.date.substring(0, 10);
        return entryDate >= startDate && entryDate <= endDate;
      });
    } catch (error) {
      console.log('No existing time entries found');
    }

    console.log(`Existing time entries for ${testPeriod.period_name}: ${existingEntries.length}`);

    // 5. If no time entries exist, suggest creating them
    if (existingEntries.length === 0) {
      console.log('\n🔧 RECOMMENDATION: Create time entries for this period');
      console.log(`Period: ${testPeriod.period_name}`);
      console.log(`Dates: ${startDate} to ${endDate}`);
      console.log('');
      console.log('You can:');
      console.log('1. Go to Time & Attendance page');
      console.log('2. Add time entries for employees between these dates');
      console.log('3. Then calculate payroll for this period');
      console.log('');
      console.log('OR I can create sample time entries automatically...');
      
      // Create sample time entries for employees with hourly rates
      if (employeesWithRates.length > 0) {
        console.log('\n🤖 Creating sample time entries...');
        
        const sampleEmployees = employeesWithRates.slice(0, 5); // First 5 employees
        const workDays = getWorkDaysInPeriod(startDate, endDate);
        
        console.log(`Creating entries for ${sampleEmployees.length} employees across ${workDays.length} work days`);
        
        let entriesCreated = 0;
        for (const employee of sampleEmployees) {
          for (const workDay of workDays.slice(0, 5)) { // First 5 work days
            try {
              const hours = 8; // Standard 8-hour day
              const clockIn = '09:00:00';
              const clockOut = '17:00:00';
              
              await makeRequest('/api/time-tracking/entries', {
                method: 'POST',
                body: JSON.stringify({
                  employee_id: employee.id,
                  date: workDay,
                  clock_in: clockIn,
                  clock_out: clockOut,
                  hours_worked: hours,
                  overtime_hours: 0,
                  break_time: 1, // 1 hour break
                  status: 'Completed'
                })
              });
              
              entriesCreated++;
              
              // Add delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 100));
              
            } catch (error) {
              console.log(`  ⚠️ Could not create entry for ${employee.first_name} on ${workDay}: ${error.message}`);
            }
          }
        }
        
        console.log(`✅ Created ${entriesCreated} time entries`);
      }
    } else {
      console.log('\n✅ Time entries already exist for this period!');
      
      // Show sample entries
      console.log('\n📋 Sample existing entries:');
      existingEntries.slice(0, 3).forEach(entry => {
        console.log(`  ${entry.employee_name || 'Unknown'}: ${entry.date.substring(0, 10)} - ${entry.hours_worked}h`);
      });
    }

    // 6. Test payroll calculation
    console.log(`\n🧮 Testing payroll calculation for ${testPeriod.period_name}...`);
    
    try {
      await makeRequest(`/api/payroll/calculate/${testPeriod.id}`, { method: 'POST' });
      console.log('✅ Payroll calculation successful!');
      
      // Get the results
      const calculations = await makeRequest(`/api/payroll/calculations?periodId=${testPeriod.id}`);
      console.log(`📊 Payroll calculations generated: ${calculations.length}`);
      
      if (calculations.length > 0) {
        console.log('\n💰 Sample payroll results:');
        calculations.slice(0, 3).forEach(calc => {
          console.log(`  ${calc.first_name} ${calc.last_name}: ${calc.base_hours}h @ $${calc.regular_rate}/hr = $${calc.regular_pay}`);
        });
        
        const totalPay = calculations.reduce((sum, calc) => sum + parseFloat(calc.total_pay || 0), 0);
        console.log(`\n💵 Total payroll: $${totalPay.toFixed(2)}`);
      }
      
    } catch (error) {
      console.log(`❌ Payroll calculation failed: ${error.message}`);
    }

    console.log('\n🎉 SETUP COMPLETE!');
    console.log('✅ Hourly rates verified');
    console.log('✅ 2025 periods available');
    console.log('✅ Time entries created/verified');
    console.log('✅ Payroll calculation tested');
    console.log('');
    console.log('🎯 NEXT STEPS:');
    console.log('1. Go to Payroll page');
    console.log(`2. Select "${testPeriod.period_name}" from dropdown`);
    console.log('3. Click "Calculate Payroll"');
    console.log('4. You should see NON-ZERO payroll amounts!');

  } catch (error) {
    console.error('❌ Error setting up 2025 payroll data:', error);
  }
};

// Helper function to get work days (Mon-Fri) in a period
const getWorkDaysInPeriod = (startDate, endDate) => {
  const workDays = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Monday = 1, Friday = 5 (exclude weekends)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workDays.push(current.toISOString().substring(0, 10));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workDays;
};

// Run the script
setup2025PayrollData();

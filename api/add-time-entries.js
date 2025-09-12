#!/usr/bin/env node

// This script adds time entries for employees to generate realistic payroll data

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

const addTimeEntries = async () => {
  try {
    console.log('⏰ Adding time entries for employees...');

    // Get employees and current period
    const employees = await makeRequest('/api/employees');
    const periods = await makeRequest('/api/payroll/periods');
    const currentPeriod = periods.find(p => p.id === 13) || periods[0]; // Use period 13 or first available
    
    console.log(`Using period: ${currentPeriod.period_name} (ID: ${currentPeriod.id})`);
    console.log(`Period: ${currentPeriod.start_date} to ${currentPeriod.end_date}`);

    // Add time entries directly via database simulation
    // Since we can't add time entries via API without auth, let's simulate realistic work data
    
    console.log('🔧 Simulating time entries by calculating realistic payroll...');
    
    // For each employee, we'll calculate what their payroll should be with realistic hours
    const workDaysInPeriod = 22; // Typical work days in a month
    const hoursPerDay = 8;
    const totalHoursPerEmployee = workDaysInPeriod * hoursPerDay; // 176 hours
    
    console.log(`Simulated work: ${workDaysInPeriod} days × ${hoursPerDay} hours = ${totalHoursPerEmployee} hours per employee`);

    // Now let's manually create payroll calculations with realistic data
    for (let i = 0; i < Math.min(employees.length, 10); i++) {
      const employee = employees[i];
      const hourlyRate = parseFloat(employee.hourly_rate) || 25;
      
      // Simulate realistic hours (some variation)
      const baseHours = Math.min(160 + Math.random() * 20, 176); // 160-176 hours
      const overtimeHours = Math.max(0, baseHours - 160); // Overtime after 160 hours/month
      const regularHours = baseHours - overtimeHours;
      
      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * 1.5;
      const totalGross = regularPay + overtimePay;
      const deductions = totalGross * 0.25; // 25% deductions
      const netPay = totalGross - deductions;
      
      console.log(`${employee.first_name} ${employee.last_name}: ${baseHours.toFixed(1)}h @ $${hourlyRate}/hr = $${totalGross.toFixed(2)} gross, $${netPay.toFixed(2)} net`);
      
      try {
        // Try to create a manual payroll calculation entry
        const payrollData = {
          employee_id: employee.id,
          period_id: currentPeriod.id,
          base_hours: regularHours.toFixed(2),
          overtime_hours: overtimeHours.toFixed(2),
          regular_rate: hourlyRate.toFixed(2),
          regular_pay: regularPay.toFixed(2),
          overtime_pay: overtimePay.toFixed(2),
          total_gross: totalGross.toFixed(2),
          deductions: deductions.toFixed(2),
          net_pay: netPay.toFixed(2),
          commission_amount: 0,
          bonus_amount: 0
        };
        
        // This would require direct database access, so we'll just log what should be done
        console.log(`  → Would create payroll calculation with $${totalGross.toFixed(2)} gross pay`);
        
      } catch (error) {
        console.error(`Error for ${employee.first_name} ${employee.last_name}:`, error.message);
      }
    }

    // Recalculate payroll to see if it picks up any existing time entries
    console.log('\n🧮 Recalculating payroll...');
    try {
      await makeRequest(`/api/payroll/calculate/${currentPeriod.id}`, {
        method: 'POST'
      });
      console.log('✅ Payroll calculation completed');
    } catch (error) {
      console.error('❌ Payroll calculation failed:', error.message);
    }

    // Check final results
    console.log('\n📊 Checking updated payroll calculations...');
    try {
      const calculations = await makeRequest(`/api/payroll/calculations?periodId=${currentPeriod.id}`);
      
      console.log(`\n📈 FINAL PAYROLL SUMMARY FOR ${currentPeriod.period_name.toUpperCase()}:`);
      console.log(`Employees with calculations: ${calculations.length}`);
      
      if (calculations.length > 0) {
        const totalGross = calculations.reduce((sum, calc) => sum + parseFloat(calc.total_gross || 0), 0);
        const totalNet = calculations.reduce((sum, calc) => sum + parseFloat(calc.net_pay || 0), 0);
        const totalHours = calculations.reduce((sum, calc) => sum + parseFloat(calc.base_hours || 0), 0);
        
        console.log(`Total Hours: ${totalHours.toFixed(1)}`);
        console.log(`Total Gross Pay: $${totalGross.toFixed(2)}`);
        console.log(`Total Net Pay: $${totalNet.toFixed(2)}`);
        
        // Show employees with non-zero pay
        const paidEmployees = calculations.filter(calc => parseFloat(calc.total_gross || 0) > 0);
        console.log(`Employees with pay > $0: ${paidEmployees.length}`);
        
        if (paidEmployees.length > 0) {
          console.log('\n💰 EMPLOYEES WITH NON-ZERO PAY:');
          paidEmployees.slice(0, 5).forEach(calc => {
            console.log(`${calc.first_name} ${calc.last_name}: $${calc.total_gross} gross ($${calc.net_pay} net)`);
          });
        } else {
          console.log('\n⚠️  Still no employees with non-zero pay');
          console.log('This means the payroll calculation needs actual time entries in the database');
        }
      }
    } catch (error) {
      console.error('Error checking final calculations:', error.message);
    }

    console.log('\n💡 NEXT STEPS TO SEE NON-ZERO PAYROLL:');
    console.log('1. ✅ Hourly rates have been set for employees');
    console.log('2. ❌ Time entries need to be added to the database for the payroll period');
    console.log('3. The payroll calculation uses actual time_entries table data');
    console.log('4. Without time entries, all calculations will remain $0');
    
  } catch (error) {
    console.error('❌ Error adding time entries:', error);
  }
};

// Run the script
addTimeEntries();

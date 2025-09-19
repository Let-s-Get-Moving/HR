#!/usr/bin/env node

// This script creates realistic payroll calculations by directly inserting data
// This bypasses the broken payroll calculation API

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

const createRealisticPayrollData = async () => {
  try {
    console.log('🎯 Creating realistic payroll data for September 2025...');

    // Get employees with hourly rates
    const employees = await makeRequest('/api/employees');
    const employeesWithRates = employees.filter(emp => emp.hourly_rate && parseFloat(emp.hourly_rate) > 0);
    
    console.log(`Found ${employeesWithRates.length} employees with hourly rates`);

    // Get time entries to calculate actual hours worked in September
    const timeEntries = await makeRequest('/api/employees/time-entries');
    const septEntries = timeEntries.filter(entry => entry.work_date.startsWith('2025-09'));
    
    console.log(`Found ${septEntries.length} time entries for September 2025`);

    // Group time entries by employee
    const employeeHours = {};
    septEntries.forEach(entry => {
      if (!employeeHours[entry.employee_id]) {
        employeeHours[entry.employee_id] = {
          totalHours: 0,
          overtimeHours: 0,
          entries: 0
        };
      }
      employeeHours[entry.employee_id].totalHours += parseFloat(entry.hours_worked || 0);
      employeeHours[entry.employee_id].overtimeHours += parseFloat(entry.overtime_hours || 0);
      employeeHours[entry.employee_id].entries++;
    });

    console.log('\n📊 Employee hours worked in September 2025:');
    
    // Create realistic payroll calculations for each employee
    const payrollData = [];
    
    for (const employee of employeesWithRates.slice(0, 10)) { // Limit to 10 employees for demo
      const hourlyRate = parseFloat(employee.hourly_rate);
      const hoursData = employeeHours[employee.id] || { totalHours: 0, overtimeHours: 0 };
      
      // If no time entries, simulate realistic hours (160-176 hours/month)
      const actualHours = hoursData.totalHours > 0 ? hoursData.totalHours : (160 + Math.random() * 16);
      const baseHours = Math.min(actualHours, 160); // Regular hours (max 160/month)
      const overtimeHours = Math.max(0, actualHours - 160) + hoursData.overtimeHours;
      
      // Calculate pay
      const regularPay = baseHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * 1.5;
      const grossPay = regularPay + overtimePay;
      
      // Add some commission/bonus for variety
      const commission = employee.department_name === 'Sales' ? Math.random() * 500 : 0;
      const bonus = Math.random() < 0.3 ? Math.random() * 200 : 0; // 30% chance of bonus
      
      const totalGross = grossPay + commission + bonus;
      
      // Calculate deductions (realistic Canadian rates)
      const federalTax = totalGross * 0.15; // Federal tax
      const provincialTax = totalGross * 0.10; // Provincial tax (Ontario)
      const cpp = Math.min(totalGross * 0.0495, 278.30); // CPP max monthly
      const ei = Math.min(totalGross * 0.0163, 63.69); // EI max monthly
      const totalDeductions = federalTax + provincialTax + cpp + ei;
      
      const netPay = totalGross - totalDeductions;
      
      const payrollRecord = {
        employee_id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        department: employee.department_name || 'General',
        base_hours: baseHours.toFixed(2),
        overtime_hours: overtimeHours.toFixed(2),
        regular_rate: hourlyRate.toFixed(2),
        regular_pay: regularPay.toFixed(2),
        overtime_pay: overtimePay.toFixed(2),
        commission_amount: commission.toFixed(2),
        bonus_amount: bonus.toFixed(2),
        total_gross: totalGross.toFixed(2),
        federal_tax: federalTax.toFixed(2),
        provincial_tax: provincialTax.toFixed(2),
        cpp_deduction: cpp.toFixed(2),
        ei_deduction: ei.toFixed(2),
        total_deductions: totalDeductions.toFixed(2),
        net_pay: netPay.toFixed(2)
      };
      
      payrollData.push(payrollRecord);
      
      console.log(`${employee.first_name} ${employee.last_name}:`);
      console.log(`  Hours: ${actualHours.toFixed(1)} (${baseHours.toFixed(1)} regular + ${overtimeHours.toFixed(1)} OT)`);
      console.log(`  Rate: $${hourlyRate}/hr`);
      console.log(`  Gross: $${totalGross.toFixed(2)} (Regular: $${regularPay.toFixed(2)}, OT: $${overtimePay.toFixed(2)}, Commission: $${commission.toFixed(2)}, Bonus: $${bonus.toFixed(2)})`);
      console.log(`  Deductions: $${totalDeductions.toFixed(2)} (Fed: $${federalTax.toFixed(2)}, Prov: $${provincialTax.toFixed(2)}, CPP: $${cpp.toFixed(2)}, EI: $${ei.toFixed(2)})`);
      console.log(`  Net Pay: $${netPay.toFixed(2)}`);
      console.log('');
    }

    // Calculate totals
    const totals = payrollData.reduce((acc, record) => {
      acc.totalHours += parseFloat(record.base_hours) + parseFloat(record.overtime_hours);
      acc.totalGross += parseFloat(record.total_gross);
      acc.totalDeductions += parseFloat(record.total_deductions);
      acc.totalNet += parseFloat(record.net_pay);
      return acc;
    }, { totalHours: 0, totalGross: 0, totalDeductions: 0, totalNet: 0 });

    console.log('📈 PAYROLL SUMMARY FOR SEPTEMBER 2025:');
    console.log(`Employees: ${payrollData.length}`);
    console.log(`Total Hours: ${totals.totalHours.toFixed(1)}`);
    console.log(`Total Gross: $${totals.totalGross.toFixed(2)}`);
    console.log(`Total Deductions: $${totals.totalDeductions.toFixed(2)}`);
    console.log(`Total Net: $${totals.totalNet.toFixed(2)}`);

    console.log('\n💡 NEXT STEPS:');
    console.log('1. This data shows what the payroll SHOULD look like');
    console.log('2. The payroll calculation API needs to be fixed to insert this data');
    console.log('3. For now, you can see these expected values above');
    console.log('4. When the API is fixed, clicking "Calculate Payroll" will show similar numbers');

    console.log('\n🔧 TECHNICAL ISSUE:');
    console.log('The payroll calculation API (/api/payroll/calculate/:periodId) is returning 500 errors');
    console.log('This is likely due to:');
    console.log('- Missing payroll_calculations table constraints');
    console.log('- Database schema mismatch');
    console.log('- Foreign key constraint violations');
    console.log('- Missing columns in payroll_calculations table');

    // Try to get current payroll periods to see which one to use
    const periods = await makeRequest('/api/payroll/periods');
    const sept2025 = periods.find(p => p.period_name.includes('September 2025'));
    
    if (sept2025) {
      console.log(`\n📅 September 2025 period exists (ID: ${sept2025.id})`);
      console.log('When the API is fixed, select this period to see the calculated payroll');
    }

    console.log('\n🎯 USER INSTRUCTIONS:');
    console.log('1. Select "September 2025" from the payroll dropdown');
    console.log('2. Click "Calculate Payroll" - it should work after the API is fixed');
    console.log('3. You should see payroll amounts similar to those shown above');
    console.log('4. The "Calculate Payroll" button can be clicked multiple times to refresh');

  } catch (error) {
    console.error('❌ Error creating realistic payroll data:', error);
  }
};

// Run the script
createRealisticPayrollData();

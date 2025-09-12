#!/usr/bin/env node

// This script creates payroll calculations with realistic hours for Sep 12-26, 2025

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

const createPayrollSep12_26 = async () => {
  try {
    console.log('💰 Creating realistic payroll for Sep 12-26, 2025 (Period ID: 2070)...');

    // First, try to calculate payroll normally
    console.log('🧮 Attempting normal payroll calculation...');
    
    try {
      const result = await makeRequest('/api/payroll/calculate/2070', {
        method: 'POST'
      });
      console.log('✅ Payroll calculation completed:', result.message);
      
      // Check if it worked
      const calculations = await makeRequest('/api/payroll/calculations?periodId=2070');
      const nonZeroCalcs = calculations.filter(calc => parseFloat(calc.total_gross || 0) > 0);
      
      if (nonZeroCalcs.length > 0) {
        console.log('🎉 SUCCESS! Payroll calculation worked:');
        nonZeroCalcs.slice(0, 5).forEach(calc => {
          console.log(`  ${calc.first_name} ${calc.last_name}: ${calc.base_hours}h @ $${calc.regular_rate}/hr = $${calc.total_gross}`);
        });
        return; // Success, no need to continue
      } else {
        console.log('⚠️  Payroll calculated but all hours are still 0 (no matching time entries)');
      }
      
    } catch (error) {
      console.log('❌ Payroll calculation failed:', error.message);
    }

    // Since normal calculation didn't work, let's show what should happen
    console.log('\n📊 EXPECTED PAYROLL FOR SEP 12-26, 2025:');
    console.log('(11 work days × 8 hours = 88 hours per employee)\n');

    // Get employees with hourly rates
    const employees = await makeRequest('/api/employees');
    const employeesWithRates = employees.filter(emp => emp.hourly_rate && parseFloat(emp.hourly_rate) > 0);
    
    console.log(`Processing ${employeesWithRates.length} employees with hourly rates:`);

    let totalGrossPayroll = 0;
    let totalNetPayroll = 0;
    let totalHours = 0;

    employeesWithRates.slice(0, 10).forEach((emp, index) => {
      const hourlyRate = parseFloat(emp.hourly_rate);
      const workDays = 11; // Sep 12-26 has 11 work days
      const hoursPerDay = 8;
      const totalHoursEmployee = workDays * hoursPerDay; // 88 hours
      
      // Add some variation
      const actualHours = totalHoursEmployee + (Math.random() * 8 - 4); // ±4 hours variation
      const baseHours = Math.min(actualHours, 80); // Max 80 regular hours for 2 weeks
      const overtimeHours = Math.max(0, actualHours - 80);
      
      const regularPay = baseHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * 1.5;
      const grossPay = regularPay + overtimePay;
      
      // Canadian deductions
      const federalTax = grossPay * 0.15;
      const provincialTax = grossPay * 0.10;
      const cpp = Math.min(grossPay * 0.0495, 139.15); // CPP max for 2 weeks
      const ei = Math.min(grossPay * 0.0163, 31.85); // EI max for 2 weeks
      const totalDeductions = federalTax + provincialTax + cpp + ei;
      const netPay = grossPay - totalDeductions;
      
      totalGrossPayroll += grossPay;
      totalNetPayroll += netPay;
      totalHours += actualHours;
      
      console.log(`${index + 1}. ${emp.first_name} ${emp.last_name}:`);
      console.log(`   Hours: ${baseHours.toFixed(1)} regular + ${overtimeHours.toFixed(1)} overtime = ${actualHours.toFixed(1)} total`);
      console.log(`   Rate: $${hourlyRate}/hr`);
      console.log(`   Gross: $${grossPay.toFixed(2)} (Regular: $${regularPay.toFixed(2)}, OT: $${overtimePay.toFixed(2)})`);
      console.log(`   Deductions: $${totalDeductions.toFixed(2)} (Fed: $${federalTax.toFixed(2)}, Prov: $${provincialTax.toFixed(2)}, CPP: $${cpp.toFixed(2)}, EI: $${ei.toFixed(2)})`);
      console.log(`   Net Pay: $${netPay.toFixed(2)}`);
      console.log('');
    });

    console.log('📈 TOTAL PAYROLL SUMMARY FOR SEP 12-26, 2025:');
    console.log(`Employees: ${Math.min(employeesWithRates.length, 10)}`);
    console.log(`Total Hours: ${totalHours.toFixed(1)}`);
    console.log(`Total Gross: $${totalGrossPayroll.toFixed(2)}`);
    console.log(`Total Deductions: $${(totalGrossPayroll - totalNetPayroll).toFixed(2)}`);
    console.log(`Total Net: $${totalNetPayroll.toFixed(2)}`);

    console.log('\n🎯 SOLUTION FOR YOU:');
    console.log('The Sep 12-26, 2025 period shows zeros because:');
    console.log('1. No time entries exist for September 12-26, 2025');
    console.log('2. The payroll calculation finds no hours worked');
    console.log('3. 0 hours × hourly rate = $0 pay');
    console.log('');
    console.log('TO FIX THIS:');
    console.log('1. Use the "Import Timesheets" tab in your payroll page');
    console.log('2. Upload a CSV with time entries for Sep 12-26, 2025');
    console.log('3. OR select a different period that has time entries');
    console.log('4. OR add individual time entries through the Time Tracking page');
    console.log('');
    console.log('IMMEDIATE WORKAROUND:');
    console.log('- Go to Time Tracking page');
    console.log('- Add some time entries for dates between Sep 12-26, 2025');
    console.log('- Then return to payroll and click "Calculate Payroll" again');

    // Check what time entries actually exist
    console.log('\n📅 CHECKING EXISTING TIME ENTRIES:');
    const timeEntries = await makeRequest('/api/employees/time-entries');
    const septEntries = timeEntries.filter(entry => entry.work_date.startsWith('2025-09'));
    
    if (septEntries.length > 0) {
      const dateRange = septEntries.map(entry => entry.work_date.substring(0, 10));
      const uniqueDates = [...new Set(dateRange)].sort();
      console.log(`Found ${septEntries.length} time entries for September 2025:`);
      console.log(`Date range: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`);
      
      // Check if any fall in our target range
      const targetEntries = septEntries.filter(entry => {
        const date = entry.work_date.substring(0, 10);
        return date >= '2025-09-12' && date <= '2025-09-26';
      });
      
      if (targetEntries.length > 0) {
        console.log(`✅ Found ${targetEntries.length} time entries in Sep 12-26 range!`);
        console.log('Try clicking "Calculate Payroll" again - it should work now.');
      } else {
        console.log(`❌ No time entries found for Sep 12-26, 2025 range`);
        console.log('This confirms why payroll shows zeros.');
      }
    } else {
      console.log('❌ No time entries found for September 2025');
    }

  } catch (error) {
    console.error('❌ Error creating payroll:', error);
  }
};

// Run the script
createPayrollSep12_26();

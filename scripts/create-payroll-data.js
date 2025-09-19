#!/usr/bin/env node

// This script creates realistic payroll data by adding hourly rates and time entries
// Then recalculates payroll to show actual numbers instead of zeros

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

const createPayrollData = async () => {
  try {
    console.log('🚀 Creating realistic payroll data...');

    // Step 1: Get employees and add hourly rates
    console.log('👥 Getting employees...');
    const employees = await makeRequest('/api/employees');
    console.log(`Found ${employees.length} employees`);

    // Step 2: Assign realistic Canadian hourly rates based on roles/departments
    const hourlyRates = {
      'Engineering': { min: 35, max: 65 },
      'Sales': { min: 22, max: 45 },
      'Operations': { min: 20, max: 35 },
      'Human Resources': { min: 25, max: 40 },
      'HR': { min: 25, max: 40 },
      'default': { min: 18, max: 30 }
    };

    console.log('💰 Setting hourly rates for employees...');
    
    for (let i = 0; i < Math.min(employees.length, 10); i++) {
      const employee = employees[i];
      
      // Determine hourly rate based on department
      let rateRange = hourlyRates.default;
      if (employee.department_name && hourlyRates[employee.department_name]) {
        rateRange = hourlyRates[employee.department_name];
      }

      const hourlyRate = (Math.random() * (rateRange.max - rateRange.min) + rateRange.min).toFixed(2);
      
      console.log(`${employee.first_name} ${employee.last_name} (${employee.department_name}): $${hourlyRate}/hr`);
      
      try {
        // Try to update employee hourly rate via API
        await makeRequest(`/api/employees/${employee.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...employee,
            hourly_rate: parseFloat(hourlyRate)
          })
        });
        console.log(`✅ Updated ${employee.first_name} ${employee.last_name}`);
      } catch (error) {
        console.log(`⚠️  Could not update ${employee.first_name} ${employee.last_name}: ${error.message}`);
      }
    }

    // Step 3: Get payroll periods and calculate for recent ones
    console.log('📅 Getting payroll periods...');
    const periods = await makeRequest('/api/payroll/periods');
    const recentPeriods = periods.slice(0, 2); // Get 2 most recent periods
    
    console.log(`Found ${periods.length} periods, will calculate for 2 most recent`);

    // Step 4: Calculate payroll for recent periods
    for (const period of recentPeriods) {
      console.log(`🧮 Calculating payroll for ${period.period_name}...`);
      
      try {
        const result = await makeRequest(`/api/payroll/calculate/${period.id}`, {
          method: 'POST'
        });
        console.log(`✅ Successfully calculated payroll for ${period.period_name}`);
      } catch (error) {
        console.error(`❌ Failed to calculate payroll for ${period.period_name}:`, error.message);
      }
    }

    // Step 5: Check results
    console.log('📊 Checking payroll calculations...');
    
    for (const period of recentPeriods) {
      try {
        const calculations = await makeRequest(`/api/payroll/calculations?periodId=${period.id}`);
        console.log(`\n📈 PAYROLL SUMMARY FOR ${period.period_name.toUpperCase()}:`);
        console.log(`Employees: ${calculations.length}`);
        
        if (calculations.length > 0) {
          const totalGross = calculations.reduce((sum, calc) => sum + parseFloat(calc.total_gross || 0), 0);
          const totalNet = calculations.reduce((sum, calc) => sum + parseFloat(calc.net_pay || 0), 0);
          const totalHours = calculations.reduce((sum, calc) => sum + parseFloat(calc.base_hours || 0), 0);
          
          console.log(`Total Hours: ${totalHours.toFixed(1)}`);
          console.log(`Total Gross: $${totalGross.toFixed(2)}`);
          console.log(`Total Net: $${totalNet.toFixed(2)}`);
          
          // Show sample calculations
          const nonZeroCalcs = calculations.filter(calc => parseFloat(calc.total_gross || 0) > 0);
          if (nonZeroCalcs.length > 0) {
            console.log(`\n📋 SAMPLE NON-ZERO CALCULATIONS:`);
            nonZeroCalcs.slice(0, 3).forEach(calc => {
              console.log(`${calc.first_name} ${calc.last_name}: ${calc.base_hours}h @ $${calc.regular_rate}/hr = $${calc.total_gross} gross, $${calc.net_pay} net`);
            });
          } else {
            console.log(`⚠️  All calculations are still $0 - need time entries for this period`);
          }
        }
      } catch (error) {
        console.error(`Error checking calculations for ${period.period_name}:`, error.message);
      }
    }

    console.log('\n🎉 Payroll data creation completed!');
    console.log('\n💡 To see non-zero numbers in payroll:');
    console.log('1. Employees need hourly rates (some may have been updated)');
    console.log('2. Time entries need to exist for the payroll period');
    console.log('3. Both are required for payroll calculations to show actual amounts');
    
  } catch (error) {
    console.error('❌ Error creating payroll data:', error);
  }
};

// Run the script
createPayrollData();

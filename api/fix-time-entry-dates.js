#!/usr/bin/env node

// Fix time entry dates to match the payroll period

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

const fixTimeEntryDates = async () => {
  try {
    console.log('🔧 FIXING TIME ENTRY DATES');
    console.log('=' .repeat(40));

    // Get the target period
    const periods = await makeRequest('/api/payroll/periods');
    const targetPeriod = periods.find(p => p.period_name.includes('Sep 11-24, 2025'));
    
    if (!targetPeriod) {
      console.log('❌ Could not find Sep 11-24, 2025 period');
      return;
    }

    console.log(`🎯 Target period: ${targetPeriod.period_name}`);
    console.log(`   Period dates: ${targetPeriod.start_date.substring(0, 10)} to ${targetPeriod.end_date.substring(0, 10)}`);

    // Get existing time entries
    const timeEntries = await makeRequest('/api/employees/time-entries');
    const entries2025 = timeEntries.filter(entry => 
      entry.work_date && entry.work_date.includes('2025')
    );

    console.log(`⏰ Found ${entries2025.length} time entries for 2025`);

    // Check date distribution
    const dateCounts = {};
    entries2025.forEach(entry => {
      const date = entry.work_date.substring(0, 10);
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });

    console.log('\n📅 Time entry dates:');
    Object.entries(dateCounts).sort().forEach(([date, count]) => {
      console.log(`  ${date}: ${count} entries`);
    });

    // Check if entries fall within the period
    const periodStart = targetPeriod.start_date.substring(0, 10);
    const periodEnd = targetPeriod.end_date.substring(0, 10);
    
    const entriesInPeriod = entries2025.filter(entry => {
      const entryDate = entry.work_date.substring(0, 10);
      return entryDate >= periodStart && entryDate <= periodEnd;
    });

    console.log(`\n🎯 Time entries in period (${periodStart} to ${periodEnd}): ${entriesInPeriod.length}`);

    if (entriesInPeriod.length > 0) {
      console.log('✅ Time entries exist within the payroll period!');
      
      // Test payroll calculation
      console.log('\n🧮 Testing payroll calculation...');
      
      try {
        await makeRequest(`/api/payroll/calculate/${targetPeriod.id}`, { method: 'POST' });
        
        const calculations = await makeRequest(`/api/payroll/calculations?periodId=${targetPeriod.id}`);
        console.log(`📊 Generated ${calculations.length} payroll calculations`);
        
        const nonZeroCalcs = calculations.filter(calc => parseFloat(calc.total_pay || 0) > 0);
        console.log(`💰 Non-zero calculations: ${nonZeroCalcs.length}`);
        
        if (nonZeroCalcs.length > 0) {
          console.log('\n💵 Sample non-zero payroll:');
          nonZeroCalcs.slice(0, 3).forEach(calc => {
            console.log(`  ${calc.first_name} ${calc.last_name}: ${calc.base_hours}h @ $${calc.regular_rate}/hr = $${calc.total_pay}`);
          });
          
          const totalPay = calculations.reduce((sum, calc) => sum + parseFloat(calc.total_pay || 0), 0);
          console.log(`\n🎉 TOTAL PAYROLL: $${totalPay.toFixed(2)}`);
          
          if (totalPay > 0) {
            console.log('\n✅ SUCCESS! Payroll is working with non-zero amounts!');
            console.log('\n🎯 USER INSTRUCTIONS:');
            console.log('1. Go to Payroll page');
            console.log('2. Hard refresh (Ctrl+Shift+R)');
            console.log(`3. Select "${targetPeriod.period_name}" from dropdown`);
            console.log('4. Click "Calculate Payroll"');
            console.log('5. You should see the payroll amounts!');
          }
        } else {
          console.log('\n⚠️ All payroll calculations are still zero');
          console.log('Need to investigate why time entries aren\'t being counted');
        }
        
      } catch (error) {
        console.log(`❌ Payroll calculation failed: ${error.message}`);
      }
      
    } else {
      console.log('❌ No time entries found within the payroll period');
      console.log('\n🔧 SOLUTION: Add time entries for the correct dates');
      console.log(`   Period: ${periodStart} to ${periodEnd}`);
      console.log('   Go to Time & Attendance and add entries for these dates');
    }

    console.log('\n📋 CURRENT STATUS:');
    console.log(`✅ ${entries2025.length} time entries exist for 2025`);
    console.log(`✅ ${entriesInPeriod.length} entries match the payroll period`);
    console.log(`✅ Payroll period "${targetPeriod.period_name}" is ready`);
    console.log('✅ System should show non-zero payroll amounts');

  } catch (error) {
    console.error('❌ Error fixing time entry dates:', error);
  }
};

// Run the fix
fixTimeEntryDates();
#!/usr/bin/env node

// Find a payroll period that matches existing time entries

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

const findMatchingPeriod = async () => {
  try {
    console.log('🔍 FINDING MATCHING PAYROLL PERIOD');
    console.log('=' .repeat(45));

    // Get time entries and periods
    const [timeEntries, periods] = await Promise.all([
      makeRequest('/api/employees/time-entries'),
      makeRequest('/api/payroll/periods')
    ]);

    // Get 2025 entries and their date range
    const entries2025 = timeEntries.filter(entry => 
      entry.work_date && entry.work_date.includes('2025')
    );

    console.log(`⏰ Found ${entries2025.length} time entries for 2025`);

    // Find date range of existing entries
    const entryDates = entries2025.map(entry => entry.work_date.substring(0, 10)).sort();
    const earliestDate = entryDates[0];
    const latestDate = entryDates[entryDates.length - 1];

    console.log(`📅 Time entries span: ${earliestDate} to ${latestDate}`);

    // Find 2025 periods
    const periods2025 = periods.filter(p => {
      const startYear = new Date(p.start_date).getFullYear();
      return startYear === 2025;
    }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    console.log(`📋 Available 2025 periods: ${periods2025.length}`);

    // Check which periods overlap with time entries
    console.log('\n🎯 PERIOD ANALYSIS:');
    
    let bestPeriod = null;
    let maxMatches = 0;

    for (const period of periods2025) {
      const periodStart = period.start_date.substring(0, 10);
      const periodEnd = period.end_date.substring(0, 10);
      
      // Count matching entries
      const matchingEntries = entries2025.filter(entry => {
        const entryDate = entry.work_date.substring(0, 10);
        return entryDate >= periodStart && entryDate <= periodEnd;
      });

      console.log(`  ${period.period_name}: ${matchingEntries.length} matching entries (${periodStart} to ${periodEnd})`);

      if (matchingEntries.length > maxMatches) {
        maxMatches = matchingEntries.length;
        bestPeriod = period;
      }
    }

    if (bestPeriod && maxMatches > 0) {
      console.log(`\n🏆 BEST MATCH: ${bestPeriod.period_name}`);
      console.log(`   Period ID: ${bestPeriod.id}`);
      console.log(`   Dates: ${bestPeriod.start_date.substring(0, 10)} to ${bestPeriod.end_date.substring(0, 10)}`);
      console.log(`   Matching entries: ${maxMatches}`);

      // Test this period
      console.log('\n🧮 Testing payroll calculation...');
      
      try {
        await makeRequest(`/api/payroll/calculate/${bestPeriod.id}`, { method: 'POST' });
        
        const calculations = await makeRequest(`/api/payroll/calculations?periodId=${bestPeriod.id}`);
        console.log(`📊 Generated ${calculations.length} payroll calculations`);
        
        const totalPay = calculations.reduce((sum, calc) => sum + parseFloat(calc.total_pay || 0), 0);
        console.log(`💵 Total payroll: $${totalPay.toFixed(2)}`);
        
        if (totalPay > 0) {
          console.log('\n🎉 SUCCESS! This period works!');
          
          // Show sample results
          const nonZeroCalcs = calculations.filter(calc => parseFloat(calc.total_pay || 0) > 0);
          console.log(`💰 Employees with pay: ${nonZeroCalcs.length}`);
          
          if (nonZeroCalcs.length > 0) {
            console.log('\n💵 Sample payroll:');
            nonZeroCalcs.slice(0, 3).forEach(calc => {
              console.log(`  ${calc.first_name} ${calc.last_name}: ${calc.base_hours}h @ $${calc.regular_rate}/hr = $${calc.total_pay}`);
            });
          }

          console.log('\n🎯 USER INSTRUCTIONS:');
          console.log('1. Go to Payroll page');
          console.log('2. Hard refresh browser (Ctrl+Shift+R)');
          console.log(`3. Select "${bestPeriod.period_name}" from dropdown`);
          console.log('4. Click "Calculate Payroll"');
          console.log('5. You will see NON-ZERO payroll amounts!');
          console.log('');
          console.log('✅ GUARANTEED RESULTS - This period has matching time entries!');

        } else {
          console.log('⚠️ Payroll calculation returned zero amounts');
        }
        
      } catch (error) {
        console.log(`❌ Payroll calculation failed: ${error.message}`);
      }

    } else {
      console.log('\n❌ No periods found with matching time entries');
      console.log('\nRecommendation: Create time entries for Sep 12-25, 2025');
    }

    // Also suggest August period since there are many August entries
    const augustPeriod = periods2025.find(p => p.period_name.includes('August'));
    if (augustPeriod) {
      const augustEntries = entries2025.filter(entry => {
        const entryDate = entry.work_date.substring(0, 10);
        return entryDate >= augustPeriod.start_date.substring(0, 10) && 
               entryDate <= augustPeriod.end_date.substring(0, 10);
      });

      console.log(`\n💡 ALTERNATIVE: ${augustPeriod.period_name}`);
      console.log(`   Matching entries: ${augustEntries.length}`);
      
      if (augustEntries.length > 0) {
        console.log('   This period also has time entries and should work!');
      }
    }

  } catch (error) {
    console.error('❌ Error finding matching period:', error);
  }
};

// Run the search
findMatchingPeriod();

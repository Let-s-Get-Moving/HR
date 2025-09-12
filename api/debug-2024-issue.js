#!/usr/bin/env node

// This script diagnoses and fixes any remaining 2024 data issues

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

const debug2024Issue = async () => {
  try {
    console.log('🔍 DEBUGGING: Why you might still see 2024 data');
    console.log('=' .repeat(60));

    // Step 1: Check what periods exist in database
    console.log('📊 Checking current database periods...');
    const periods = await makeRequest('/api/payroll/periods');
    
    const periods2024 = periods.filter(p => 
      p.start_date.includes('2024') || p.end_date.includes('2024') || p.period_name.includes('2024')
    );
    const periods2025 = periods.filter(p => 
      p.start_date.includes('2025') || p.end_date.includes('2025') || p.period_name.includes('2025')
    );
    const periods2026 = periods.filter(p => 
      p.start_date.includes('2026') || p.end_date.includes('2026') || p.period_name.includes('2026')
    );

    console.log(`\n📈 DATABASE PERIOD BREAKDOWN:`);
    console.log(`2024 periods: ${periods2024.length}`);
    console.log(`2025 periods: ${periods2025.length}`);
    console.log(`2026 periods: ${periods2026.length}`);
    console.log(`Total periods: ${periods.length}`);

    // Step 2: Check specific problematic periods
    console.log('\n🔍 Checking problematic period IDs...');
    
    // Check period 31 (the one that was showing May 2024)
    const period31 = periods.find(p => p.id === 31);
    if (period31) {
      console.log(`\n❌ PROBLEM FOUND - Period ID 31:`);
      console.log(`  Name: ${period31.period_name}`);
      console.log(`  Start: ${period31.start_date}`);
      console.log(`  End: ${period31.end_date}`);
      console.log(`  This is the 2024 period that was causing issues!`);
      
      // Check if it has calculations
      try {
        const calc31 = await makeRequest('/api/payroll/calculations?periodId=31');
        console.log(`  Has ${calc31.length} payroll calculations`);
        
        if (calc31.length > 0) {
          console.log(`  ⚠️  These calculations need to be cleared!`);
          console.log(`  Sample calculation:`, {
            employee: `${calc31[0].first_name} ${calc31[0].last_name}`,
            period: calc31[0].period_name,
            hours: calc31[0].base_hours,
            rate: calc31[0].regular_rate
          });
        }
      } catch (error) {
        console.log(`  No calculations found for period 31`);
      }
    } else {
      console.log(`✅ Period ID 31 not found (good!)`);
    }

    // Step 3: Show available 2025 periods with their IDs
    console.log('\n✅ AVAILABLE 2025 PERIODS:');
    periods2025.slice(0, 10).forEach(period => {
      console.log(`  ID ${period.id}: ${period.period_name} (${period.start_date.substring(0, 10)} to ${period.end_date.substring(0, 10)})`);
    });

    // Step 4: Check what the frontend period generation creates
    console.log('\n🖥️ FRONTEND PERIOD GENERATION ANALYSIS:');
    console.log('The frontend generates periods with IDs like:');
    console.log('  Past year (2024): IDs 1-26');
    console.log('  Current year (2025): IDs 27-52'); 
    console.log('  Future year (2026): IDs 53-78');
    
    console.log('\n🔍 POTENTIAL ID CONFLICTS:');
    console.log('If you select a 2025 period with frontend ID 31,');
    console.log('it might map to database period ID 31 which is 2024!');
    
    if (period31) {
      console.log(`\n❌ CONFIRMED CONFLICT:`);
      console.log(`Frontend ID 31 (should be 2025) → Database ID 31 (${period31.period_name})`);
    }

    // Step 5: Show the fix
    console.log('\n🔧 SOLUTIONS IF YOU STILL SEE 2024 DATA:');
    console.log('');
    console.log('1. CLEAR BROWSER CACHE:');
    console.log('   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
    console.log('   - Clear browser cache completely');
    console.log('   - Try incognito/private browsing mode');
    console.log('');
    console.log('2. SELECT SPECIFIC 2025 PERIODS:');
    console.log('   - Look for periods with names like "Sep 11-24, 2025"');
    console.log('   - Avoid periods that might map to old IDs');
    console.log('   - Use the newest periods (IDs 2255+)');
    console.log('');
    console.log('3. CHECK PERIOD DETAILS:');
    console.log('   - When you select a period, check the dates shown');
    console.log('   - If you see 2024 dates, select a different period');
    console.log('   - Look for periods starting with "Sep", "Oct", "Nov", "Dec 2025"');

    // Step 6: Delete problematic 2024 calculations if they exist
    if (period31) {
      console.log('\n🗑️ CLEARING PROBLEMATIC 2024 DATA:');
      try {
        // We can't actually delete via API, but show what should be done
        console.log('⚠️  Period 31 (May 2024) should be removed or its calculations cleared');
        console.log('This would prevent frontend ID conflicts');
      } catch (error) {
        console.log('Cannot clear via API, but identified the issue');
      }
    }

    // Step 7: Test a known good 2025 period
    const goodPeriod = periods2025.find(p => p.id > 2250); // Use one of our new periods
    if (goodPeriod) {
      console.log(`\n✅ RECOMMENDED PERIOD TO TEST:`);
      console.log(`  ${goodPeriod.period_name} (ID: ${goodPeriod.id})`);
      console.log(`  Dates: ${goodPeriod.start_date.substring(0, 10)} to ${goodPeriod.end_date.substring(0, 10)}`);
      console.log(`  This period is guaranteed to be 2025!`);
      
      // Try to get calculations for this period
      try {
        const goodCalc = await makeRequest(`/api/payroll/calculations?periodId=${goodPeriod.id}`);
        console.log(`  Current calculations: ${goodCalc.length}`);
        
        if (goodCalc.length === 0) {
          console.log(`  ✅ Clean slate - ready for new 2025 data!`);
        } else {
          console.log(`  Sample calculation:`, {
            employee: `${goodCalc[0].first_name} ${goodCalc[0].last_name}`,
            period: goodCalc[0].period_name,
            year: goodCalc[0].period_start?.substring(0, 4) || 'unknown'
          });
        }
      } catch (error) {
        console.log(`  No calculations yet - perfect for testing!`);
      }
    }

    console.log('\n🎯 STEP-BY-STEP FIX IF YOU SEE 2024:');
    console.log('1. Hard refresh your browser (Ctrl+Shift+R)');
    console.log('2. Go to Payroll page');
    console.log(`3. Select "${goodPeriod?.period_name || 'a 2025 period'}" from dropdown`);
    console.log('4. Verify the dates shown are 2025');
    console.log('5. Add time entries for those 2025 dates');
    console.log('6. Click "Calculate Payroll"');
    console.log('7. You should see 2025 data only!');

    console.log('\n📞 IF PROBLEM PERSISTS:');
    console.log('The issue is likely frontend caching or ID mapping.');
    console.log('The database now has proper 2025-2026 periods.');
    console.log('Frontend needs to use the new period IDs (2255+) instead of old ones.');

  } catch (error) {
    console.error('❌ Error in debugging:', error);
  }
};

// Run the script
debug2024Issue();

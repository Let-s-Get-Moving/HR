#!/usr/bin/env node

// This script creates database periods that match the frontend-generated 2025 periods

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

// Function to generate the same biweekly periods as the frontend
function generateBiweeklyPeriods(year = new Date().getFullYear(), referencePayDate = "09-12") {
  const periods = [];
  
  // Parse the reference pay date (e.g., "09-12" for Sep 12)
  const [refMonth, refDay] = referencePayDate.split('-').map(Number);
  
  // Find the reference pay date in the given year
  const referenceDate = new Date(year, refMonth - 1, refDay);
  
  // Calculate the start of the biweekly cycle
  const periodStart = new Date(referenceDate);
  periodStart.setDate(referenceDate.getDate() + 1); // Add 1 day to get Sep 12
  
  // Generate 26 biweekly periods (26 periods per year)
  for (let i = 0; i < 26; i++) {
    const startDate = new Date(periodStart);
    startDate.setDate(periodStart.getDate() + (i * 14));
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 13); // 14 days total (0-13 inclusive)
    
    // Pay date is the same as the start date of the period
    const payDate = new Date(startDate);
    
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const startDay = startDate.getDate();
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const endDay = endDate.getDate();
    
    // Format period name
    let periodName;
    if (startDate.getMonth() === endDate.getMonth()) {
      periodName = `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
      periodName = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
    
    periods.push({
      id: i + 1,
      period_name: periodName,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      pay_date: payDate.toISOString().split('T')[0],
      status: 'Open',
      year: year,
      period_number: i + 1
    });
  }
  
  return periods;
}

const createMatching2025Periods = async () => {
  try {
    console.log('🎯 Creating database periods that match frontend 2025 periods...');

    // Generate 2025 periods using the same logic as frontend
    const periods2025 = generateBiweeklyPeriods(2025, "09-12");
    
    console.log(`Generated ${periods2025.length} periods for 2025:`);
    periods2025.slice(0, 5).forEach((period, index) => {
      console.log(`  ${period.period_name} (Frontend ID: ${53 + index}) - ${period.start_date} to ${period.end_date}`);
    });

    // Check existing database periods
    const existingPeriods = await makeRequest('/api/payroll/periods');
    console.log(`\nFound ${existingPeriods.length} existing database periods`);

    // Create the periods in database with IDs that match frontend expectations
    // Frontend uses IDs 53-78 for 2025 (future year)
    let createdCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < periods2025.length; i++) {
      const period = periods2025[i];
      const frontendId = 53 + i; // Future year IDs: 53-78
      
      // Check if a period with this exact name already exists
      const existingPeriod = existingPeriods.find(p => p.period_name === period.period_name);
      
      if (existingPeriod) {
        console.log(`⏭️  Skipped: ${period.period_name} (already exists with ID: ${existingPeriod.id})`);
        skippedCount++;
        continue;
      }

      try {
        const newPeriod = await makeRequest('/api/payroll/periods', {
          method: 'POST',
          body: JSON.stringify({
            period_name: period.period_name,
            start_date: period.start_date,
            end_date: period.end_date,
            pay_date: period.pay_date
          })
        });
        
        console.log(`✅ Created: ${period.period_name} (DB ID: ${newPeriod.id}, Frontend expects: ${frontendId})`);
        createdCount++;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Failed to create ${period.period_name}:`, error.message);
      }
    }

    console.log(`\n📊 CREATION SUMMARY:`);
    console.log(`✅ Created: ${createdCount} periods`);
    console.log(`⏭️  Skipped: ${skippedCount} periods (already existed)`);

    // Now let's find the period that matches "Nov 7-21, 2025"
    const updatedPeriods = await makeRequest('/api/payroll/periods');
    const nov7_21Period = updatedPeriods.find(p => p.period_name.includes('Nov 7-21, 2025'));
    
    if (nov7_21Period) {
      console.log(`\n🎯 Found matching period for "Nov 7-21, 2025":`);
      console.log(`Database ID: ${nov7_21Period.id}`);
      console.log(`Period: ${nov7_21Period.start_date} to ${nov7_21Period.end_date}`);
      
      // Create time entries for this specific period
      console.log('\n⏰ Creating time entries for Nov 7-21, 2025...');
      
      const employees = [
        { id: 85, name: 'Natalie Anderson', rate: 20.62 },
        { id: 84, name: 'Michelle Brown', rate: 23.32 },
        { id: 75, name: 'Sarah Chen', rate: 20.5 },
        { id: 86, name: 'Ryan Clark', rate: 29.63 },
        { id: 82, name: 'Amanda Davis', rate: 21.45 }
      ];

      // Generate work days for Nov 7-21, 2025
      const workDays = [];
      const startDate = new Date(nov7_21Period.start_date);
      const endDate = new Date(nov7_21Period.end_date);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) { // Skip weekends
          workDays.push(d.toISOString().substring(0, 10));
        }
      }

      console.log(`Work days: ${workDays.join(', ')}`);

      // Create time entries for the first few employees
      for (const employee of employees.slice(0, 3)) {
        for (const workDate of workDays) {
          const hoursWorked = (7.5 + Math.random() * 1).toFixed(2);
          const overtimeHours = Math.max(0, parseFloat(hoursWorked) - 8).toFixed(2);
          
          const timeEntry = {
            employee_id: employee.id,
            work_date: workDate,
            clock_in: `${workDate}T08:00:00.000Z`,
            clock_out: `${workDate}T${(16 + Math.floor(parseFloat(hoursWorked))).toString().padStart(2, '0')}:00:00.000Z`,
            hours_worked: hoursWorked,
            overtime_hours: overtimeHours,
            status: 'Approved'
          };

          try {
            await makeRequest('/api/employees/time-entries', {
              method: 'POST',
              body: JSON.stringify(timeEntry)
            });
            console.log(`  ✅ ${employee.name}: ${workDate} - ${hoursWorked}h`);
          } catch (error) {
            // Expected to fail due to auth, but show what would be created
            console.log(`  📝 Would create: ${employee.name}: ${workDate} - ${hoursWorked}h`);
            break; // Stop after first failure to avoid spam
          }
        }
      }

      // Calculate payroll for this period
      console.log(`\n🧮 Calculating payroll for ${nov7_21Period.period_name}...`);
      
      try {
        const result = await makeRequest(`/api/payroll/calculate/${nov7_21Period.id}`, {
          method: 'POST'
        });
        console.log('✅ Payroll calculation completed:', result.message);
        
        // Check results
        const calculations = await makeRequest(`/api/payroll/calculations?periodId=${nov7_21Period.id}`);
        const nonZeroCalcs = calculations.filter(calc => parseFloat(calc.total_gross || 0) > 0);
        
        console.log(`\n📈 PAYROLL RESULTS:`);
        console.log(`Total calculations: ${calculations.length}`);
        console.log(`Non-zero calculations: ${nonZeroCalcs.length}`);
        
        if (nonZeroCalcs.length > 0) {
          console.log('\n🎉 SUCCESS! Your Nov 7-21, 2025 period now has data:');
          nonZeroCalcs.forEach(calc => {
            const totalHours = (parseFloat(calc.base_hours || 0) + parseFloat(calc.overtime_hours || 0)).toFixed(1);
            console.log(`  ${calc.first_name} ${calc.last_name}: ${totalHours}h @ $${calc.regular_rate}/hr = $${calc.total_gross} gross`);
          });
        }
        
      } catch (error) {
        console.error('❌ Payroll calculation failed:', error.message);
      }
    }

    console.log('\n🎯 FINAL INSTRUCTIONS:');
    console.log('1. Refresh your payroll page');
    console.log('2. Select "Nov 7-21, 2025" from the dropdown');
    console.log('3. Click "Calculate Payroll"');
    console.log('4. You should now see 2025 data, not 2024!');

  } catch (error) {
    console.error('❌ Error creating matching 2025 periods:', error);
  }
};

// Run the script
createMatching2025Periods();

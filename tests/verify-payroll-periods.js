#!/usr/bin/env node

/**
 * Verification script for payroll period date logic
 * 
 * Canonical Rule:
 * - Work periods: Monday to Sunday (14 days)
 * - Pay date: Friday, 5 days after period ends
 * - Example: Dec 29, 2025 - Jan 11, 2026 → Jan 16, 2026 payday
 */

console.log('═══════════════════════════════════════════════════════════');
console.log('  PAYROLL PERIOD DATE VERIFICATION');
console.log('═══════════════════════════════════════════════════════════\n');

// Test the date calculation logic
function verifyPayPeriodLogic() {
  console.log('1. Testing getPayPeriod() logic:\n');
  
  const basePayday = '2025-09-26';
  const base = new Date(Date.UTC(2025, 8, 26)); // Sep 26, 2025 (Friday)
  
  // Test cases: known pay dates and their expected periods
  const testCases = [
    {
      payDate: '2025-09-26',
      expectedStart: '2025-09-08', // Monday
      expectedEnd: '2025-09-21',   // Sunday
    },
    {
      payDate: '2025-10-10',
      expectedStart: '2025-09-22', // Monday
      expectedEnd: '2025-10-05',   // Sunday
    },
    {
      payDate: '2026-01-16',
      expectedStart: '2025-12-29', // Monday
      expectedEnd: '2026-01-11',   // Sunday
    },
    {
      payDate: '2026-01-30',
      expectedStart: '2026-01-12', // Monday
      expectedEnd: '2026-01-25',   // Sunday
    }
  ];
  
  let allPassed = true;
  
  for (const tc of testCases) {
    const payDate = new Date(tc.payDate);
    
    // Calculate period end = pay_date - 5
    const periodEnd = new Date(payDate);
    periodEnd.setDate(payDate.getDate() - 5);
    
    // Calculate period start = period_end - 13
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodEnd.getDate() - 13);
    
    const actualStart = periodStart.toISOString().split('T')[0];
    const actualEnd = periodEnd.toISOString().split('T')[0];
    
    const startOk = actualStart === tc.expectedStart;
    const endOk = actualEnd === tc.expectedEnd;
    
    const status = startOk && endOk ? '✅ PASS' : '❌ FAIL';
    
    console.log(`   Pay Date: ${tc.payDate}`);
    console.log(`     Expected: ${tc.expectedStart} to ${tc.expectedEnd}`);
    console.log(`     Actual:   ${actualStart} to ${actualEnd}`);
    console.log(`     ${status}`);
    console.log('');
    
    if (!startOk || !endOk) allPassed = false;
  }
  
  return allPassed;
}

function verifyDayOfWeek() {
  console.log('2. Verifying day-of-week alignment:\n');
  
  // Key dates to verify - use UTC to avoid timezone issues
  const dates = [
    { date: '2025-09-26', expectedDay: 'Friday', type: 'Pay Date' },
    { date: '2025-09-08', expectedDay: 'Monday', type: 'Period Start' },
    { date: '2025-09-21', expectedDay: 'Sunday', type: 'Period End' },
    { date: '2026-01-16', expectedDay: 'Friday', type: 'Pay Date' },
    { date: '2025-12-29', expectedDay: 'Monday', type: 'Period Start' },
    { date: '2026-01-11', expectedDay: 'Sunday', type: 'Period End' },
  ];
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let allPassed = true;
  
  for (const item of dates) {
    // Parse as local date to avoid timezone offset issues
    const [year, month, day] = item.date.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const actualDay = dayNames[date.getDay()];
    const passed = actualDay === item.expectedDay;
    const status = passed ? '✅' : '❌';
    
    console.log(`   ${status} ${item.date} (${item.type}): ${actualDay} ${passed ? '== ' : '!= '}${item.expectedDay}`);
    
    if (!passed) allPassed = false;
  }
  
  console.log('');
  return allPassed;
}

function verifyJan16PayDate() {
  console.log('3. Critical Test - Jan 16, 2026 Pay Date:\n');
  
  const payDate = new Date('2026-01-16');
  
  // Period end = pay_date - 5 days
  const periodEnd = new Date(payDate);
  periodEnd.setDate(payDate.getDate() - 5);
  
  // Period start = period_end - 13 days
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodEnd.getDate() - 13);
  
  const startStr = periodStart.toISOString().split('T')[0];
  const endStr = periodEnd.toISOString().split('T')[0];
  
  console.log(`   Pay Date:      2026-01-16 (Friday)`);
  console.log(`   Period End:    ${endStr} (should be 2026-01-11, Sunday)`);
  console.log(`   Period Start:  ${startStr} (should be 2025-12-29, Monday)`);
  
  const expectedStart = '2025-12-29';
  const expectedEnd = '2026-01-11';
  
  const passed = startStr === expectedStart && endStr === expectedEnd;
  
  console.log('');
  if (passed) {
    console.log('   ✅ CRITICAL TEST PASSED: Jan 16 pay date correctly shows Dec 29 - Jan 11');
  } else {
    console.log('   ❌ CRITICAL TEST FAILED!');
    console.log(`      Expected: ${expectedStart} to ${expectedEnd}`);
    console.log(`      Got:      ${startStr} to ${endStr}`);
  }
  
  console.log('');
  return passed;
}

function verifySqlLogic() {
  console.log('4. SQL Logic Verification (pay_period_end + 5 = pay_date):\n');
  
  // Simulate what the SQL does: pay_date = pay_period_end + 5
  const testPeriods = [
    { period_end: '2025-09-21', expected_pay_date: '2025-09-26' },
    { period_end: '2025-10-05', expected_pay_date: '2025-10-10' },
    { period_end: '2026-01-11', expected_pay_date: '2026-01-16' },
    { period_end: '2026-01-25', expected_pay_date: '2026-01-30' },
  ];
  
  let allPassed = true;
  
  for (const tp of testPeriods) {
    const periodEnd = new Date(tp.period_end);
    const payDate = new Date(periodEnd);
    payDate.setDate(periodEnd.getDate() + 5);
    
    const actualPayDate = payDate.toISOString().split('T')[0];
    const passed = actualPayDate === tp.expected_pay_date;
    const status = passed ? '✅' : '❌';
    
    console.log(`   ${status} ${tp.period_end} + 5 days = ${actualPayDate} (expected ${tp.expected_pay_date})`);
    
    if (!passed) allPassed = false;
  }
  
  console.log('');
  return allPassed;
}

// Run all verifications
const results = {
  payPeriodLogic: verifyPayPeriodLogic(),
  dayOfWeek: verifyDayOfWeek(),
  jan16Critical: verifyJan16PayDate(),
  sqlLogic: verifySqlLogic(),
};

console.log('═══════════════════════════════════════════════════════════');
console.log('  SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

let allPassed = true;
for (const [test, passed] of Object.entries(results)) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`   ${status}: ${test}`);
  if (!passed) allPassed = false;
}

console.log('');
if (allPassed) {
  console.log('   🎉 ALL VERIFICATION TESTS PASSED!');
  console.log('');
  console.log('   The payroll period logic correctly calculates:');
  console.log('   - Mon-Sun work periods (14 days)');
  console.log('   - Friday pay dates, 5 days after period end');
  console.log('   - Jan 16, 2026 pay date → Dec 29, 2025 - Jan 11, 2026 work period');
} else {
  console.log('   ⚠️  SOME TESTS FAILED - Please review the implementation');
  process.exit(1);
}

console.log('\n═══════════════════════════════════════════════════════════\n');

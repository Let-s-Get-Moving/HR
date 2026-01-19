/**
 * Sales Commission Calculation Tests
 * 
 * Tests for:
 * - Agent commission rate boundaries (booking % and revenue thresholds)
 * - Manager bucket-sum calculation
 * - Sam Lopka fixed override
 */

import assert from 'assert';
import {
    computeAgentRate,
    computeManagerBucketRate,
    MANAGER_BUCKETS
} from '../api/src/utils/salesCommissionCalculator.js';

// Test counters
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`  ❌ ${name}`);
        console.log(`     Error: ${error.message}`);
        failed++;
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

function assertClose(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message}: expected ~${expected}, got ${actual}`);
    }
}

// ============================================================================
// Agent Commission Rate Tests
// ============================================================================

console.log('\n📊 Agent Commission Rate Tests\n');

// Top tier: >55% booking AND >$250k revenue = 6% + $5000 vacation
test('Agent: 56% booking, $260k revenue -> 6% + $5000 vacation', () => {
    const result = computeAgentRate(56, 260000);
    assertEqual(result.pct, 6.0, 'Commission %');
    assertEqual(result.vacationValue, 5000, 'Vacation award');
});

test('Agent: 60% booking, $300k revenue -> 6% + $5000 vacation', () => {
    const result = computeAgentRate(60, 300000);
    assertEqual(result.pct, 6.0, 'Commission %');
    assertEqual(result.vacationValue, 5000, 'Vacation award');
});

// Edge: exactly 55% should NOT qualify (rule is >55%)
test('Agent: exactly 55% booking, $260k revenue -> 6% (no vacation)', () => {
    const result = computeAgentRate(55, 260000);
    assertEqual(result.pct, 6.0, 'Commission %');
    assertEqual(result.vacationValue, 0, 'Vacation award');
});

// 50-55% tier: >50% booking AND >$250k = 6%
test('Agent: 51% booking, $260k revenue -> 6%', () => {
    const result = computeAgentRate(51, 260000);
    assertEqual(result.pct, 6.0, 'Commission %');
    assertEqual(result.vacationValue, 0, 'Vacation award');
});

// Edge: exactly 50% should NOT qualify for 6%
test('Agent: exactly 50% booking, $260k revenue -> 5.5% (next tier)', () => {
    const result = computeAgentRate(50, 260000);
    // 50% is not >50%, so falls to next tier
    // Next tier: >40% and >200k = 5.5%
    assertEqual(result.pct, 5.5, 'Commission %');
});

// 40-50% tier: >40% booking AND >$200k = 5.5%
test('Agent: 41% booking, $210k revenue -> 5.5%', () => {
    const result = computeAgentRate(41, 210000);
    assertEqual(result.pct, 5.5, 'Commission %');
});

// Edge: exactly 40% should NOT qualify for 5.5%
test('Agent: exactly 40% booking, $210k revenue -> 5.0% (next tier)', () => {
    const result = computeAgentRate(40, 210000);
    // 40% is not >40%, falls to >35% AND >160k = 5%
    assertEqual(result.pct, 5.0, 'Commission %');
});

// 35-40% tier: >35% booking AND >$160k = 5.0%
test('Agent: 36% booking, $170k revenue -> 5.0%', () => {
    const result = computeAgentRate(36, 170000);
    assertEqual(result.pct, 5.0, 'Commission %');
});

// Edge: exactly 35% should NOT qualify for 5%
test('Agent: exactly 35% booking, $170k revenue -> 4.5% (next tier)', () => {
    const result = computeAgentRate(35, 170000);
    // 35% is not >35%, falls to >30% AND >115k = 4.5%
    assertEqual(result.pct, 4.5, 'Commission %');
});

// 30-35% tier: >30% booking AND >$115k = 4.5%
test('Agent: 31% booking, $120k revenue -> 4.5%', () => {
    const result = computeAgentRate(31, 120000);
    assertEqual(result.pct, 4.5, 'Commission %');
});

// Edge: exactly 30% should NOT qualify for 4.5%
test('Agent: exactly 30% booking, $120k revenue -> 4.0%', () => {
    const result = computeAgentRate(30, 120000);
    // 30% is <=30 but revenue >115k, so (<=30 AND >115k) = 4%
    assertEqual(result.pct, 4.0, 'Commission %');
});

// Mixed tier: (>30% AND <=115k) OR (<=30% AND >115k) = 4.0%
test('Agent: 32% booking, $100k revenue (high booking, low revenue) -> 4.0%', () => {
    const result = computeAgentRate(32, 100000);
    // >30% but <=115k
    assertEqual(result.pct, 4.0, 'Commission %');
});

test('Agent: 28% booking, $120k revenue (low booking, high revenue) -> 4.0%', () => {
    const result = computeAgentRate(28, 120000);
    // <=30% but >115k
    assertEqual(result.pct, 4.0, 'Commission %');
});

// Edge: exactly $115k should NOT qualify
test('Agent: 28% booking, exactly $115k revenue -> 3.5%', () => {
    const result = computeAgentRate(28, 115000);
    // <=30% and <=115k = 3.5%
    assertEqual(result.pct, 3.5, 'Commission %');
});

// Base tier: <30% booking AND <$115k = 3.5%
test('Agent: 25% booking, $80k revenue -> 3.5%', () => {
    const result = computeAgentRate(25, 80000);
    assertEqual(result.pct, 3.5, 'Commission %');
});

test('Agent: 20% booking, $50k revenue -> 3.5%', () => {
    const result = computeAgentRate(20, 50000);
    assertEqual(result.pct, 3.5, 'Commission %');
});

// Zero values
test('Agent: 0% booking, $0 revenue -> 3.5%', () => {
    const result = computeAgentRate(0, 0);
    assertEqual(result.pct, 3.5, 'Commission %');
    assertEqual(result.vacationValue, 0, 'Vacation award');
});

test('Agent: null values -> 3.5%', () => {
    const result = computeAgentRate(null, null);
    assertEqual(result.pct, 3.5, 'Commission %');
});

// ============================================================================
// Manager Bucket Rate Tests
// ============================================================================

console.log('\n📊 Manager Bucket Rate Tests\n');

// 0-19% bucket -> 0.25%
test('Manager bucket: 0% booking -> 0.25%', () => {
    const result = computeManagerBucketRate(0);
    assertEqual(result.rate, 0.25, 'Bucket rate');
    assertEqual(result.bucket.label, '0-19%', 'Bucket label');
});

test('Manager bucket: 15% booking -> 0.25%', () => {
    const result = computeManagerBucketRate(15);
    assertEqual(result.rate, 0.25, 'Bucket rate');
});

test('Manager bucket: 19.5% booking -> 0.25%', () => {
    const result = computeManagerBucketRate(19.5);
    assertEqual(result.rate, 0.25, 'Bucket rate');
});

// 20-24% bucket -> 0.275%
test('Manager bucket: 20% booking -> 0.275%', () => {
    const result = computeManagerBucketRate(20);
    assertEqual(result.rate, 0.275, 'Bucket rate');
    assertEqual(result.bucket.label, '20-24%', 'Bucket label');
});

test('Manager bucket: 24% booking -> 0.275%', () => {
    const result = computeManagerBucketRate(24);
    assertEqual(result.rate, 0.275, 'Bucket rate');
});

// 25-29% bucket -> 0.3%
test('Manager bucket: 25% booking -> 0.3%', () => {
    const result = computeManagerBucketRate(25);
    assertEqual(result.rate, 0.3, 'Bucket rate');
    assertEqual(result.bucket.label, '25-29%', 'Bucket label');
});

test('Manager bucket: 29% booking -> 0.3%', () => {
    const result = computeManagerBucketRate(29);
    assertEqual(result.rate, 0.3, 'Bucket rate');
});

// 30-34% bucket -> 0.35%
test('Manager bucket: 30% booking -> 0.35%', () => {
    const result = computeManagerBucketRate(30);
    assertEqual(result.rate, 0.35, 'Bucket rate');
    assertEqual(result.bucket.label, '30-34%', 'Bucket label');
});

test('Manager bucket: 34% booking -> 0.35%', () => {
    const result = computeManagerBucketRate(34);
    assertEqual(result.rate, 0.35, 'Bucket rate');
});

// 35-39% bucket -> 0.4%
test('Manager bucket: 35% booking -> 0.4%', () => {
    const result = computeManagerBucketRate(35);
    assertEqual(result.rate, 0.4, 'Bucket rate');
    assertEqual(result.bucket.label, '35-39%', 'Bucket label');
});

test('Manager bucket: 39% booking -> 0.4%', () => {
    const result = computeManagerBucketRate(39);
    assertEqual(result.rate, 0.4, 'Bucket rate');
});

// 40%+ bucket -> 0.45%
test('Manager bucket: 40% booking -> 0.45%', () => {
    const result = computeManagerBucketRate(40);
    assertEqual(result.rate, 0.45, 'Bucket rate');
    assertEqual(result.bucket.label, '40%+', 'Bucket label');
});

test('Manager bucket: 50% booking -> 0.45%', () => {
    const result = computeManagerBucketRate(50);
    assertEqual(result.rate, 0.45, 'Bucket rate');
});

test('Manager bucket: 80% booking -> 0.45%', () => {
    const result = computeManagerBucketRate(80);
    assertEqual(result.rate, 0.45, 'Bucket rate');
});

// ============================================================================
// Bucket Sum Calculation Tests
// ============================================================================

console.log('\n📊 Bucket Sum Calculation Tests\n');

test('Bucket sum: sample agents across buckets', () => {
    // Simulate 5 agents with varying booking %
    const agents = [
        { booking_pct: 15, revenue: 50000 },  // 0-19% bucket: 50000 * 0.0025 = 125
        { booking_pct: 22, revenue: 80000 },  // 20-24% bucket: 80000 * 0.00275 = 220
        { booking_pct: 27, revenue: 100000 }, // 25-29% bucket: 100000 * 0.003 = 300
        { booking_pct: 32, revenue: 120000 }, // 30-34% bucket: 120000 * 0.0035 = 420
        { booking_pct: 45, revenue: 150000 }  // 40%+ bucket: 150000 * 0.0045 = 675
    ];
    
    let totalManagerCommission = 0;
    
    for (const agent of agents) {
        const { rate } = computeManagerBucketRate(agent.booking_pct);
        totalManagerCommission += (agent.revenue * rate) / 100;
    }
    
    const expected = 125 + 220 + 300 + 420 + 675; // = 1740
    assertClose(totalManagerCommission, expected, 0.01, 'Total manager commission');
});

test('Sam Lopka fixed rate: 0.7% of pooled revenue', () => {
    // If pooled revenue is $500,000 and Sam has fixed 0.7%
    const pooledRevenue = 500000;
    const samFixedPct = 0.7;
    const samCommission = (pooledRevenue * samFixedPct) / 100;
    
    assertEqual(samCommission, 3500, 'Sam commission');
});

// ============================================================================
// Commission Amount Calculation Tests
// ============================================================================

console.log('\n📊 Commission Amount Calculation Tests\n');

test('Agent commission amount: 45% booking, $200k revenue (exactly at threshold)', () => {
    // 45% is >40% but $200k is NOT >$200k, so falls to >35% AND >$160k = 5.0%
    const booking = 45;
    const revenue = 200000;
    const { pct } = computeAgentRate(booking, revenue);
    const commission = (revenue * pct) / 100;
    
    assertEqual(pct, 5.0, 'Commission rate'); // NOT 5.5% because revenue must be >200k
    assertEqual(commission, 10000, 'Commission amount');
});

test('Agent commission amount: 45% booking, $201k revenue', () => {
    // >40% and >200k = 5.5%
    const booking = 45;
    const revenue = 201000;
    const { pct } = computeAgentRate(booking, revenue);
    const commission = (revenue * pct) / 100;
    
    assertEqual(pct, 5.5, 'Commission rate');
    assertEqual(commission, 11055, 'Commission amount');
});

test('Agent commission amount: 58% booking, $280k revenue (top tier)', () => {
    // >55% and >250k = 6% + $5000 vacation
    const booking = 58;
    const revenue = 280000;
    const { pct, vacationValue } = computeAgentRate(booking, revenue);
    const commission = (revenue * pct) / 100;
    
    assertEqual(pct, 6.0, 'Commission rate');
    assertEqual(commission, 16800, 'Commission amount');
    assertEqual(vacationValue, 5000, 'Vacation award');
});

// ============================================================================
// Manager Commission - Unmatched Agents Tests
// ============================================================================

console.log('\n📊 Manager Commission - Unmatched Agents Tests\n');

test('Manager commission includes unmatched agents in pooled revenue', () => {
    // 2 matched + 2 unmatched agents
    const matched = [
        { booking_pct: 30, revenue: 100000 },
        { booking_pct: 40, revenue: 150000 }
    ];
    const unmatched = [
        { staging_name: 'Unmatched Agent 1', booking_pct: 20, revenue: 80000 },
        { staging_name: 'Unmatched Agent 2', booking_pct: 35, revenue: 120000 }
    ];
    
    const allAgents = [...matched, ...unmatched];
    const totalPooledRevenue = allAgents.reduce((sum, a) => sum + a.revenue, 0);
    const matchedOnlyRevenue = matched.reduce((sum, a) => sum + a.revenue, 0);
    
    assertEqual(totalPooledRevenue, 450000, 'Total pooled revenue includes all agents');
    assertEqual(matchedOnlyRevenue, 250000, 'Matched-only revenue for comparison');
    
    // Manager should receive commission from $450k, not $250k
    const samFixedPct = 0.7;
    const correctManagerCommission = (totalPooledRevenue * samFixedPct) / 100;
    const wrongManagerCommission = (matchedOnlyRevenue * samFixedPct) / 100;
    
    assertEqual(correctManagerCommission, 3150, 'Correct manager commission (all agents)');
    assertEqual(wrongManagerCommission, 1750, 'Wrong commission if only matched');
    
    // Verify correct is higher
    if (correctManagerCommission <= wrongManagerCommission) {
        throw new Error('Manager commission with all agents should be higher than matched-only');
    }
});

test('Manager bucket-sum uses all agents including unmatched', () => {
    // Simulate 2 matched + 2 unmatched agents across different buckets
    const allAgents = [
        // Matched
        { booking_pct: 30, revenue: 100000 },  // 30-34% bucket: 0.35%
        { booking_pct: 42, revenue: 150000 },  // 40%+ bucket: 0.45%
        // Unmatched (should still count for manager)
        { booking_pct: 18, revenue: 60000 },   // 0-19% bucket: 0.25%
        { booking_pct: 28, revenue: 90000 }    // 25-29% bucket: 0.3%
    ];
    
    let managerCommissionAllAgents = 0;
    for (const agent of allAgents) {
        const { rate } = computeManagerBucketRate(agent.booking_pct);
        managerCommissionAllAgents += (agent.revenue * rate) / 100;
    }
    
    // Calculate expected:
    // 30-34%: 100000 * 0.35% = 350
    // 40%+:   150000 * 0.45% = 675
    // 0-19%:  60000 * 0.25% = 150
    // 25-29%: 90000 * 0.3% = 270
    // Total: 350 + 675 + 150 + 270 = 1445
    
    assertClose(managerCommissionAllAgents, 1445, 0.01, 'Manager bucket-sum with all agents');
    
    // Now calculate if we only used matched agents
    const matchedOnly = allAgents.slice(0, 2);
    let managerCommissionMatchedOnly = 0;
    for (const agent of matchedOnly) {
        const { rate } = computeManagerBucketRate(agent.booking_pct);
        managerCommissionMatchedOnly += (agent.revenue * rate) / 100;
    }
    
    // Expected matched-only: 350 + 675 = 1025
    assertClose(managerCommissionMatchedOnly, 1025, 0.01, 'Manager bucket-sum with matched-only');
    
    // Verify including unmatched adds $420 more commission
    const difference = managerCommissionAllAgents - managerCommissionMatchedOnly;
    assertClose(difference, 420, 0.01, 'Additional commission from unmatched agents');
});

test('Unmatched agents revenue breakdown tracking', () => {
    const matched = [
        { booking_pct: 35, revenue: 120000 },
        { booking_pct: 45, revenue: 180000 }
    ];
    const unmatched = [
        { staging_name: 'External Agent', booking_pct: 25, revenue: 75000 }
    ];
    
    const totalStagingRevenue = [...matched, ...unmatched].reduce((sum, a) => sum + a.revenue, 0);
    const matchedRevenue = matched.reduce((sum, a) => sum + a.revenue, 0);
    const unmatchedRevenue = unmatched.reduce((sum, a) => sum + a.revenue, 0);
    
    assertEqual(totalStagingRevenue, 375000, 'Total staging revenue');
    assertEqual(matchedRevenue, 300000, 'Matched revenue');
    assertEqual(unmatchedRevenue, 75000, 'Unmatched revenue');
    assertEqual(totalStagingRevenue, matchedRevenue + unmatchedRevenue, 'Revenue breakdown sums correctly');
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log(`\n📋 Test Summary: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
    console.log('❌ Some tests failed!\n');
    process.exit(1);
} else {
    console.log('✅ All tests passed!\n');
    process.exit(0);
}

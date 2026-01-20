/**
 * Tests for Lead Status Import functionality
 * 
 * Tests:
 *   - Quote ID extraction from various formats
 *   - Lead Status directive parsing (percent split, fixed revenue transfer, fixed booking transfer)
 *   - Edge cases and error handling
 */

import assert from 'assert';

// Import the functions to test
import { extractQuoteId, parseLeadStatusDirective } from '../api/src/utils/leadStatusImporter.js';

console.log('\n========================================');
console.log('Lead Status Import Tests');
console.log('========================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ FAIL: ${name}`);
        console.log(`   Error: ${error.message}`);
        failed++;
    }
}

// ============================================================================
// Quote ID Extraction Tests
// ============================================================================

console.log('\n--- Quote ID Extraction Tests ---\n');

test('extractQuoteId: simple number', () => {
    assert.strictEqual(extractQuoteId('285137'), 285137);
});

test('extractQuoteId: number with "open_in_new" suffix', () => {
    assert.strictEqual(extractQuoteId('285137 open_in_new'), 285137);
});

test('extractQuoteId: number with extra spaces', () => {
    assert.strictEqual(extractQuoteId('  278752  '), 278752);
});

test('extractQuoteId: number with text after', () => {
    assert.strictEqual(extractQuoteId('123456 some text here'), 123456);
});

test('extractQuoteId: returns null for empty string', () => {
    assert.strictEqual(extractQuoteId(''), null);
});

test('extractQuoteId: returns null for null', () => {
    assert.strictEqual(extractQuoteId(null), null);
});

test('extractQuoteId: returns null for undefined', () => {
    assert.strictEqual(extractQuoteId(undefined), null);
});

test('extractQuoteId: returns null for non-numeric string', () => {
    assert.strictEqual(extractQuoteId('no numbers here'), null);
});

test('extractQuoteId: handles number input', () => {
    assert.strictEqual(extractQuoteId(285137), 285137);
});

// ============================================================================
// Lead Status Directive Parsing Tests
// ============================================================================

console.log('\n--- Lead Status Directive Parsing Tests ---\n');

// Split with X patterns
test('parseLeadStatusDirective: "Split with Sam" -> 50% split', () => {
    const result = parseLeadStatusDirective('Split with Sam');
    assert.strictEqual(result.directive_type, 'percent_split');
    assert.strictEqual(result.target_name_raw, 'Sam');
    assert.strictEqual(result.pct, 50);
    assert.strictEqual(result.amount, null);
});

test('parseLeadStatusDirective: "Split the move with John" -> 50% split', () => {
    const result = parseLeadStatusDirective('Split the move with John');
    assert.strictEqual(result.directive_type, 'percent_split');
    assert.strictEqual(result.target_name_raw, 'John');
    assert.strictEqual(result.pct, 50);
});

test('parseLeadStatusDirective: "Split with MO G" (multi-word name) -> 50% split', () => {
    const result = parseLeadStatusDirective('Split with MO G');
    assert.strictEqual(result.directive_type, 'percent_split');
    assert.strictEqual(result.target_name_raw, 'MO G');
    assert.strictEqual(result.pct, 50);
});

test('parseLeadStatusDirective: "Split with Asif" -> percent_split', () => {
    const result = parseLeadStatusDirective('Split with Asif');
    assert.strictEqual(result.directive_type, 'percent_split');
    assert.strictEqual(result.target_name_raw, 'Asif');
});

// Percentage patterns
test('parseLeadStatusDirective: "40% of the move to Jimmy" -> 40% split', () => {
    const result = parseLeadStatusDirective('40% of the move to Jimmy');
    assert.strictEqual(result.directive_type, 'percent_split');
    assert.strictEqual(result.target_name_raw, 'Jimmy');
    assert.strictEqual(result.pct, 40);
});

test('parseLeadStatusDirective: "40% of move to Alejo" (without "the") -> 40% split', () => {
    const result = parseLeadStatusDirective('40% of move to Alejo');
    assert.strictEqual(result.directive_type, 'percent_split');
    assert.strictEqual(result.target_name_raw, 'Alejo');
    assert.strictEqual(result.pct, 40);
});

test('parseLeadStatusDirective: "40% of the move to Colin C" (multi-word name)', () => {
    const result = parseLeadStatusDirective('40% of the move to Colin C');
    assert.strictEqual(result.directive_type, 'percent_split');
    assert.strictEqual(result.target_name_raw, 'Colin C');
    assert.strictEqual(result.pct, 40);
});

test('parseLeadStatusDirective: "40% of move to Ibrahim K" -> percent_split', () => {
    const result = parseLeadStatusDirective('40% of move to Ibrahim K');
    assert.strictEqual(result.directive_type, 'percent_split');
    assert.strictEqual(result.target_name_raw, 'Ibrahim K');
    assert.strictEqual(result.pct, 40);
});

// Fixed revenue deduction patterns
test('parseLeadStatusDirective: "$100 deduction off revenue goes to Sam"', () => {
    const result = parseLeadStatusDirective('$100 deduction off revenue goes to Sam');
    assert.strictEqual(result.directive_type, 'fixed_rev_transfer');
    assert.strictEqual(result.target_name_raw, 'Sam');
    assert.strictEqual(result.amount, 100);
    assert.strictEqual(result.pct, null);
});

// Fixed booking bonus patterns
test('parseLeadStatusDirective: "$10 bonus to Sebastian"', () => {
    const result = parseLeadStatusDirective('$10 bonus to Sebastian');
    assert.strictEqual(result.directive_type, 'fixed_booking_transfer');
    assert.strictEqual(result.target_name_raw, 'Sebastian');
    assert.strictEqual(result.amount, 10);
});

test('parseLeadStatusDirective: "$10 Bonus for Rae" (capital B, "for" instead of "to")', () => {
    const result = parseLeadStatusDirective('$10 Bonus for Rae');
    assert.strictEqual(result.directive_type, 'fixed_booking_transfer');
    assert.strictEqual(result.target_name_raw, 'Rae');
    assert.strictEqual(result.amount, 10);
});

test('parseLeadStatusDirective: "$10 bonus to MO G" (multi-word name)', () => {
    const result = parseLeadStatusDirective('$10 bonus to MO G');
    assert.strictEqual(result.directive_type, 'fixed_booking_transfer');
    assert.strictEqual(result.target_name_raw, 'MO G');
    assert.strictEqual(result.amount, 10);
});

test('parseLeadStatusDirective: "$10 Bonus to Colin" (capital B)', () => {
    const result = parseLeadStatusDirective('$10 Bonus to Colin');
    assert.strictEqual(result.directive_type, 'fixed_booking_transfer');
    assert.strictEqual(result.target_name_raw, 'Colin');
    assert.strictEqual(result.amount, 10);
});

// Edge cases
test('parseLeadStatusDirective: empty string -> none', () => {
    const result = parseLeadStatusDirective('');
    assert.strictEqual(result.directive_type, 'none');
});

test('parseLeadStatusDirective: null -> none', () => {
    const result = parseLeadStatusDirective(null);
    assert.strictEqual(result.directive_type, 'none');
});

test('parseLeadStatusDirective: "Default" -> none', () => {
    const result = parseLeadStatusDirective('Default');
    assert.strictEqual(result.directive_type, 'none');
});

test('parseLeadStatusDirective: "default" (lowercase) -> none', () => {
    const result = parseLeadStatusDirective('default');
    assert.strictEqual(result.directive_type, 'none');
});

test('parseLeadStatusDirective: unrecognized pattern -> none', () => {
    const result = parseLeadStatusDirective('Some random text');
    assert.strictEqual(result.directive_type, 'none');
});

// Name key normalization
test('parseLeadStatusDirective: target_name_key is normalized', () => {
    const result = parseLeadStatusDirective('Split with  MO  G ');
    assert.strictEqual(result.target_name_key, 'mo g');
});

test('parseLeadStatusDirective: target_name_key handles special chars', () => {
    const result = parseLeadStatusDirective('Split with Colin-C');
    // Expect hyphen to be preserved in normalization
    assert.ok(result.target_name_key.includes('colin'));
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n========================================');
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
    process.exit(1);
}

console.log('All tests passed!');

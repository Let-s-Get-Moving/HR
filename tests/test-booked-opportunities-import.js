/**
 * Tests for Booked Opportunities Import functionality
 * 
 * Tests:
 *   - Quote ID extraction
 *   - Header validation
 *   - Date parsing
 */

import assert from 'assert';

// Import the functions to test
import { extractQuoteId, detectBookedOpportunitiesHeaders } from '../api/src/utils/bookedOpportunitiesImporter.js';

console.log('\n========================================');
console.log('Booked Opportunities Import Tests');
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
    assert.strictEqual(extractQuoteId('278752'), 278752);
});

test('extractQuoteId: number with "open_in_new" suffix', () => {
    assert.strictEqual(extractQuoteId('278752 open_in_new'), 278752);
});

test('extractQuoteId: returns null for empty string', () => {
    assert.strictEqual(extractQuoteId(''), null);
});

test('extractQuoteId: returns null for null', () => {
    assert.strictEqual(extractQuoteId(null), null);
});

// ============================================================================
// Header Validation Tests
// ============================================================================

console.log('\n--- Header Validation Tests ---\n');

test('detectBookedOpportunitiesHeaders: valid headers', () => {
    const headers = [
        'Quote #', 'Status', 'Customer Name', 'Email', 'Phone Number',
        'Branch Name', 'Moving From', 'Moving to', 'Service Date', 'Service Type',
        'Weight', 'Volume', 'Hourly Rate', 'Estimated Amount', 'Invoiced Amount',
        'Referral Source', 'Estimator', 'Sales Person', 'Move Coordinator', 'Booked Date'
    ];
    const result = detectBookedOpportunitiesHeaders(headers);
    assert.strictEqual(result.valid, true);
});

test('detectBookedOpportunitiesHeaders: minimal required headers', () => {
    const headers = ['Quote #', 'Status', 'Service Date', 'Invoiced Amount'];
    const result = detectBookedOpportunitiesHeaders(headers);
    assert.strictEqual(result.valid, true);
});

test('detectBookedOpportunitiesHeaders: missing Quote #', () => {
    const headers = ['Status', 'Service Date', 'Invoiced Amount'];
    const result = detectBookedOpportunitiesHeaders(headers);
    assert.strictEqual(result.valid, false);
    assert.ok(result.message.includes('Quote #'));
});

test('detectBookedOpportunitiesHeaders: missing Service Date', () => {
    const headers = ['Quote #', 'Status', 'Invoiced Amount'];
    const result = detectBookedOpportunitiesHeaders(headers);
    assert.strictEqual(result.valid, false);
    assert.ok(result.message.includes('Service Date'));
});

test('detectBookedOpportunitiesHeaders: missing Invoiced Amount', () => {
    const headers = ['Quote #', 'Status', 'Service Date'];
    const result = detectBookedOpportunitiesHeaders(headers);
    assert.strictEqual(result.valid, false);
    assert.ok(result.message.includes('Invoiced Amount'));
});

test('detectBookedOpportunitiesHeaders: empty array', () => {
    const result = detectBookedOpportunitiesHeaders([]);
    assert.strictEqual(result.valid, false);
});

test('detectBookedOpportunitiesHeaders: null', () => {
    const result = detectBookedOpportunitiesHeaders(null);
    assert.strictEqual(result.valid, false);
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

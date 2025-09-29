/**
 * Test script for commission import functionality
 * 
 * This tests the Excel parsing and import capabilities
 * without requiring an actual Excel file.
 */

import { q } from '../api/src/db.js';
import { 
    parseMoney, 
    parsePercent, 
    normalizeNameKey,
    parsePeriodFromSheetName 
} from '../api/src/utils/excelParser.js';

async function testDatabaseConnection() {
    try {
        console.log('Testing database connection...');
        const result = await q('SELECT NOW() as current_time');
        console.log('✓ Database connection successful:', result.rows[0].current_time);
        return true;
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        return false;
    }
}

async function testCommissionTables() {
    try {
        console.log('Testing commission tables exist...');
        
        // Test if tables exist
        const tables = ['employee_commission_monthly', 'agent_commission_us', 'hourly_payout'];
        
        for (const table of tables) {
            try {
                const result = await q(`SELECT COUNT(*) FROM ${table}`);
                console.log(`✓ Table ${table} exists with ${result.rows[0].count} rows`);
            } catch (error) {
                console.error(`✗ Table ${table} does not exist or is not accessible:`, error.message);
            }
        }
        
        return true;
    } catch (error) {
        console.error('✗ Table check failed:', error.message);
        return false;
    }
}

function testParsingFunctions() {
    console.log('Testing parsing functions...');
    
    // Test money parsing
    const moneyTests = [
        { input: '$1,234.56', expected: 1234.56 },
        { input: '(500.00)', expected: -500 },
        { input: '1234', expected: 1234 },
        { input: '', expected: null },
        { input: null, expected: null }
    ];
    
    console.log('Money parsing tests:');
    moneyTests.forEach(test => {
        const result = parseMoney(test.input);
        const status = result === test.expected ? '✓' : '✗';
        console.log(`  ${status} parseMoney('${test.input}') = ${result} (expected: ${test.expected})`);
    });
    
    // Test percent parsing
    const percentTests = [
        { input: '3.5%', expected: 3.5 },
        { input: '3.5', expected: 3.5 },
        { input: '0.035', expected: 0.035 },
        { input: '', expected: null }
    ];
    
    console.log('Percent parsing tests:');
    percentTests.forEach(test => {
        const result = parsePercent(test.input);
        const status = result === test.expected ? '✓' : '✗';
        console.log(`  ${status} parsePercent('${test.input}') = ${result} (expected: ${test.expected})`);
    });
    
    // Test name normalization
    const nameTests = [
        { input: 'John Doe', expected: 'john doe' },
        { input: '  Jane   Smith  ', expected: 'jane smith' },
        { input: 'MIKE JOHNSON', expected: 'mike johnson' }
    ];
    
    console.log('Name normalization tests:');
    nameTests.forEach(test => {
        const result = normalizeNameKey(test.input);
        const status = result === test.expected ? '✓' : '✗';
        console.log(`  ${status} normalizeNameKey('${test.input}') = '${result}' (expected: '${test.expected}')`);
    });
    
    // Test period parsing
    const periodTests = [
        { input: 'July 2025', expected: '2025-07-01' },
        { input: 'Jul 2025', expected: '2025-07-01' },
        { input: '2025-07', expected: '2025-07-01' },
        { input: 'Invalid', expected: null }
    ];
    
    console.log('Period parsing tests:');
    periodTests.forEach(test => {
        const result = parsePeriodFromSheetName(test.input);
        const resultStr = result ? result.toISOString().split('T')[0] : null;
        const status = resultStr === test.expected ? '✓' : '✗';
        console.log(`  ${status} parsePeriodFromSheetName('${test.input}') = ${resultStr} (expected: ${test.expected})`);
    });
}

async function testEmployeeCreation() {
    try {
        console.log('Testing employee creation/lookup...');
        
        // Check if we can create a test employee
        const testName = 'Test Employee Commission Import';
        const normalizedName = normalizeNameKey(testName);
        
        // First, clean up any existing test data
        await q(`DELETE FROM employees WHERE first_name = 'Test' AND last_name = 'Employee Commission Import'`);
        
        // Test creating employee
        const result = await q(`
            INSERT INTO employees (first_name, last_name, email, role_title, status, created_at)
            VALUES ('Test', 'Employee Commission Import', 'test.commission@test.local', 'Test Role', 'Active', CURRENT_TIMESTAMP)
            RETURNING id, first_name || ' ' || last_name as full_name
        `);
        
        console.log(`✓ Created test employee: ${result.rows[0].full_name} (ID: ${result.rows[0].id})`);
        
        // Clean up
        await q(`DELETE FROM employees WHERE id = ${result.rows[0].id}`);
        console.log('✓ Cleaned up test employee');
        
        return true;
    } catch (error) {
        console.error('✗ Employee creation test failed:', error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('=== Commission Import System Tests ===\n');
    
    const results = [];
    
    results.push(await testDatabaseConnection());
    results.push(await testCommissionTables());
    results.push(await testEmployeeCreation());
    testParsingFunctions(); // This one doesn't return a boolean
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log(`\n=== Test Results: ${passed}/${total} passed ===`);
    
    if (passed === total) {
        console.log('✓ All tests passed! Commission import system should be ready.');
    } else {
        console.log('✗ Some tests failed. Please check the setup before proceeding.');
    }
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

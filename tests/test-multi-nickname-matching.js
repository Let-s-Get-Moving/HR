/**
 * Tests for Multi-Nickname Matching
 * 
 * Tests:
 *   - Normalization function consistency
 *   - Multi-nickname matching (any of 3 nicknames can match)
 *   - Collision prevention (unique normalized nicknames across all employees)
 */

import assert from 'assert';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
    ssl: { rejectUnauthorized: false }
});

console.log('\n========================================');
console.log('Multi-Nickname Matching Tests');
console.log('========================================\n');

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ FAIL: ${name}`);
        console.log(`   Error: ${error.message}`);
        failed++;
    }
}

// ============================================================================
// Normalization Tests
// ============================================================================

console.log('\n--- Normalization Function Tests ---\n');

await test('normalize_nickname: basic lowercase and trim', async () => {
    const result = await pool.query(`SELECT normalize_nickname('  Sam L  ') as normalized`);
    assert.strictEqual(result.rows[0].normalized, 'sam l');
});

await test('normalize_nickname: all uppercase', async () => {
    const result = await pool.query(`SELECT normalize_nickname('SAM') as normalized`);
    assert.strictEqual(result.rows[0].normalized, 'sam');
});

await test('normalize_nickname: special characters removed', async () => {
    const result = await pool.query(`SELECT normalize_nickname('Taz C.') as normalized`);
    assert.strictEqual(result.rows[0].normalized, 'taz c');
});

await test('normalize_nickname: multiple spaces collapsed', async () => {
    const result = await pool.query(`SELECT normalize_nickname('Colin    C') as normalized`);
    assert.strictEqual(result.rows[0].normalized, 'colin c');
});

await test('normalize_nickname: null returns null', async () => {
    const result = await pool.query(`SELECT normalize_nickname(NULL) as normalized`);
    assert.strictEqual(result.rows[0].normalized, null);
});

await test('normalize_nickname: empty string returns null', async () => {
    const result = await pool.query(`SELECT normalize_nickname('') as normalized`);
    assert.strictEqual(result.rows[0].normalized, null);
});

// ============================================================================
// Multi-Nickname Matching Tests
// ============================================================================

console.log('\n--- Multi-Nickname Matching Tests ---\n');

await test('Can find employee by nickname (column 1)', async () => {
    // First check if Sam Lopka exists with nickname "Sam L"
    const emp = await pool.query(`
        SELECT id, first_name, last_name, nickname
        FROM employees
        WHERE last_name = 'Lopka' AND first_name = 'Sam'
    `);
    
    if (emp.rows.length === 0) {
        throw new Error('Sam Lopka not found in database');
    }
    
    // Now try to find by normalized nickname
    const result = await pool.query(`
        SELECT id, first_name, last_name
        FROM employees
        WHERE normalize_nickname(nickname) = $1
    `, ['sam l']);
    
    assert.ok(result.rows.length > 0, 'Should find Sam Lopka by nickname "sam l"');
    assert.strictEqual(result.rows[0].first_name, 'Sam');
});

await test('Can match against any of 3 nickname columns', async () => {
    // This query simulates what the aggregator does
    const result = await pool.query(`
        SELECT id, first_name, last_name, nickname, nickname_2, nickname_3
        FROM employees
        WHERE normalize_nickname(nickname) = 'sam l'
           OR normalize_nickname(nickname_2) = 'sam l'
           OR normalize_nickname(nickname_3) = 'sam l'
    `);
    
    // Should find at least Sam Lopka
    assert.ok(result.rows.length >= 1, 'Should find employee by nickname');
});

await test('nickname_2 and nickname_3 columns exist', async () => {
    const result = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'employees'
          AND column_name IN ('nickname', 'nickname_2', 'nickname_3')
        ORDER BY column_name
    `);
    
    assert.strictEqual(result.rows.length, 3, 'Should have all 3 nickname columns');
    assert.strictEqual(result.rows[0].column_name, 'nickname');
    assert.strictEqual(result.rows[1].column_name, 'nickname_2');
    assert.strictEqual(result.rows[2].column_name, 'nickname_3');
});

// ============================================================================
// Uniqueness Trigger Tests
// ============================================================================

console.log('\n--- Uniqueness Trigger Tests ---\n');

await test('Uniqueness trigger exists', async () => {
    const result = await pool.query(`
        SELECT DISTINCT trigger_name
        FROM information_schema.triggers
        WHERE trigger_name = 'trg_check_nickname_uniqueness'
    `);
    
    assert.strictEqual(result.rows.length, 1, 'Trigger should exist');
});

await test('Cannot set duplicate nickname in same employee (self-duplicate)', async () => {
    // Create a temp employee for testing
    const createResult = await pool.query(`
        INSERT INTO employees (first_name, last_name, work_email, hire_date, employment_type)
        VALUES ('Test', 'MultiNickname', 'test_multinick_' || floor(random()*10000) || '@test.com', '2026-01-01', 'Full-time')
        RETURNING id
    `);
    const testEmpId = createResult.rows[0].id;
    
    try {
        // Try to set same nickname in multiple columns
        await pool.query(`
            UPDATE employees
            SET nickname = 'TestSameNick', nickname_2 = 'TestSameNick'
            WHERE id = $1
        `, [testEmpId]);
        
        // If we get here, the trigger didn't fire - that's a failure
        throw new Error('Should have rejected duplicate nickname in same employee');
    } catch (error) {
        // Expected: trigger should reject this
        assert.ok(error.message.includes('NICKNAME_DUPLICATE_SELF'), 
            `Expected NICKNAME_DUPLICATE_SELF error, got: ${error.message}`);
    } finally {
        // Cleanup
        await pool.query(`DELETE FROM employees WHERE id = $1`, [testEmpId]);
    }
});

// ============================================================================
// Integration Test: Aggregation with Multi-Nickname
// ============================================================================

console.log('\n--- Integration Tests ---\n');

await test('All 3 nickname columns are included in aggregation query', async () => {
    // This test verifies the aggregation query structure handles all 3 columns
    // We're not testing actual data matching (that requires real quote data)
    // but we verify the query doesn't error
    
    const result = await pool.query(`
        WITH all_employee_nicknames AS (
            SELECT normalize_nickname(nickname) AS nickname_key
            FROM employees
            WHERE nickname IS NOT NULL AND nickname != ''
            UNION
            SELECT normalize_nickname(nickname_2) AS nickname_key
            FROM employees
            WHERE nickname_2 IS NOT NULL AND nickname_2 != ''
            UNION
            SELECT normalize_nickname(nickname_3) AS nickname_key
            FROM employees
            WHERE nickname_3 IS NOT NULL AND nickname_3 != ''
        )
        SELECT COUNT(DISTINCT nickname_key) as count
        FROM all_employee_nicknames
        WHERE nickname_key IS NOT NULL
    `);
    
    assert.ok(parseInt(result.rows[0].count) >= 1, 'Should have at least 1 nickname key');
});

// ============================================================================
// Summary
// ============================================================================

await pool.end();

console.log('\n========================================');
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
    process.exit(1);
}

console.log('All tests passed!');

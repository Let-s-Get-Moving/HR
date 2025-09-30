import pkg from 'pg';
const { Pool } = pkg;

// Connect to local database (not using env variables)
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'hr_system',
  user: 'postgres',
  password: 'postgres'
});

console.log('🗑️  DELETING ALL EMPLOYEES FROM LOCAL DATABASE...');
console.log('📍 Connecting to: localhost:5432/hr_system');

try {
    const client = await pool.connect();
    console.log('✅ Connected to database');
    
    try {
        await client.query('BEGIN');
        
        // Get count before
        const before = await client.query('SELECT COUNT(*) FROM employees');
        console.log(`📊 Before: ${before.rows[0].count} employees`);
        
        // DELETE ALL
        const result = await client.query('DELETE FROM employees');
        console.log(`🔥 Deleted: ${result.rowCount} employees`);
        
        // Reset sequence
        await client.query('ALTER SEQUENCE employees_id_seq RESTART WITH 1');
        console.log('🔄 Reset ID sequence to 1');
        
        // Get count after
        const after = await client.query('SELECT COUNT(*) FROM employees');
        console.log(`📊 After: ${after.rows[0].count} employees`);
        
        await client.query('COMMIT');
        
        console.log('\n✅✅✅ ALL EMPLOYEES DELETED SUCCESSFULLY! ✅✅✅');
        console.log('💡 Database is now empty and ready for fresh timecard imports\n');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error during deletion:', error.message);
        throw error;
    } finally {
        client.release();
    }
} catch (error) {
    console.error('❌ Connection Error:', error.message);
    console.log('\n💡 Make sure PostgreSQL is running on localhost:5432');
    console.log('💡 Database: hr_system, User: postgres, Password: postgres');
    process.exit(1);
}

await pool.end();
process.exit(0);

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixOrphanedUploads() {
    const client = await pool.connect();
    
    try {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔧 FIXING ORPHANED TIMECARD UPLOADS');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        await client.query('BEGIN');
        
        // Find uploads with no timecards
        const orphaned = await client.query(`
            SELECT tu.id, tu.filename, tu.status
            FROM timecard_uploads tu
            LEFT JOIN timecards t ON t.upload_id = tu.id
            WHERE tu.status = 'processed'
            GROUP BY tu.id, tu.filename, tu.status
            HAVING COUNT(t.id) = 0
        `);
        
        console.log(`Found ${orphaned.rows.length} orphaned uploads:`);
        orphaned.rows.forEach(u => {
            console.log(`   - Upload #${u.id}: ${u.filename} (status: ${u.status})`);
        });
        
        if (orphaned.rows.length === 0) {
            console.log('✅ No orphaned uploads found!');
            await client.query('ROLLBACK');
            return;
        }
        
        console.log('\n🗑️  Deleting orphaned uploads...');
        
        for (const upload of orphaned.rows) {
            await client.query('DELETE FROM timecard_uploads WHERE id = $1', [upload.id]);
            console.log(`   ✅ Deleted upload #${upload.id}`);
        }
        
        await client.query('COMMIT');
        
        console.log('\n✅ Cleanup complete!');
        console.log('📝 Next step: Re-upload the Excel timecard file');
        console.log('═══════════════════════════════════════════════════════════\n');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

fixOrphanedUploads().catch(console.error);


import pg from 'pg';

const { Client } = pg;

// Database connection
const client = new Client({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function fixNaNHours() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Find all entries with NaN hours
    const { rows: nanEntries } = await client.query(`
      SELECT id, clock_in, clock_out, hours_worked
      FROM timecard_entries
      WHERE hours_worked = 'NaN'::numeric
         OR hours_worked IS NULL
         OR CAST(hours_worked AS TEXT) = 'NaN'
    `);

    console.log(`\n📊 Found ${nanEntries.length} entries with NaN or null hours`);

    let fixed = 0;
    let failed = 0;

    for (const entry of nanEntries) {
      console.log(`\n🔧 Fixing entry ${entry.id}:`);
      console.log(`   Clock In: ${entry.clock_in}`);
      console.log(`   Clock Out: ${entry.clock_out}`);

      if (!entry.clock_in || !entry.clock_out) {
        console.log(`   ⚠️  Skipping - missing clock times`);
        continue;
      }

      try {
        // Parse times
        const [inHour, inMin, inSec = 0] = entry.clock_in.split(':').map(Number);
        const [outHour, outMin, outSec = 0] = entry.clock_out.split(':').map(Number);

        // Create dates
        const start = new Date(1970, 0, 1, inHour, inMin, inSec);
        const end = new Date(1970, 0, 1, outHour, outMin, outSec);

        // Handle overnight shifts
        if (end < start) {
          end.setDate(end.getDate() + 1);
        }

        // Calculate hours
        const millisDiff = end.getTime() - start.getTime();
        const hours_worked = millisDiff / (1000 * 60 * 60);
        const is_overtime = hours_worked > 8;

        if (isNaN(hours_worked) || hours_worked < 0) {
          console.log(`   ❌ Calculation failed: ${hours_worked}`);
          failed++;
          continue;
        }

        // Update the entry
        await client.query(`
          UPDATE timecard_entries
          SET hours_worked = $1, is_overtime = $2
          WHERE id = $3
        `, [hours_worked, is_overtime, entry.id]);

        console.log(`   ✅ Fixed: ${hours_worked.toFixed(2)} hours (OT: ${is_overtime})`);
        fixed++;

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📝 Total: ${nanEntries.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

fixNaNHours();


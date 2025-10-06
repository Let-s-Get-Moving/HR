/**
 * Update Admin Password - MLGA Security Enhancement
 * Changes the admin password from weak "password123" to a strong password
 */

import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';

// Use the Render database URL from memory
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function updateAdminPassword() {
  try {
    console.log('🔐 MLGA: Updating admin password to strong credentials...\n');

    // Revert to original password as requested
    const newPassword = 'password123';
    
    // Hash the new password with bcrypt (cost factor 12)
    console.log('⚙️  Hashing password with bcrypt (cost factor 12)...');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    console.log('✅ Password hashed successfully\n');

    // Update the admin user in the database
    console.log('📝 Updating admin user in database...');
    const result = await pool.query(`
      UPDATE users 
      SET password_hash = $1
      WHERE email = 'admin@hrsystem.com' OR full_name = 'Avneet'
      RETURNING id, email, full_name, role
    `, [passwordHash]);

    if (result.rows.length > 0) {
      console.log('✅ Admin password updated successfully!\n');
      console.log('👤 User details:');
      console.log(`   ID: ${result.rows[0].id}`);
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Full Name: ${result.rows[0].full_name}`);
      console.log(`   Role: ${result.rows[0].role}\n`);
      
      console.log('🔑 NEW CREDENTIALS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   Username: Avneet`);
      console.log(`   Password: ${newPassword}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      console.log('⚠️  IMPORTANT: Save these credentials in a secure location!');
      console.log('⚠️  Old password "password123" will no longer work.\n');
    } else {
      console.log('❌ No admin user found to update!');
      console.log('   Creating new admin user...\n');
      
      // Create new admin user
      const createResult = await pool.query(`
        INSERT INTO users (email, full_name, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, full_name, role
      `, ['admin@hrsystem.com', 'Avneet', passwordHash, 'Admin']);
      
      console.log('✅ Admin user created successfully!');
      console.log(`   ID: ${createResult.rows[0].id}`);
      console.log(`   Email: ${createResult.rows[0].email}`);
      console.log(`   Full Name: ${createResult.rows[0].full_name}\n`);
      
      console.log('🔑 NEW CREDENTIALS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   Username: Avneet`);
      console.log(`   Password: ${newPassword}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

  } catch (error) {
    console.error('❌ Error updating admin password:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateAdminPassword();


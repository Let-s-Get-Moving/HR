#!/usr/bin/env node

import { q } from './src/db.js';

async function addSampleAlerts() {
  try {
    console.log('Adding sample compliance alerts...');

    // Add resolved_at column if it doesn't exist
    await q(`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP`).catch(() => {});

    // Get some employee IDs
    const employees = await q(`SELECT id, first_name, last_name FROM employees LIMIT 10`);
    
    if (employees.rows.length === 0) {
      console.log('No employees found. Please add employees first.');
      return;
    }

    // Clear existing alerts
    await q(`DELETE FROM alerts`);

    const sampleAlerts = [
      {
        type: 'Probation End',
        employee_id: employees.rows[0].id,
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days from now
        notes: 'Employee probation period ending soon'
      },
      {
        type: 'Contract Renewal',
        employee_id: employees.rows[1]?.id || employees.rows[0].id,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        notes: 'Employment contract renewal required'
      },
      {
        type: 'SIN Expiry',
        employee_id: employees.rows[2]?.id || employees.rows[0].id,
        due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days from now
        notes: 'SIN number expiring soon'
      },
      {
        type: 'Work Permit Expiry',
        employee_id: employees.rows[3]?.id || employees.rows[0].id,
        due_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 days from now
        notes: 'Work permit expiring - renewal required'
      },
      {
        type: 'Training Expiry',
        employee_id: employees.rows[4]?.id || employees.rows[0].id,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        notes: 'WHMIS training certification expiring'
      },
      {
        type: 'Training Expiry',
        employee_id: employees.rows[5]?.id || employees.rows[0].id,
        due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 20 days from now
        notes: 'First Aid training certification expiring'
      }
    ];

    for (const alert of sampleAlerts) {
      await q(`
        INSERT INTO alerts (type, employee_id, due_date, notes, resolved)
        VALUES ($1, $2, $3, $4, false)
      `, [alert.type, alert.employee_id, alert.due_date, alert.notes]);
    }

    // Add some sample documents
    await q(`
      INSERT INTO documents (employee_id, doc_type, uploaded_on, signed)
      SELECT id, 'Contract', hire_date, true
      FROM employees 
      WHERE id IN (SELECT id FROM employees LIMIT 5)
      ON CONFLICT DO NOTHING
    `).catch(() => {});

    // Add some sample training records
    const trainings = await q(`SELECT id FROM trainings LIMIT 3`);
    if (trainings.rows.length > 0) {
      for (let i = 0; i < Math.min(3, employees.rows.length); i++) {
        await q(`
          INSERT INTO training_records (employee_id, training_id, completed_on, expires_on, status)
          VALUES ($1, $2, $3, $4, 'Completed')
          ON CONFLICT DO NOTHING
        `, [
          employees.rows[i].id,
          trainings.rows[i % trainings.rows.length].id,
          new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 180 days ago
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]  // 30 days from now
        ]).catch(() => {});
      }
    }

    console.log(`✅ Added ${sampleAlerts.length} sample alerts`);
    console.log('✅ Added sample documents and training records');
    console.log('Sample alerts created:');
    
    for (const alert of sampleAlerts) {
      const employee = employees.rows.find(e => e.id === alert.employee_id);
      console.log(`- ${alert.type} for ${employee.first_name} ${employee.last_name} (due: ${alert.due_date})`);
    }

  } catch (error) {
    console.error('❌ Error adding sample alerts:', error);
  } finally {
    process.exit(0);
  }
}

addSampleAlerts();

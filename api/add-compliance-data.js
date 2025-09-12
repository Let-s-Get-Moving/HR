#!/usr/bin/env node

import { q } from './src/db.js';

const addComplianceData = async () => {
  try {
    console.log('Adding compliance data (training records and documents)...');

    // First, add training types
    console.log('Adding training types...');
    await q(`
      INSERT INTO trainings (code, name, mandatory, validity_months) VALUES
      ('WHMIS', 'Workplace Hazardous Materials Information System', true, 36),
      ('H&S-BASIC', 'Basic Health & Safety Training', true, 12),
      ('FIRE-SAFETY', 'Fire Safety & Emergency Procedures', true, 24),
      ('HARASSMENT', 'Workplace Harassment Prevention', true, 12),
      ('PRIVACY', 'Privacy & Data Protection Training', true, 24)
      ON CONFLICT (code) DO NOTHING
    `);

    // Get all active employees
    const employeesResult = await q(`SELECT id FROM employees WHERE status = 'Active' LIMIT 15`);
    const employeeIds = employeesResult.rows.map(row => row.id);
    
    console.log(`Found ${employeeIds.length} active employees`);

    // Get training IDs
    const trainingsResult = await q(`SELECT id, code, validity_months FROM trainings`);
    const trainings = trainingsResult.rows;

    console.log('Adding training records...');
    
    // Add training records for employees (mix of current and expired)
    for (const employeeId of employeeIds) {
      for (const training of trainings) {
        // 80% chance employee has this training
        if (Math.random() < 0.8) {
          const completedDaysAgo = Math.floor(Math.random() * 500); // Random date in last 500 days
          const completedDate = new Date();
          completedDate.setDate(completedDate.getDate() - completedDaysAgo);
          
          let expiresDate = null;
          if (training.validity_months) {
            expiresDate = new Date(completedDate);
            expiresDate.setMonth(expiresDate.getMonth() + training.validity_months);
          }

          try {
            await q(`
              INSERT INTO training_records (employee_id, training_id, completed_on, expires_on)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (employee_id, training_id) DO NOTHING
            `, [employeeId, training.id, completedDate.toISOString().split('T')[0], 
                expiresDate ? expiresDate.toISOString().split('T')[0] : null]);
          } catch (err) {
            // Ignore duplicate key errors
            if (!err.message.includes('duplicate key')) {
              console.error(`Error adding training record: ${err.message}`);
            }
          }
        }
      }
    }

    console.log('Adding document records...');
    
    // Add documents for employees
    const docTypes = ['Contract', 'PolicyAck', 'Visa', 'WorkPermit'];
    
    for (const employeeId of employeeIds) {
      // Everyone should have a contract
      const contractSigned = Math.random() < 0.9; // 90% have signed contracts
      await q(`
        INSERT INTO documents (employee_id, doc_type, file_name, signed, uploaded_on)
        VALUES ($1, 'Contract', $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [
        employeeId, 
        `contract_employee_${employeeId}.pdf`,
        contractSigned,
        new Date().toISOString()
      ]).catch(() => {}); // Ignore errors

      // Policy acknowledgment
      const policyAckSigned = Math.random() < 0.85; // 85% have signed policy ack
      await q(`
        INSERT INTO documents (employee_id, doc_type, file_name, signed, uploaded_on)
        VALUES ($1, 'PolicyAck', $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [
        employeeId, 
        `policy_ack_employee_${employeeId}.pdf`,
        policyAckSigned,
        new Date().toISOString()
      ]).catch(() => {}); // Ignore errors

      // Some employees have work permits/visas (30% chance)
      if (Math.random() < 0.3) {
        const workPermitSigned = Math.random() < 0.95; // 95% of work permits are signed
        await q(`
          INSERT INTO documents (employee_id, doc_type, file_name, signed, uploaded_on)
          VALUES ($1, 'WorkPermit', $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [
          employeeId, 
          `work_permit_employee_${employeeId}.pdf`,
          workPermitSigned,
          new Date().toISOString()
        ]).catch(() => {}); // Ignore errors
      }
    }

    // Check results
    const contractsResult = await q(`
      SELECT COUNT(*) as total, COUNT(CASE WHEN signed THEN 1 END) as signed 
      FROM documents WHERE doc_type = 'Contract'
    `);
    
    const whmisResult = await q(`
      SELECT COUNT(*) as valid_count
      FROM training_records tr 
      JOIN trainings t ON t.id = tr.training_id 
      WHERE t.code = 'WHMIS' AND (tr.expires_on IS NULL OR tr.expires_on >= CURRENT_DATE)
    `);

    const totalEmployees = employeeIds.length;
    const contractsTotal = parseInt(contractsResult.rows[0].total);
    const contractsSigned = parseInt(contractsResult.rows[0].signed);
    const whmisValid = parseInt(whmisResult.rows[0].valid_count);

    console.log('\n=== COMPLIANCE DATA SUMMARY ===');
    console.log(`Total Active Employees: ${totalEmployees}`);
    console.log(`Total Contracts: ${contractsTotal}`);
    console.log(`Signed Contracts: ${contractsSigned} (${Math.round((contractsSigned/totalEmployees)*100)}%)`);
    console.log(`Valid WHMIS Training: ${whmisValid} (${Math.round((whmisValid/totalEmployees)*100)}%)`);
    
    console.log('\nCompliance data added successfully!');
    
  } catch (error) {
    console.error('Error adding compliance data:', error);
  } finally {
    process.exit(0);
  }
};

addComplianceData();

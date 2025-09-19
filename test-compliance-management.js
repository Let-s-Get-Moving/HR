// Test script for Compliance Management functionality
const API_BASE_URL = 'https://hr-api-wbzs.onrender.com';

async function testComplianceManagement() {
  console.log('🧪 Testing Compliance Management API...\n');

  try {
    // Test 1: Get compliance dashboard
    console.log('1. Testing GET /api/compliance/dashboard');
    const dashboardResponse = await fetch(`${API_BASE_URL}/api/compliance/dashboard`);
    const dashboard = await dashboardResponse.json();
    console.log('✅ Dashboard data:');
    console.log(`   - Total alerts: ${dashboard.total_alerts}`);
    console.log(`   - Expiring soon: ${dashboard.expiring_soon}`);
    console.log(`   - Active employees: ${dashboard.active_employees}`);
    console.log(`   - Contract compliance: ${dashboard.compliance_rate.contract_compliance}%`);
    console.log(`   - Training compliance: ${dashboard.compliance_rate.training_compliance}%\n`);

    // Test 2: Get compliance alerts
    console.log('2. Testing GET /api/compliance/alerts');
    const alertsResponse = await fetch(`${API_BASE_URL}/api/compliance/alerts`);
    const alerts = await alertsResponse.json();
    console.log(`✅ Found ${alerts.length} compliance alerts\n`);

    // Test 3: Get trainings
    console.log('3. Testing GET /api/compliance/trainings');
    const trainingsResponse = await fetch(`${API_BASE_URL}/api/compliance/trainings`);
    const trainings = await trainingsResponse.json();
    console.log(`✅ Found ${trainings.length} trainings\n`);

    // Test 4: Get documents
    console.log('4. Testing GET /api/compliance/documents');
    const documentsResponse = await fetch(`${API_BASE_URL}/api/compliance/documents`);
    const documents = await documentsResponse.json();
    console.log(`✅ Found ${documents.length} documents\n`);

    // Test 5: Get training records
    console.log('5. Testing GET /api/compliance/training-records');
    const trainingRecordsResponse = await fetch(`${API_BASE_URL}/api/compliance/training-records`);
    const trainingRecords = await trainingRecordsResponse.json();
    console.log(`✅ Found ${trainingRecords.length} training records\n`);

    // Test 6: Generate compliance alerts
    console.log('6. Testing POST /api/compliance/generate-alerts');
    const generateAlertsResponse = await fetch(`${API_BASE_URL}/api/compliance/generate-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (generateAlertsResponse.ok) {
      const generateResult = await generateAlertsResponse.json();
      console.log(`✅ Generated ${generateResult.alerts_created} new alerts\n`);
      
      // Test 7: Get alerts after generation
      console.log('7. Testing GET /api/compliance/alerts after generation');
      const newAlertsResponse = await fetch(`${API_BASE_URL}/api/compliance/alerts`);
      const newAlerts = await newAlertsResponse.json();
      console.log(`✅ Found ${newAlerts.length} alerts after generation\n`);

      // Test 8: Resolve an alert (if any exist)
      if (newAlerts.length > 0) {
        console.log('8. Testing PUT /api/compliance/alerts/:id/resolve');
        const alertToResolve = newAlerts[0];
        const resolveResponse = await fetch(`${API_BASE_URL}/api/compliance/alerts/${alertToResolve.id}/resolve`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            notes: 'Resolved for testing purposes'
          })
        });

        if (resolveResponse.ok) {
          const resolvedAlert = await resolveResponse.json();
          console.log(`✅ Resolved alert ID ${resolvedAlert.id}\n`);
        } else {
          console.log(`❌ Failed to resolve alert: ${resolveResponse.status}\n`);
        }
      }
    } else {
      console.log(`❌ Failed to generate alerts: ${generateAlertsResponse.status}\n`);
    }

    // Test 9: Get employee compliance status
    console.log('9. Testing GET /api/compliance/employee/1');
    const employeeResponse = await fetch(`${API_BASE_URL}/api/compliance/employee/1`);
    const employeeCompliance = await employeeResponse.json();
    console.log('✅ Employee compliance data:');
    console.log(`   - Alerts: ${employeeCompliance.alerts.length}`);
    console.log(`   - Documents: ${employeeCompliance.documents.length}`);
    console.log(`   - Identifiers: ${employeeCompliance.identifiers.length}`);
    console.log(`   - Training records: ${employeeCompliance.training.length}\n`);

    console.log('🎉 Compliance Management API tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testComplianceManagement();

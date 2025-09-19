// Test script for Leave Management functionality
const API_BASE_URL = 'https://hr-api-wbzs.onrender.com';

async function testLeaveManagement() {
  console.log('🧪 Testing Leave Management API...\n');

  try {
    // Test 1: Get leave requests
    console.log('1. Testing GET /api/leave/requests');
    const requestsResponse = await fetch(`${API_BASE_URL}/api/leave/requests`);
    const requests = await requestsResponse.json();
    console.log(`✅ Found ${requests.length} leave requests`);
    console.log(`   - Pending: ${requests.filter(r => r.status === 'Pending').length}`);
    console.log(`   - Approved: ${requests.filter(r => r.status === 'Approved').length}`);
    console.log(`   - Rejected: ${requests.filter(r => r.status === 'Rejected').length}\n`);

    // Test 2: Get leave analytics
    console.log('2. Testing GET /api/leave/analytics');
    const analyticsResponse = await fetch(`${API_BASE_URL}/api/leave/analytics`);
    const analytics = await analyticsResponse.json();
    console.log('✅ Analytics data:');
    console.log(`   - Total requests: ${analytics.requests.total_requests}`);
    console.log(`   - Pending: ${analytics.requests.pending}`);
    console.log(`   - Approved: ${analytics.requests.approved}`);
    console.log(`   - Rejected: ${analytics.requests.rejected}`);
    console.log(`   - Upcoming leaves: ${analytics.upcoming.upcoming_leaves}\n`);

    // Test 3: Get leave balances
    console.log('3. Testing GET /api/leave/balances');
    const balancesResponse = await fetch(`${API_BASE_URL}/api/leave/balances`);
    const balances = await balancesResponse.json();
    console.log(`✅ Found ${balances.length} leave balances\n`);

    // Test 4: Get leave calendar
    console.log('4. Testing GET /api/leave/calendar');
    const calendarResponse = await fetch(`${API_BASE_URL}/api/leave/calendar`);
    const calendar = await calendarResponse.json();
    console.log(`✅ Found ${calendar.length} calendar entries\n`);

    // Test 5: Create a new leave request
    console.log('5. Testing POST /api/leave/requests');
    const newRequest = {
      employee_id: 1,
      leave_type_id: 1,
      start_date: '2025-12-25',
      end_date: '2025-12-27',
      total_days: 3,
      reason: 'Holiday testing',
      notes: 'Test request from automation'
    };

    const createResponse = await fetch(`${API_BASE_URL}/api/leave/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newRequest)
    });

    if (createResponse.ok) {
      const createdRequest = await createResponse.json();
      console.log(`✅ Created leave request with ID: ${createdRequest.id}`);
      
      // Test 6: Update leave request status
      console.log('6. Testing PUT /api/leave/requests/:id/status');
      const updateResponse = await fetch(`${API_BASE_URL}/api/leave/requests/${createdRequest.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'Approved',
          approved_by: 1,
          notes: 'Approved for testing'
        })
      });

      if (updateResponse.ok) {
        const updatedRequest = await updateResponse.json();
        console.log(`✅ Updated request status to: ${updatedRequest.status}\n`);
      } else {
        console.log(`❌ Failed to update request status: ${updateResponse.status}\n`);
      }
    } else {
      console.log(`❌ Failed to create leave request: ${createResponse.status}\n`);
    }

    console.log('🎉 Leave Management API tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLeaveManagement();

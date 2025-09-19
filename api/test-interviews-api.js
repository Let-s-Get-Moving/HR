// Test the interviews API endpoints
const API_BASE = 'https://hr-api-wbzs.onrender.com';

async function testInterviewsAPI() {
  console.log('🧪 Testing Interviews API...');
  console.log('=====================================\n');

  try {
    // Test 1: Create an interview
    console.log('1️⃣ Creating a new interview...');
    const createResponse = await fetch(`${API_BASE}/api/recruiting/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidate_id: 100,
        job_posting_id: 100,
        interview_date: '2025-09-29',
        interview_time: '14:30',
        interview_type: 'Video',
        interviewer_id: 100,
        location: 'API Test Location',
        notes: 'API test interview'
      })
    });

    if (createResponse.ok) {
      const created = await createResponse.json();
      console.log(`   ✅ Created interview with ID: ${created.id}`);
      console.log(`   📅 Date: ${created.interview_date}, Time: ${created.interview_time}`);
    } else {
      const error = await createResponse.text();
      console.log(`   ❌ Create failed: ${createResponse.status} - ${error}`);
    }

    // Test 2: Get all interviews
    console.log('\n2️⃣ Fetching all interviews...');
    const getResponse = await fetch(`${API_BASE}/api/recruiting/interviews`);
    
    if (getResponse.ok) {
      const interviews = await getResponse.json();
      console.log(`   ✅ Found ${interviews.length} interviews`);
      interviews.forEach((interview, index) => {
        console.log(`   ${index + 1}. ID: ${interview.id}, Date: ${interview.interview_date}, Type: ${interview.interview_type}`);
      });
    } else {
      const error = await getResponse.text();
      console.log(`   ❌ Get failed: ${getResponse.status} - ${error}`);
    }

    // Test 3: Test the create-interviews-table endpoint
    console.log('\n3️⃣ Testing table creation endpoint...');
    const tableResponse = await fetch(`${API_BASE}/api/recruiting/create-interviews-table`, {
      method: 'POST'
    });
    
    if (tableResponse.ok) {
      const result = await tableResponse.json();
      console.log(`   ✅ Table creation: ${result.message}`);
    } else {
      const error = await tableResponse.text();
      console.log(`   ❌ Table creation failed: ${tableResponse.status} - ${error}`);
    }

    // Test 4: Get interviews again after table creation
    console.log('\n4️⃣ Fetching interviews after table creation...');
    const getResponse2 = await fetch(`${API_BASE}/api/recruiting/interviews`);
    
    if (getResponse2.ok) {
      const interviews = await getResponse2.json();
      console.log(`   ✅ Found ${interviews.length} interviews after table creation`);
      interviews.forEach((interview, index) => {
        console.log(`   ${index + 1}. ID: ${interview.id}, Date: ${interview.interview_date}, Type: ${interview.interview_type}`);
      });
    } else {
      const error = await getResponse2.text();
      console.log(`   ❌ Get failed: ${getResponse2.status} - ${error}`);
    }

  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

testInterviewsAPI();

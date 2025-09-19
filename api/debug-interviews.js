// Debug the interviews issue by checking the database directly via API
const API_BASE = 'https://hr-api-wbzs.onrender.com';

async function debugInterviews() {
  console.log('🔍 Debugging Interviews Issue...');
  console.log('=====================================\n');

  try {
    // Create multiple interviews
    console.log('1️⃣ Creating multiple test interviews...');
    const interviews = [
      {
        candidate_id: 101,
        job_posting_id: 101,
        interview_date: '2025-09-30',
        interview_time: '09:00',
        interview_type: 'Phone',
        interviewer_id: 101,
        location: 'Phone Call',
        notes: 'Debug test 1'
      },
      {
        candidate_id: 102,
        job_posting_id: 102,
        interview_date: '2025-10-01',
        interview_time: '10:00',
        interview_type: 'Video',
        interviewer_id: 102,
        location: 'Zoom',
        notes: 'Debug test 2'
      },
      {
        candidate_id: 103,
        job_posting_id: 103,
        interview_date: '2025-10-02',
        interview_time: '11:00',
        interview_type: 'In-person',
        interviewer_id: 103,
        location: 'Office',
        notes: 'Debug test 3'
      }
    ];

    const createdIds = [];
    for (let i = 0; i < interviews.length; i++) {
      const response = await fetch(`${API_BASE}/api/recruiting/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interviews[i])
      });
      
      if (response.ok) {
        const created = await response.json();
        createdIds.push(created.id);
        console.log(`   ✅ Created interview ${i + 1} with ID: ${created.id}`);
      } else {
        const error = await response.text();
        console.log(`   ❌ Failed to create interview ${i + 1}: ${error}`);
      }
    }

    console.log(`\n📊 Created ${createdIds.length} interviews with IDs: ${createdIds.join(', ')}`);

    // Wait a moment for potential async operations
    console.log('\n⏳ Waiting 2 seconds for async operations...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to get interviews
    console.log('\n2️⃣ Fetching all interviews...');
    const getResponse = await fetch(`${API_BASE}/api/recruiting/interviews`);
    
    if (getResponse.ok) {
      const allInterviews = await getResponse.json();
      console.log(`   📋 Found ${allInterviews.length} total interviews in database`);
      
      if (allInterviews.length > 0) {
        console.log('   📝 Interview details:');
        allInterviews.forEach((interview, index) => {
          console.log(`   ${index + 1}. ID: ${interview.id}, Date: ${interview.interview_date}, Type: ${interview.interview_type}, Notes: ${interview.notes}`);
        });
      } else {
        console.log('   ⚠️  No interviews found - this suggests a database issue');
      }
    } else {
      const error = await getResponse.text();
      console.log(`   ❌ Get failed: ${getResponse.status} - ${error}`);
    }

    // Test individual interview retrieval
    if (createdIds.length > 0) {
      console.log(`\n3️⃣ Testing individual interview retrieval for ID ${createdIds[0]}...`);
      const individualResponse = await fetch(`${API_BASE}/api/recruiting/interviews`);
      if (individualResponse.ok) {
        const individual = await individualResponse.json();
        const found = individual.find(i => i.id === createdIds[0]);
        if (found) {
          console.log(`   ✅ Found individual interview: ${found.notes}`);
        } else {
          console.log(`   ❌ Individual interview not found`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugInterviews();

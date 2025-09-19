// Test script for Performance Management functionality
const API_BASE_URL = 'https://hr-api-wbzs.onrender.com';

async function testPerformanceManagement() {
  console.log('🧪 Testing Performance Management API...\n');

  try {
    // Test 1: Get performance reviews
    console.log('1. Testing GET /api/performance/reviews');
    const reviewsResponse = await fetch(`${API_BASE_URL}/api/performance/reviews`);
    const reviews = await reviewsResponse.json();
    console.log(`✅ Found ${reviews.length} performance reviews`);
    if (reviews.length > 0) {
      console.log(`   - Average rating: ${reviews[0].overall_rating}`);
      console.log(`   - Latest review: ${reviews[0].review_period}\n`);
    }

    // Test 2: Get performance goals
    console.log('2. Testing GET /api/performance/goals');
    const goalsResponse = await fetch(`${API_BASE_URL}/api/performance/goals`);
    const goals = await goalsResponse.json();
    console.log(`✅ Found ${goals.length} performance goals`);
    if (goals.length > 0) {
      const statusCounts = goals.reduce((acc, goal) => {
        acc[goal.status] = (acc[goal.status] || 0) + 1;
        return acc;
      }, {});
      console.log(`   - Status breakdown:`, statusCounts);
    }
    console.log('');

    // Test 3: Get performance analytics
    console.log('3. Testing GET /api/performance/analytics');
    const analyticsResponse = await fetch(`${API_BASE_URL}/api/performance/analytics`);
    const analytics = await analyticsResponse.json();
    console.log('✅ Analytics data:');
    console.log(`   - Average rating: ${analytics.average_rating}`);
    console.log(`   - Reviews by month: ${analytics.reviews_by_month.length} months`);
    console.log(`   - Goals by status:`, analytics.goals_by_status);
    console.log(`   - Top performers: ${analytics.top_performers.length}\n`);

    // Test 4: Create a new performance goal
    console.log('4. Testing POST /api/performance/goals');
    const newGoal = {
      employee_id: 1,
      goal_title: 'Complete API Testing',
      goal_description: 'Test all performance management endpoints',
      target_date: '2025-12-31',
      priority: 'High',
      status: 'In Progress'
    };

    const createGoalResponse = await fetch(`${API_BASE_URL}/api/performance/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newGoal)
    });

    if (createGoalResponse.ok) {
      const createdGoal = await createGoalResponse.json();
      console.log(`✅ Created performance goal with ID: ${createdGoal.id}\n`);
      
      // Test 5: Update goal status
      console.log('5. Testing PUT /api/performance/goals/:id');
      const updateGoalResponse = await fetch(`${API_BASE_URL}/api/performance/goals/${createdGoal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'Completed',
          completion_notes: 'All tests passed successfully'
        })
      });

      if (updateGoalResponse.ok) {
        const updatedGoal = await updateGoalResponse.json();
        console.log(`✅ Updated goal status to: ${updatedGoal.status}\n`);
      } else {
        console.log(`❌ Failed to update goal status: ${updateGoalResponse.status}\n`);
      }
    } else {
      console.log(`❌ Failed to create performance goal: ${createGoalResponse.status}\n`);
    }

    // Test 6: Create a performance review
    console.log('6. Testing POST /api/performance/reviews');
    const newReview = {
      employee_id: 1,
      reviewer_id: 2,
      review_date: '2025-12-20',
      review_period: 'Q4 2025',
      overall_rating: 4.5,
      strengths: 'Excellent API testing skills',
      areas_for_improvement: 'Could improve documentation',
      goals_for_next_period: 'Lead testing automation',
      comments: 'Great work on performance management testing'
    };

    const createReviewResponse = await fetch(`${API_BASE_URL}/api/performance/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newReview)
    });

    if (createReviewResponse.ok) {
      const createdReview = await createReviewResponse.json();
      console.log(`✅ Created performance review with ID: ${createdReview.id}\n`);
    } else {
      console.log(`❌ Failed to create performance review: ${createReviewResponse.status}\n`);
    }

    console.log('🎉 Performance Management API tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPerformanceManagement();

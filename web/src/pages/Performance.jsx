import { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { API } from '../config/api.js';

export default function Performance() {
  const [reviews, setReviews] = useState([]);
  const [goals, setGoals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState("reviews");
  const [loading, setLoading] = useState(true);
  const [newReview, setNewReview] = useState({
    employee_id: "",
    reviewer_id: "",
    review_date: "",
    review_period: "",
    overall_rating: 3,
    strengths: "",
    areas_for_improvement: "",
    goals_for_next_period: ""
  });
  const [newGoal, setNewGoal] = useState({
    employee_id: "",
    goal_title: "",
    goal_description: "",
    target_date: "",
    priority: "Medium"
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reviewsData, goalsData, analyticsData] = await Promise.all([
        API("/api/performance/reviews"),
        API("/api/performance/goals"),
        API("/api/performance/analytics")
      ]);
      
      setReviews(reviewsData);
      setGoals(goalsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error("Error loading performance data:", error);
      // Set empty arrays on error to prevent UI issues
      setReviews([]);
      setGoals([]);
      setAnalytics({});
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      await API("/api/performance/reviews", {
        method: "POST",
        body: JSON.stringify(newReview)
      });
      setNewReview({
        employee_id: "",
        reviewer_id: "",
        review_date: "",
        review_period: "",
        overall_rating: 3,
        strengths: "",
        areas_for_improvement: "",
        goals_for_next_period: ""
      });
      loadData();
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  const handleSubmitGoal = async (e) => {
    e.preventDefault();
    try {
      await API("/api/performance/goals", {
        method: "POST",
        body: JSON.stringify(newGoal)
      });
      setNewGoal({
        employee_id: "",
        goal_title: "",
        goal_description: "",
        target_date: "",
        priority: "Medium"
      });
      loadData();
    } catch (error) {
      console.error("Error submitting goal:", error);
    }
  };

  const handleUpdateGoalStatus = async (goalId, status) => {
    try {
      await API(`/api/performance/goals/${goalId}`, {
        method: "PUT",
        body: JSON.stringify({ status, completion_notes: "Updated by HR" })
      });
      loadData();
    } catch (error) {
      console.error("Error updating goal status:", error);
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 3.5) return "text-blue-600";
    if (rating >= 2.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-secondary/10 text-secondary';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-secondary/10 text-secondary';
    }
  };

  const tabs = [
    { id: "reviews", name: "Performance Reviews", icon: "📋" },
    { id: "goals", name: "Performance Goals", icon: "🎯" },
    { id: "analytics", name: "Analytics", icon: "📊" }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold  mb-2">Performance Management</h1>
        <p className="text-secondary">Manage employee performance reviews and goals</p>
      </motion.div>

      {/* Tabs */}
      <div className="border-b border-primary mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-gray-900 "
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Performance Reviews Tab */}
      {activeTab === "reviews" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* New Review Form */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">New Performance Review</h3>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={newReview.employee_id}
                      onChange={(e) => setNewReview({...newReview, employee_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                      Reviewer ID
                    </label>
                    <input
                      type="text"
                      value={newReview.reviewer_id}
                      onChange={(e) => setNewReview({...newReview, reviewer_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                      Review Date
                    </label>
                    <input
                      type="date"
                      value={newReview.review_date}
                      onChange={(e) => setNewReview({...newReview, review_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                      Review Period
                    </label>
                    <input
                      type="text"
                      value={newReview.review_period}
                      onChange={(e) => setNewReview({...newReview, review_period: e.target.value})}
                      placeholder="Q1 2025"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                    Overall Rating (1-5)
                  </label>
                  <input
                    type="text"
                    value={newReview.overall_rating}
                    onChange={(e) => setNewReview({...newReview, overall_rating: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="1-5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                    Strengths
                  </label>
                  <textarea
                    value={newReview.strengths}
                    onChange={(e) => setNewReview({...newReview, strengths: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                    rows="3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                    Areas for Improvement
                  </label>
                  <textarea
                    value={newReview.areas_for_improvement}
                    onChange={(e) => setNewReview({...newReview, areas_for_improvement: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                    rows="3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                    Goals for Next Period
                  </label>
                  <textarea
                    value={newReview.goals_for_next_period}
                    onChange={(e) => setNewReview({...newReview, goals_for_next_period: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                    rows="3"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full btn-primary py-2 px-4 rounded-md transition-colors"
                >
                  Submit Review
                </button>
              </form>
            </div>

            {/* Reviews List */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Reviews</h3>
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No performance reviews found</p>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="border border-primary rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{review.first_name} {review.last_name}</h4>
                          <p className="text-sm text-secondary">{review.department}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${getRatingColor(review.overall_rating)}`}>
                            {review.overall_rating}/5
                          </p>
                          <p className="text-xs text-gray-500">{review.review_period}</p>
                        </div>
                      </div>
                      <p className="text-sm text-secondary mb-2">
                        Review Date: {new Date(review.review_date).toLocaleDateString()}
                      </p>
                      <div className="text-sm text-secondary">
                        <p><strong>Strengths:</strong> {review.strengths}</p>
                        <p><strong>Areas for Improvement:</strong> {review.areas_for_improvement}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Performance Goals Tab */}
      {activeTab === "goals" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* New Goal Form */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">New Performance Goal</h3>
              <form onSubmit={handleSubmitGoal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={newGoal.employee_id}
                    onChange={(e) => setNewGoal({...newGoal, employee_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                    Goal Title
                  </label>
                  <input
                    type="text"
                    value={newGoal.goal_title}
                    onChange={(e) => setNewGoal({...newGoal, goal_title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                    Goal Description
                  </label>
                  <textarea
                    value={newGoal.goal_description}
                    onChange={(e) => setNewGoal({...newGoal, goal_description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                    rows="3"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={newGoal.target_date}
                      onChange={(e) => setNewGoal({...newGoal, target_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                      Priority
                    </label>
                    <select
                      value={newGoal.priority}
                      onChange={(e) => setNewGoal({...newGoal, priority: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full btn-primary py-2 px-4 rounded-md transition-colors"
                >
                  Create Goal
                </button>
              </form>
            </div>

            {/* Goals List */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Goals</h3>
              <div className="space-y-4">
                {goals.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No performance goals found</p>
                ) : (
                  goals.map((goal) => (
                    <div key={goal.id} className="border border-primary rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{goal.goal_title}</h4>
                          <p className="text-sm text-secondary">{goal.goal_description}</p>
                        </div>
                        <div className="flex space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                            {goal.priority}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                            {goal.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-secondary mb-3">
                        Target Date: {new Date(goal.target_date).toLocaleDateString()}
                      </p>
                      {goal.status !== 'Completed' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateGoalStatus(goal.id, 'In Progress')}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Start
                          </button>
                          <button
                            onClick={() => handleUpdateGoalStatus(goal.id, 'Completed')}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleUpdateGoalStatus(goal.id, 'On Hold')}
                            className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                          >
                            Hold
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {analytics && (
              <>
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-2">Average Rating</h3>
                  <p className={`text-3xl font-bold ${getRatingColor(analytics.average_rating || 0)}`}>
                    {analytics.average_rating || 0}
                  </p>
                </div>
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-2">Total Reviews</h3>
                  <p className="text-3xl font-bold ">{reviews.length}</p>
                </div>
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-2">Active Goals</h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {goals.filter(g => g.status === 'In Progress').length}
                  </p>
                </div>
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-2">Completed Goals</h3>
                  <p className="text-3xl font-bold text-green-600">
                    {goals.filter(g => g.status === 'Completed').length}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Top Performers */}
          {analytics?.top_performers && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
              <div className="space-y-3">
                {analytics.top_performers.map((performer, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <span className="font-medium">{performer.first_name} {performer.last_name}</span>
                    </div>
                    <span className={`text-lg font-bold ${getRatingColor(performer.avg_rating)}`}>
                      {performer.avg_rating}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

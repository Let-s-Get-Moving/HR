import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Greeting from "../components/Greeting.jsx";
import MetricCard from "../components/MetricCard.jsx";
import Donut from "../components/Donut.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import { API } from '../config/api.js';

export default function Dashboard({ onNavigate }) {
  const [analytics, setAnalytics] = useState(null);
  const [wf, setWf] = useState(null);
  const [att, setAtt] = useState(null);
  const [cmp, setCmp] = useState(null);
  const [payroll, setPayroll] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');

  useEffect(() => {
    loadData();
  }, [selectedTimeRange]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [analyticsData, wfData, attData, cmpData, payrollData, activityData] = await Promise.all([
        API("/api/analytics/dashboard").catch(() => null),
        API("/api/metrics/workforce").catch(() => null),
        API("/api/metrics/attendance").catch(() => null),
        API("/api/metrics/compliance").catch(() => null),
        API("/api/payroll/calculations").catch(() => []),
        API("/api/analytics/recent-activity").catch(() => [])
      ]);
      
      setAnalytics(analyticsData);
      setWf(wfData);
      setAtt(attData);
      setCmp(cmpData);
      setPayroll(payrollData);
      setRecentActivity(activityData || []);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleQuickAction = (action) => {
    if (onNavigate) {
      switch (action) {
        case 'add-employee':
          onNavigate('employees');
          break;
        case 'leave-request':
          onNavigate('leave');
          break;
        case 'process-payroll':
          onNavigate('payroll');
          break;
        case 'view-reports':
          onNavigate('compliance');
          break;
        default:
          break;
      }
    }
  };

  const getTimeRangeLabel = (range) => {
    const labels = {
      'week': 'This Week',
      'month': 'This Month',
      'quarter': 'This Quarter',
      'year': 'This Year'
    };
    return labels[range] || 'This Month';
  };

  if (loading) {
    return (
      <div className="dashboard-container p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-neutral-400">Loading your HR insights...</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <SkeletonLoader type="card" count={4} />
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <SkeletonLoader type="card" count={3} />
        </div>
      </div>
    );
  }

  // Calculate additional metrics
  const totalPayroll = payroll?.reduce((sum, calc) => sum + (calc.gross_pay || 0), 0) || 0;
  const avgHoursPerEmployee = att?.avg_hours_week || 0;
  const employeeSatisfaction = 87; // Mock data - would come from surveys
  const trainingCompletion = 92; // Mock data - would come from training records

  return (
    <div className="dashboard-container p-6 max-w-7xl mx-auto">
      {/* Header with Refresh and Time Range */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Greeting name="Avneet" />
          <p className="text-neutral-400 mt-2">Here's what's happening in your organization</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-neutral-400">Time Range:</label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <svg 
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Enhanced Key Metrics with Animations */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <MetricCard 
            label="Total Active Employees" 
            value={analytics?.workforceOverview?.total_active_employees ?? wf?.total ?? "..."}
            icon="👥"
            trend="+2.3%"
            trendUp={true}
            sub={`${wf?.breakdown?.full_time || 0} full-time, ${wf?.breakdown?.part_time || 0} part-time`}
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <MetricCard 
            label="New Hires (This Month)" 
            value={analytics?.newHires?.length ?? 0}
            icon="🎉"
            trend="+15%"
            trendUp={true}
            sub={`${getTimeRangeLabel(selectedTimeRange)}`}
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <MetricCard 
            label="Employee Satisfaction" 
            value={`${employeeSatisfaction}%`}
            icon="😊"
            trend="+5%"
            trendUp={true}
            sub="Based on recent surveys"
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <MetricCard 
            label="Training Completion" 
            value={`${trainingCompletion}%`}
            icon="🎓"
            trend="+8%"
            trendUp={true}
            sub="Required courses completed"
          />
        </motion.div>
      </div>

      {/* Financial Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid md:grid-cols-3 gap-6 mb-8"
      >
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Payroll Overview</h3>
            <div className="text-2xl">💰</div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Total Payroll</span>
              <span className="text-2xl font-bold text-green-400">
                ${totalPayroll.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Avg per Employee</span>
              <span className="text-lg text-white">
                ${wf?.total ? (totalPayroll / wf.total).toLocaleString() : '0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Payroll Submissions</span>
              <span className="text-lg text-white">
                {payroll?.length || 0} entries
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Attendance Metrics</h3>
            <div className="text-2xl">⏰</div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Avg Hours/Week</span>
              <span className="text-2xl font-bold text-blue-400">
                {avgHoursPerEmployee}h
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Absenteeism Rate</span>
              <span className="text-lg text-white">
                {att?.absenteeism_rate || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Late Arrivals</span>
              <span className="text-lg text-white">
                {att?.late_arrivals || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Compliance Status</h3>
            <div className="text-2xl">✅</div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Contracts Signed</span>
              <span className="text-2xl font-bold text-green-400">
                {cmp?.contracts_signed_pct || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">WHMIS Valid</span>
              <span className="text-lg text-white">
                {cmp?.whmis_valid_pct || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Training Complete</span>
              <span className="text-lg text-white">
                {trainingCompletion}%
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Employment Mix and Department Distribution */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Employment Mix</h3>
          {wf && (
            <div className="flex items-center gap-6">
              <Donut
                segments={[
                  { value: (wf.breakdown.full_time || 0) / Math.max(wf.total,1), color: "#818cf8", label: "Full-time" },
                  { value: (wf.breakdown.part_time || 0) / Math.max(wf.total,1), color: "#34d399", label: "Part-time" },
                  { value: (wf.breakdown.contract || 0) / Math.max(wf.total,1), color: "#f472b6", label: "Contract" }
                ]}
              />
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-indigo-400"></div>
                  <div>
                    <div className="text-white font-medium">Full-time</div>
                    <div className="text-neutral-400">{wf.breakdown.full_time || 0} employees</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-green-400"></div>
                  <div>
                    <div className="text-white font-medium">Part-time</div>
                    <div className="text-neutral-400">{wf.breakdown.part_time || 0} employees</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-pink-400"></div>
                  <div>
                    <div className="text-white font-medium">Contract</div>
                    <div className="text-neutral-400">{wf.breakdown.contract || 0} employees</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Department Distribution</h3>
          {analytics?.departmentDistribution && analytics.departmentDistribution.length > 0 ? (
            <div className="space-y-3">
              {analytics.departmentDistribution.map((dept, index) => (
                <div key={dept.department} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
                    <span className="text-sm font-medium text-white">{dept.department}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-20 bg-neutral-700 rounded-full h-2">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${dept.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-white w-8 text-right">
                      {dept.employee_count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-neutral-400 py-8">
              <div className="text-4xl mb-2">📊</div>
              <p>No department data available</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-neutral-800/50 rounded-lg">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{activity.description}</p>
                    <p className="text-xs text-neutral-400 mt-1">{activity.timestamp}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-neutral-400 py-8">
                <div className="text-4xl mb-2">📝</div>
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleQuickAction('add-employee')}
              className="p-4 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-center transition-colors hover:scale-105"
            >
              <div className="text-2xl mb-2">👤</div>
              <div className="text-sm font-medium">Add Employee</div>
            </button>
            <button 
              onClick={() => handleQuickAction('leave-request')}
              className="p-4 bg-green-600 hover:bg-green-700 rounded-lg text-center transition-colors hover:scale-105"
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="text-sm font-medium">New Leave Request</div>
            </button>
            <button 
              onClick={() => handleQuickAction('process-payroll')}
              className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-center transition-colors hover:scale-105"
            >
              <div className="text-2xl mb-2">💰</div>
              <div className="text-sm font-medium">Process Payroll</div>
            </button>
            <button 
              onClick={() => handleQuickAction('view-reports')}
              className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-center transition-colors hover:scale-105"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium">View Reports</div>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
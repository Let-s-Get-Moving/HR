import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Greeting from "../components/Greeting.jsx";
import MetricCard from "../components/MetricCard.jsx";
import Donut from "../components/Donut.jsx";

import { API } from '../config/api.js';

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [wf, setWf] = useState(null);
  const [att, setAtt] = useState(null);
  const [cmp, setCmp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [analyticsData, wfData, attData, cmpData] = await Promise.all([
          API("/api/analytics/dashboard"),
          API("/api/metrics/workforce"),
          API("/api/metrics/attendance"),
          API("/api/metrics/compliance")
        ]);
        
        setAnalytics(analyticsData);
        setWf(wfData);
        setAtt(attData);
        setCmp(cmpData);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <div className="text-lg text-neutral-400">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container p-6 max-w-7xl mx-auto">
      <Greeting name="Avneet" />
      
      {/* Enhanced Key Metrics with Animations */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
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
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <MetricCard 
            label="Terminations (This Month)" 
            value={analytics?.terminations?.length ?? 0}
            icon="📤"
            trend="-5%"
            trendUp={false}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <MetricCard 
            label="Turnover Rate (YTD)" 
            value={`${analytics?.turnoverRate ?? 0}%`}
            icon="📊"
            trend="-12%"
            trendUp={false}
          />
        </motion.div>
      </div>

      {/* Employment Mix */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="dashboard-card p-5">
          <div className="text-sm text-tertiary mb-2">Employment Mix</div>
          {wf && (
            <div className="flex items-center gap-4">
              <Donut
                segments={[
                  { value: (wf.breakdown.full_time || 0) / Math.max(wf.total,1), color: "#818cf8" },
                  { value: (wf.breakdown.part_time || 0) / Math.max(wf.total,1), color: "#34d399" },
                  { value: (wf.breakdown.contract || 0) / Math.max(wf.total,1), color: "#f472b6" }
                ]}
              />
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: "#818cf8"}}></div>
                  <span>Full-time ({wf.breakdown.full_time || 0})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: "#34d399"}}></div>
                  <span>Part-time ({wf.breakdown.part_time || 0})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: "#f472b6"}}></div>
                  <span>Contract ({wf.breakdown.contract || 0})</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-card p-5">
          <div className="text-sm text-tertiary mb-2">Attendance (This Period)</div>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Absenteeism (%)" value={att?.absenteeism_rate ?? "..."} />
            <MetricCard label="Avg Hours / wk" value={att?.avg_hours_week ?? "..."} />
            <MetricCard label="Late Arrivals" value={att?.late_arrivals ?? "..."} />
            <MetricCard label="Early Leaves" value={att?.early_leaves ?? "..."} />
          </div>
        </div>

        <div className="dashboard-card p-5">
          <div className="text-sm text-tertiary mb-2">Compliance</div>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Contracts Signed" value={`${cmp?.contracts_signed_pct ?? "..."}%`} />
            <MetricCard label="WHMIS Valid" value={`${cmp?.whmis_valid_pct ?? "..."}%`} />
          </div>
        </div>
      </div>

      {/* Enhanced Analytics Sections */}
      {analytics && (
        <>
          {/* Department Distribution */}
          {analytics.departmentDistribution && analytics.departmentDistribution.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="dashboard-card p-6 mb-6"
            >
              <h3 className="text-lg font-semibold mb-4">Department Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.departmentDistribution.map((dept) => (
                  <div key={dept.department} className="flex justify-between items-center p-3 bg-tertiary/10 rounded-lg">
                    <span className="text-sm font-medium">{dept.department}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-secondary/20 rounded-full h-2">
                        <div 
                          className="bg-indigo-500 h-2 rounded-full" 
                          style={{ width: `${dept.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{dept.employee_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Recent Activity */}
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="dashboard-card p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Upcoming Anniversaries</h3>
              <div className="space-y-3">
                {analytics.upcomingAnniversaries && analytics.upcomingAnniversaries.length > 0 ? (
                  analytics.upcomingAnniversaries.slice(0, 5).map((emp) => (
                    <div key={emp.id} className="flex justify-between items-center p-3 bg-neutral-800 rounded-lg">
                      <div>
                        <div className="font-medium">{emp.first_name} {emp.last_name}</div>
                        <div className="text-sm text-neutral-400">{emp.department}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{emp.years_of_service} years</div>
                        <div className="text-xs text-neutral-400">
                          {new Date(emp.next_anniversary).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-neutral-400 text-center py-4">No upcoming anniversaries</div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="dashboard-card p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Probation Completions</h3>
              <div className="space-y-3">
                {analytics.upcomingProbationCompletions && analytics.upcomingProbationCompletions.length > 0 ? (
                  analytics.upcomingProbationCompletions.slice(0, 5).map((emp) => (
                    <div key={emp.id} className="flex justify-between items-center p-3 bg-neutral-800 rounded-lg">
                      <div>
                        <div className="font-medium">{emp.first_name} {emp.last_name}</div>
                        <div className="text-sm text-neutral-400">{emp.department}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{emp.days_until_completion} days</div>
                        <div className="text-xs text-neutral-400">
                          {new Date(emp.probation_end).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-neutral-400 text-center py-4">No upcoming probation completions</div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

import { API } from '../config/api.js';

export default function Testing() {
  const { t } = useTranslation();
  const [testResults, setTestResults] = useState({});
  const [runningTests, setRunningTests] = useState(false);
  const [systemInfo, setSystemInfo] = useState({});

  const tests = [
    {
      id: "authentication",
      name: "Authentication & MFA",
      description: "Login, sessions, MFA, trusted devices",
      endpoints: [
        { url: "/api/auth/session", name: "Session Check" },
        { url: "/api/trusted-devices", name: "Trusted Devices" },
        { url: "/api/users", name: "User Management" }
      ]
    },
    {
      id: "chat",
      name: "💬 Chat & Messaging",
      description: "Real-time chat, threads, messages, attachments",
      endpoints: [
        { url: "/api/chat/available-users", name: "Available Users" },
        { url: "/api/chat/threads", name: "Chat Threads" },
      ]
    },
    {
      id: "notifications",
      name: "🔔 Notifications",
      description: "Notification center, unread counts, real-time updates",
      endpoints: [
        { url: "/api/notifications", name: "Get Notifications" },
        { url: "/api/notifications/unread-count", name: "Unread Count" },
      ]
    },
    {
      id: "settings",
      name: "⚙️ Settings",
      description: "Application settings, notification preferences",
      endpoints: [
        { url: "/api/settings/notifications", name: "Notification Settings" },
        { url: "/api/settings/application", name: "Application Settings" },
      ]
    },
    {
      id: "employees",
      name: "👥 Employee Management",
      description: "Employee CRUD, departments, profiles",
      endpoints: [
        { url: "/api/employees", name: "Employee List" },
        { url: "/api/employees/departments", name: "Departments" },
      ]
    },
    {
      id: "timecards",
      name: "⏰ Time & Attendance",
      description: "Timecards, uploads, tracking",
      endpoints: [
        { url: "/api/timecards", name: "Timecard List" },
      ]
    },
    {
      id: "leave",
      name: "🏖️ Leave Management",
      description: "Leave requests, approvals, analytics",
      endpoints: [
        { url: "/api/leave/requests", name: "Leave Requests" },
        { url: "/api/leave/analytics", name: "Leave Analytics" },
        { url: "/api/leave/types", name: "Leave Types" },
      ]
    },
    {
      id: "payroll",
      name: "💰 Payroll & Compensation",
      description: "Payroll calculations, periods, processing",
      endpoints: [
        { url: "/api/payroll/periods", name: "Payroll Periods" },
        { url: "/api/payroll/calculations", name: "Calculations" },
      ]
    },
    {
      id: "bonuses",
      name: "💵 Bonuses & Commissions",
      description: "Bonuses, commissions, structures, approvals",
      endpoints: [
        { url: "/api/bonuses", name: "Bonuses List" },
        { url: "/api/bonuses/structures", name: "Bonus Structures" },
        { url: "/api/bonuses/commission-structures", name: "Commission Structures" },
      ]
    },
    {
      id: "benefits",
      name: "💼 Benefits",
      description: "Benefits plans, enrollments, retirement",
      endpoints: [
        { url: "/api/benefits/plans", name: "Benefits Plans" },
        { url: "/api/benefits/enrollments", name: "Enrollments" },
        { url: "/api/benefits/retirement-plans", name: "Retirement Plans" },
        { url: "/api/benefits/insurance-plans", name: "Insurance Plans" },
      ]
    },
    {
      id: "performance",
      name: "📈 Performance Management",
      description: "Reviews, goals, analytics",
      endpoints: [
        { url: "/api/performance/reviews", name: "Performance Reviews" },
        { url: "/api/performance/goals", name: "Performance Goals" },
        { url: "/api/performance/analytics", name: "Analytics" },
      ]
    },
    {
      id: "compliance",
      name: "✅ Compliance",
      description: "Compliance dashboard, alerts, training",
      endpoints: [
        { url: "/api/compliance/dashboard", name: "Dashboard" },
        { url: "/api/compliance/alerts", name: "Alerts" },
        { url: "/api/compliance/trainings", name: "Training Records" },
      ]
    },
    {
      id: "recruiting",
      name: "📋 Recruiting",
      description: "Job postings, candidates, interviews",
      endpoints: [
        { url: "/api/recruiting/job-postings", name: "Job Postings" },
        { url: "/api/recruiting/candidates", name: "Candidates" },
        { url: "/api/recruiting/interviews", name: "Interviews" },
        { url: "/api/recruiting/analytics", name: "Analytics" },
      ]
    },
    {
      id: "termination",
      name: "👋 Termination",
      description: "Employee offboarding, checklist",
      endpoints: [
        { url: "/api/termination/checklist-template", name: "Checklist Template" },
        { url: "/api/termination/list", name: "Termination List" },
      ]
    },
    {
      id: "analytics",
      name: "📊 Analytics & Metrics",
      description: "System analytics, metrics, dashboards",
      endpoints: [
        { url: "/api/analytics/dashboard", name: "Dashboard Analytics" },
        { url: "/api/metrics", name: "System Metrics" },
      ]
    },
    {
      id: "system",
      name: "🔧 System & Health",
      description: "Health checks, diagnostics",
      endpoints: [
        { url: "/api/health/health", name: "Health Check" },
        { url: "/api/diagnostic/database", name: "Database Health" },
      ]
    }
  ];

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    try {
      const info = {
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      setSystemInfo(info);
    } catch (error) {
      console.error("Error loading system info:", error);
    }
  };

  const runAllTests = async () => {
    setRunningTests(true);
    const results = {};

    // Initialize all test groups
    for (const testGroup of tests) {
      results[testGroup.id] = {
        name: testGroup.name,
        status: "pending",
        total: testGroup.endpoints.length,
        passed: 0,
        failed: 0,
        warned: 0,
        tests: testGroup.endpoints.map(endpoint => ({
          name: endpoint.name,
          url: endpoint.url,
          status: "pending",
          result: null,
          error: null,
          time: null
        }))
      };
    }

    setTestResults({ ...results });

    // Run all test groups
    for (const testGroup of tests) {
      await runTestGroup(testGroup, results);
    }

    setRunningTests(false);
  };

  const runTestGroup = async (testGroup, results) => {
    const groupResults = results[testGroup.id];
    groupResults.status = "running";
    setTestResults({ ...results });

    for (let i = 0; i < testGroup.endpoints.length; i++) {
      const endpoint = testGroup.endpoints[i];
      const test = groupResults.tests[i];

      test.status = "running";
      setTestResults({ ...results });

      const startTime = performance.now();

      try {
        const response = await API(endpoint.url);
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        test.time = responseTime;

        // Determine success
        if (response) {
          if (Array.isArray(response)) {
            test.status = "passed";
            test.result = `✓ ${response.length} records (${responseTime}ms)`;
            groupResults.passed++;
          } else if (response.data && Array.isArray(response.data)) {
            test.status = "passed";
            test.result = `✓ ${response.data.length} records (${responseTime}ms)`;
            groupResults.passed++;
          } else if (response.count !== undefined || response.total !== undefined) {
            test.status = "passed";
            test.result = `✓ Count: ${response.count || response.total} (${responseTime}ms)`;
            groupResults.passed++;
          } else if (typeof response === 'object') {
            test.status = "passed";
            test.result = `✓ Data loaded (${responseTime}ms)`;
            groupResults.passed++;
          } else {
            test.status = "warning";
            test.result = `⚠ Unexpected format (${responseTime}ms)`;
            groupResults.warned++;
          }
        } else {
          test.status = "warning";
          test.result = `⚠ Empty response (${responseTime}ms)`;
          groupResults.warned++;
        }
      } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        test.time = responseTime;

        if (error.message.includes("401") || error.message.includes("Unauthorized")) {
          test.status = "warning";
          test.result = `⚠ Authentication required`;
          groupResults.warned++;
        } else if (error.message.includes("403") || error.message.includes("Forbidden")) {
          test.status = "warning";
          test.result = `⚠ Access denied`;
          groupResults.warned++;
        } else if (error.message.includes("404") || error.message.includes("Not Found")) {
          test.status = "warning";
          test.result = `⚠ Endpoint not found`;
          groupResults.warned++;
        } else {
          test.status = "failed";
          test.error = error.message;
          test.result = `✗ ${error.message.substring(0, 50)}`;
          groupResults.failed++;
        }
      }

      setTestResults({ ...results });
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Determine overall group status
    if (groupResults.failed === 0 && groupResults.warned === 0) {
      groupResults.status = "passed";
    } else if (groupResults.failed === 0) {
      groupResults.status = "warning";
    } else {
      groupResults.status = "failed";
    }

    setTestResults({ ...results });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "passed": return "text-green-400";
      case "failed": return "text-red-400";
      case "warning": return "text-yellow-400";
      case "running": return "text-blue-400";
      default: return "text-neutral-400";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "passed": return "✅";
      case "failed": return "❌";
      case "warning": return "⚠️";
      case "running": return "🔄";
      default: return "⏳";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "passed": return "bg-green-500/20 text-green-400 border-green-500/50";
      case "failed": return "bg-red-500/20 text-red-400 border-red-500/50";
      case "warning": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "running": return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      default: return "bg-neutral-500/20 text-neutral-400 border-neutral-500/50";
    }
  };

  // Calculate overall statistics
  const calculateStats = () => {
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let warned = 0;

    Object.values(testResults).forEach(group => {
      totalTests += group.total;
      passed += group.passed;
      failed += group.failed;
      warned += group.warned;
    });

    return { totalTests, passed, failed, warned };
  };

  const stats = calculateStats();
  const hasResults = Object.keys(testResults).length > 0;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">System Testing</h1>
        <p className="text-neutral-400 mt-1">Comprehensive testing suite for C&C HR System</p>
      </div>

      {/* System Information */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-neutral-400">Screen:</span> 
            <span className="ml-2 text-white">{systemInfo.screenSize}</span>
          </div>
          <div>
            <span className="font-medium text-neutral-400">Viewport:</span> 
            <span className="ml-2 text-white">{systemInfo.viewport}</span>
          </div>
          <div>
            <span className="font-medium text-neutral-400">Timezone:</span> 
            <span className="ml-2 text-white">{systemInfo.timezone}</span>
          </div>
        </div>
      </div>

      {/* Test Controls & Stats */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Test Suite</h3>
            <p className="text-sm text-neutral-400 mt-1">
              Run comprehensive tests across all system modules
            </p>
          </div>
          <button
            onClick={runAllTests}
            disabled={runningTests}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-medium text-white transition-all shadow-lg hover:shadow-indigo-500/50"
          >
            {runningTests ? "🔄 Running Tests..." : "▶️ Run All Tests"}
          </button>
        </div>

        {/* Stats */}
        {hasResults && stats.totalTests > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-neutral-800/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{stats.totalTests}</div>
              <div className="text-sm text-neutral-400">Total Tests</div>
            </div>
            <div className="bg-green-500/10 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-400">{stats.passed}</div>
              <div className="text-sm text-neutral-400">Passed</div>
            </div>
            <div className="bg-yellow-500/10 rounded-xl p-4">
              <div className="text-2xl font-bold text-yellow-400">{stats.warned}</div>
              <div className="text-sm text-neutral-400">Warnings</div>
            </div>
            <div className="bg-red-500/10 rounded-xl p-4">
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <div className="text-sm text-neutral-400">Failed</div>
            </div>
          </div>
        )}
      </div>

      {/* Test Results */}
      <div className="space-y-4">
        {tests.map((testGroup) => {
          const groupResult = testResults[testGroup.id];
          const hasGroupResult = groupResult && groupResult.tests;

          return (
            <motion.div
              key={testGroup.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-white">{testGroup.name}</h4>
                  <p className="text-sm text-neutral-400">{testGroup.description}</p>
                </div>
                {hasGroupResult && (
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusBadge(groupResult.status)}`}>
                      {getStatusIcon(groupResult.status)} {groupResult.status.toUpperCase()}
                    </div>
                    <div className="text-sm text-neutral-400">
                      {groupResult.passed}/{groupResult.total}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {testGroup.endpoints.map((endpoint, index) => {
                  const testResult = hasGroupResult ? groupResult.tests[index] : null;

                  return (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 bg-neutral-800/30 rounded-xl hover:bg-neutral-800/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white">{endpoint.name}</div>
                        <div className="text-xs text-neutral-500 font-mono">{endpoint.url}</div>
                      </div>
                      {testResult && (
                        <div className="flex items-center gap-3 ml-4">
                          <span className={`text-lg ${getStatusColor(testResult.status)}`}>
                            {getStatusIcon(testResult.status)}
                          </span>
                          <span className="text-sm text-neutral-400 max-w-md truncate">
                            {testResult.result || testResult.error}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Module Overview */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mt-6">
        <h3 className="text-lg font-semibold text-white mb-4">System Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: "👥", name: "Employee Management", desc: "CRUD, profiles, departments" },
            { icon: "💰", name: "Payroll & Compensation", desc: "Automated calculations" },
            { icon: "💬", name: "Chat & Messaging", desc: "Real-time communication" },
            { icon: "🔔", name: "Notifications", desc: "Real-time alerts" },
            { icon: "⚙️", name: "Settings", desc: "System configuration" },
            { icon: "💼", name: "Benefits", desc: "Plans & enrollments" },
            { icon: "💵", name: "Bonuses & Commissions", desc: "Compensation management" },
            { icon: "📋", name: "Recruiting", desc: "Hiring pipeline" },
            { icon: "🏖️", name: "Leave Management", desc: "Request & approval workflow" },
            { icon: "⏰", name: "Time & Attendance", desc: "Timecard tracking" },
            { icon: "📈", name: "Performance", desc: "Reviews & goals" },
            { icon: "✅", name: "Compliance", desc: "Regulatory compliance" },
          ].map((module, idx) => (
            <div key={idx} className="p-4 bg-neutral-800/30 rounded-xl hover:bg-neutral-800/50 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">{module.icon}</div>
                <div className="font-medium text-white">{module.name}</div>
              </div>
              <div className="text-sm text-neutral-400">{module.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

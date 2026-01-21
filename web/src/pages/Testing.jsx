import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { API } from '../config/api.js';

export default function Testing() {
  const [testResults, setTestResults] = useState({});
  const [runningTests, setRunningTests] = useState(false);
  const [systemInfo, setSystemInfo] = useState({});

  const tests = [
    {
      id: "authentication",
      name: "🔐 Authentication & MFA",
      description: "Login, sessions, MFA, trusted devices",
      endpoints: [
        { url: "/api/auth/session", name: "Session Check" },
        { url: "/api/trusted-devices", name: "Trusted Devices" },
        { url: "/api/users/me", name: "User Profile" }
      ]
    },
    {
      id: "auth-extended",
      name: "🔑 Auth Extended",
      description: "MFA trusted devices, security tokens",
      endpoints: [
        { url: "/api/auth/mfa/trusted-devices", name: "MFA Trusted Devices" },
      ]
    },
    {
      id: "user-management",
      name: "👤 User Management",
      description: "User accounts, roles, permissions",
      endpoints: [
        { url: "/api/users", name: "Users List" },
        { url: "/api/users/roles/list", name: "Available Roles" },
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
        { url: "/api/settings/system", name: "System Settings" },
      ]
    },
    {
      id: "settings-extended",
      name: "⚙️ Settings Extended",
      description: "User preferences, security, HR policies configuration",
      endpoints: [
        { url: "/api/settings/preferences", name: "User Preferences" },
        { url: "/api/settings/security", name: "Security Settings" },
        { url: "/api/settings/security/mfa/status", name: "MFA Status" },
        { url: "/api/settings/job-titles", name: "Job Titles" },
        { url: "/api/settings/benefits-packages", name: "Benefits Packages" },
        { url: "/api/settings/work-schedules", name: "Work Schedules" },
        { url: "/api/settings/overtime-policies", name: "Overtime Policies" },
        { url: "/api/settings/attendance-policies", name: "Attendance Policies" },
        { url: "/api/settings/remote-work-policies", name: "Remote Work Policies" },
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
      id: "employees-extended",
      name: "👥 Employees Extended",
      description: "Terminated employees, locations, documents, training, HR details",
      endpoints: [
        { url: "/api/employees/terminated", name: "Terminated Employees" },
        { url: "/api/employees/locations", name: "Locations" },
        { url: "/api/employees/locations?all=true", name: "All Locations" },
        { url: "/api/employees/time-entries", name: "All Time Entries" },
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
      id: "leave-extended",
      name: "🏖️ Leave Extended",
      description: "Leave balances, policies, holidays, calendar",
      endpoints: [
        { url: "/api/leave/balances", name: "Leave Balances" },
        { url: "/api/leave/policies", name: "Leave Policies" },
        { url: "/api/leave/holidays", name: "Company Holidays" },
        { url: "/api/leave/calendar", name: "Leave Calendar" },
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
      id: "commissions-extended",
      name: "💵 Commissions Extended",
      description: "Monthly commissions, periods, summary",
      endpoints: [
        { url: "/api/commissions/monthly", name: "Monthly Commissions" },
        { url: "/api/commissions/periods", name: "Commission Periods" },
        { url: "/api/commissions/summary", name: "Commission Summary" },
      ]
    },
    {
      id: "sales-commissions",
      name: "💰 Sales Commissions",
      description: "Sales agents, managers, commission rules and calculations",
      endpoints: [
        { url: "/api/sales-commissions/agents", name: "Sales Agents" },
        { url: "/api/sales-commissions/managers", name: "Sales Managers" },
        { url: "/api/sales-commissions/periods", name: "Commission Periods" },
        { url: "/api/sales-commissions/summary", name: "Commission Summary" },
        { url: "/api/sales-commissions/rules", name: "Commission Rules" },
        { url: "/api/sales-commissions/adjustment-status", name: "Adjustment Status" },
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
        { url: "/api/compliance/training-records", name: "All Training Records" },
        { url: "/api/compliance/documents", name: "Compliance Documents" },
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
        { url: "/api/analytics/recent-activity", name: "Recent Activity" },
        { url: "/api/metrics/workforce", name: "Workforce Metrics" },
        { url: "/api/metrics/attendance", name: "Attendance Metrics" },
        { url: "/api/metrics/compliance", name: "Compliance Metrics" },
      ]
    },
    {
      id: "system",
      name: "🔧 System & Health",
      description: "Health checks, system status",
      endpoints: [
        { url: "/health/health", name: "Health Check" },
        { url: "/health/metrics", name: "System Metrics" },
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
      default: return "text-tahoe-text-muted";
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
      default: return "bg-tahoe-bg-quaternary/20 text-tahoe-text-muted border-tahoe-border-primary/50";
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
        <p className="text-tahoe-text-muted mt-1">Comprehensive testing suite for C&C HR System</p>
      </div>

      {/* System Information */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-tahoe-text-muted">Screen:</span> 
            <span className="ml-2 text-white">{systemInfo.screenSize}</span>
          </div>
          <div>
            <span className="font-medium text-tahoe-text-muted">Viewport:</span> 
            <span className="ml-2 text-white">{systemInfo.viewport}</span>
          </div>
          <div>
            <span className="font-medium text-tahoe-text-muted">Timezone:</span> 
            <span className="ml-2 text-white">{systemInfo.timezone}</span>
          </div>
        </div>
      </div>

      {/* Test Controls & Stats */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Test Suite</h3>
            <p className="text-sm text-tahoe-text-muted mt-1">
              Run comprehensive tests across all system modules
            </p>
          </div>
          <button
            onClick={runAllTests}
            disabled={runningTests}
            className="px-6 py-3 rounded-tahoe-pill font-medium text-white transition-all duration-tahoe shadow-lg disabled:cursor-not-allowed"
            style={{ backgroundColor: runningTests ? 'rgba(10, 132, 255, 0.5)' : '#0A84FF' }}
          >
            {runningTests ? "🔄 Running Tests..." : "▶️ Run All Tests"}
          </button>
        </div>

        {/* Stats */}
        {hasResults && stats.totalTests > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="rounded-tahoe-input p-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <div className="text-2xl font-bold text-white">{stats.totalTests}</div>
              <div className="text-sm text-tahoe-text-muted">Total Tests</div>
            </div>
            <div className="bg-green-500/10 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-400">{stats.passed}</div>
              <div className="text-sm text-tahoe-text-muted">Passed</div>
            </div>
            <div className="bg-yellow-500/10 rounded-xl p-4">
              <div className="text-2xl font-bold text-yellow-400">{stats.warned}</div>
              <div className="text-sm text-tahoe-text-muted">Warnings</div>
            </div>
            <div className="bg-red-500/10 rounded-xl p-4">
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <div className="text-sm text-tahoe-text-muted">Failed</div>
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
                  <p className="text-sm text-tahoe-text-muted">{testGroup.description}</p>
                </div>
                {hasGroupResult && (
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusBadge(groupResult.status)}`}>
                      {getStatusIcon(groupResult.status)} {groupResult.status.toUpperCase()}
                    </div>
                    <div className="text-sm text-tahoe-text-muted">
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
                      className="flex items-center justify-between p-3 rounded-xl transition-all duration-tahoe"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white">{endpoint.name}</div>
                        <div className="text-xs text-tahoe-text-muted font-mono">{endpoint.url}</div>
                      </div>
                      {testResult && (
                        <div className="flex items-center gap-3 ml-4">
                          <span className={`text-lg ${getStatusColor(testResult.status)}`}>
                            {getStatusIcon(testResult.status)}
                          </span>
                          <span className="text-sm text-tahoe-text-muted max-w-md truncate">
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
            { icon: "🔐", name: "Authentication & Security", desc: "Login, MFA, sessions, trusted devices" },
            { icon: "👤", name: "User Management", desc: "Accounts, roles, permissions" },
            { icon: "👥", name: "Employee Management", desc: "CRUD, profiles, departments, locations" },
            { icon: "💰", name: "Payroll & Compensation", desc: "Automated calculations" },
            { icon: "💬", name: "Chat & Messaging", desc: "Real-time communication" },
            { icon: "🔔", name: "Notifications", desc: "Real-time alerts" },
            { icon: "⚙️", name: "Settings & Policies", desc: "System config, HR policies" },
            { icon: "💵", name: "Bonuses & Commissions", desc: "Compensation management" },
            { icon: "💰", name: "Sales Commissions", desc: "Agent/manager commissions" },
            { icon: "🏖️", name: "Leave Management", desc: "Requests, balances, policies" },
            { icon: "⏰", name: "Time & Attendance", desc: "Timecard tracking" },
            { icon: "✅", name: "Compliance", desc: "Regulatory compliance, training" },
            { icon: "📊", name: "Analytics & Metrics", desc: "Dashboards, workforce metrics" },
            { icon: "👋", name: "Termination", desc: "Offboarding, checklists" },
            { icon: "🔧", name: "System Health", desc: "Health checks, monitoring" },
          ].map((module, idx) => (
            <div key={idx} className="p-4 rounded-xl transition-all duration-tahoe" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">{module.icon}</div>
                <div className="font-medium text-white">{module.name}</div>
              </div>
              <div className="text-sm text-tahoe-text-muted">{module.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

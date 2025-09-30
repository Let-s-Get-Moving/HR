import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API } from '../config/api.js';

export default function TimeTracking() {
  const [view, setView] = useState("main"); // main, individual, dashboard
  const [timecards, setTimecards] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payPeriods, setPayPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("viewer");
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ status: null, message: "" });
  const [manualPeriodStart, setManualPeriodStart] = useState("");
  const [manualPeriodEnd, setManualPeriodEnd] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadTimecards();
      if (view === "dashboard") {
        loadStats();
      }
    }
  }, [selectedPeriod, view]);

  const loadInitialData = async () => {
    try {
      console.log("🔄 [TimeTracking] Loading initial data...");
      setLoading(true);
      
      // Load user role
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      console.log("👤 [TimeTracking] User role:", user.role, "| User:", user.email);
      setUserRole(user.role || "viewer");
      setCurrentUser(user);
      
      // Load employees
      console.log("📋 [TimeTracking] Loading employees...");
      const employeesData = await API("/api/employees");
      console.log("✅ [TimeTracking] Loaded", employeesData.length, "employees");
      setEmployees(employeesData);
      
      // Load pay periods
      console.log("📅 [TimeTracking] Loading pay periods...");
      const periodsData = await API("/api/timecards/periods/list");
      console.log("✅ [TimeTracking] Loaded", periodsData.length, "pay periods:", periodsData);
      setPayPeriods(periodsData);
      
      // Select most recent period by default
      if (periodsData.length > 0) {
        console.log("✅ [TimeTracking] Selected default period:", periodsData[0].period_label);
        setSelectedPeriod(periodsData[0]);
      } else {
        console.warn("⚠️ [TimeTracking] No pay periods available");
      }
    } catch (error) {
      console.error("❌ [TimeTracking] Error loading initial data:", error);
    } finally {
      setLoading(false);
      console.log("✅ [TimeTracking] Initial data load complete");
    }
  };

  const loadTimecards = async () => {
    if (!selectedPeriod) {
      console.warn("⚠️ [TimeTracking] No period selected, skipping timecard load");
      return;
    }
    
    try {
      console.log("🔄 [TimeTracking] Loading timecards for period:", selectedPeriod.period_label);
      setLoading(true);
      const data = await API(
        `/api/timecards?pay_period_start=${selectedPeriod.pay_period_start}&pay_period_end=${selectedPeriod.pay_period_end}`
      );
      console.log("✅ [TimeTracking] Loaded", data.length, "timecards from API");
      
      // Filter based on user role
      let filteredData = data;
      if (userRole === "user" && currentUser) {
        filteredData = data.filter(tc => tc.email === currentUser.email);
        console.log("🔒 [TimeTracking] Filtered to", filteredData.length, "timecards for user:", currentUser.email);
      }
      
      console.log("✅ [TimeTracking] Setting", filteredData.length, "timecards");
      setTimecards(filteredData);
    } catch (error) {
      console.error("❌ [TimeTracking] Error loading timecards:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!selectedPeriod) {
      console.warn("⚠️ [TimeTracking] No period selected, skipping stats load");
      return;
    }
    
    try {
      console.log("📊 [TimeTracking] Loading stats for period:", selectedPeriod.period_label);
      const data = await API(
        `/api/timecards/stats/summary?pay_period_start=${selectedPeriod.pay_period_start}&pay_period_end=${selectedPeriod.pay_period_end}`
      );
      console.log("✅ [TimeTracking] Loaded stats:", data.summary);
      setStats(data);
    } catch (error) {
      console.error("❌ [TimeTracking] Error loading stats:", error);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setUploadFile(file);
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      console.warn("⚠️ [TimeTracking] No file selected for upload");
      setUploadStatus({ status: "error", message: "Please select an Excel file" });
      return;
    }

    console.log("📤 [TimeTracking] Starting upload:", uploadFile.name);
    console.log("📅 [TimeTracking] Manual period:", manualPeriodStart, "to", manualPeriodEnd);
    setUploadStatus({ status: "processing", message: "Uploading and processing file..." });

    try {
      const formData = new FormData();
      formData.append('excel_file', uploadFile);
      
      if (manualPeriodStart) {
        formData.append('pay_period_start', manualPeriodStart);
        console.log("📅 [TimeTracking] Added manual start:", manualPeriodStart);
      }
      if (manualPeriodEnd) {
        formData.append('pay_period_end', manualPeriodEnd);
        console.log("📅 [TimeTracking] Added manual end:", manualPeriodEnd);
      }

      const API_BASE_URL = 'https://hr-api-wbzs.onrender.com';
      const sessionId = localStorage.getItem('sessionId');

      console.log("🌐 [TimeTracking] Uploading to:", `${API_BASE_URL}/api/timecards/import`);
      const response = await fetch(`${API_BASE_URL}/api/timecards/import`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          ...(sessionId && { 'x-session-id': sessionId }),
        }
      });

      const result = await response.json();
      console.log("📥 [TimeTracking] Upload response:", result);

      if (!response.ok) {
        console.error("❌ [TimeTracking] Upload failed:", result);
        throw new Error(result.details || result.error);
      }

      console.log("✅ [TimeTracking] Import summary:", result.summary);
      console.log("   - Timecards created:", result.summary.timecards_created);
      console.log("   - Timecards updated:", result.summary.timecards_updated);
      console.log("   - Entries inserted:", result.summary.entries_inserted);
      
      if (result.summary.errors && result.summary.errors.length > 0) {
        console.warn("⚠️ [TimeTracking] Import errors:", result.summary.errors);
      }
      
      if (result.summary.warnings && result.summary.warnings.length > 0) {
        console.warn("⚠️ [TimeTracking] Import warnings:", result.summary.warnings);
      }
      
      if (result.summary.debug_logs) {
        console.log("🔍 [TimeTracking] Debug logs from server:");
        result.summary.debug_logs.forEach(log => console.log("   ", log));
      }

      setUploadStatus({
        status: "success",
        message: `Import completed! Created: ${result.summary.timecards_created}, Updated: ${result.summary.timecards_updated}, Entries: ${result.summary.entries_inserted}`
      });

      // Reload data
      console.log("🔄 [TimeTracking] Reloading data after successful import...");
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadStatus({ status: null, message: "" });
        loadInitialData();
      }, 2000);

    } catch (error) {
      console.error("❌ [TimeTracking] Upload error:", error);
      setUploadStatus({
        status: "error",
        message: error.message || "Upload failed"
      });
    }
  };

  const viewIndividualTimecard = async (employeeId) => {
    if (!selectedPeriod) {
      console.warn("⚠️ [TimeTracking] No period selected");
      return;
    }
    
    try {
      console.log("👤 [TimeTracking] Loading individual timecard for employee:", employeeId);
      const data = await API(
        `/api/timecards/employee/${employeeId}/period?pay_period_start=${selectedPeriod.pay_period_start}&pay_period_end=${selectedPeriod.pay_period_end}`
      );
      console.log("✅ [TimeTracking] Loaded timecard for:", data.employee_name);
      console.log("   - Total hours:", data.total_hours);
      console.log("   - Entries:", data.entries?.length || 0);
      setSelectedEmployee(data);
      setView("individual");
    } catch (error) {
      console.error("❌ [TimeTracking] Error loading individual timecard:", error);
    }
  };

  // Filter employees for autocomplete
  const filteredEmployees = employees.filter(emp => {
    const searchLower = employeeSearch.toLowerCase();
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    return fullName.includes(searchLower) || emp.email.toLowerCase().includes(searchLower);
  });

  // Filter timecards by employee search
  const displayedTimecards = employeeSearch
    ? timecards.filter(tc => {
        const searchLower = employeeSearch.toLowerCase();
        const fullName = tc.employee_name.toLowerCase();
        return fullName.includes(searchLower) || tc.email.toLowerCase().includes(searchLower);
      })
    : timecards;

  if (loading && timecards.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-400">Loading timecards...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Time Tracking</h1>
          <p className="text-secondary mt-1">Employee timecard management</p>
        </div>
        {(userRole === "admin" || userRole === "HR") && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowUploadModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Timecards
          </motion.button>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setView("main")}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${
            view === "main"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-secondary hover:text-primary hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            All Timecards
          </div>
        </button>
        <button
          onClick={() => setView("dashboard")}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${
            view === "dashboard"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-secondary hover:text-primary hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Dashboard
          </div>
        </button>
        {view === "individual" && (
          <button
            onClick={() => setView("main")}
            className="px-4 py-3 font-medium border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {selectedEmployee?.employee_name}
            <button
              onClick={(e) => { e.stopPropagation(); setView("main"); }}
              className="ml-2 text-secondary hover:text-primary"
            >
              ✕
            </button>
          </button>
        )}
      </div>

      {/* Filters */}
      {view !== "individual" && (
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pay Period Filter */}
            <div>
              <label className="block text-sm font-medium mb-2 text-primary">Pay Period</label>
              <select
                value={selectedPeriod?.pay_period_start || ""}
                onChange={(e) => {
                  const period = payPeriods.find(p => p.pay_period_start === e.target.value);
                  setSelectedPeriod(period);
                }}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-primary"
              >
                <option value="">Select period...</option>
                {payPeriods.map((period) => (
                  <option key={period.pay_period_start} value={period.pay_period_start}>
                    {period.period_label} ({period.timecard_count} timecards)
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Search */}
            <div>
              <label className="block text-sm font-medium mb-2 text-primary">Search Employee</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-primary"
                />
                {employeeSearch && (
                  <button
                    onClick={() => setEmployeeSearch("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-primary"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {/* Autocomplete dropdown */}
              {employeeSearch && filteredEmployees.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredEmployees.slice(0, 10).map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setEmployeeSearch(`${emp.first_name} ${emp.last_name}`);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-primary"
                    >
                      <div className="font-medium">{emp.first_name} {emp.last_name}</div>
                      <div className="text-sm text-secondary">{emp.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {view === "main" && <MainTableView timecards={displayedTimecards} onViewIndividual={viewIndividualTimecard} loading={loading} />}
        {view === "dashboard" && <DashboardView stats={stats} selectedPeriod={selectedPeriod} />}
        {view === "individual" && <IndividualView timecard={selectedEmployee} userRole={userRole} onBack={() => setView("main")} />}
      </AnimatePresence>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          uploadFile={uploadFile}
          uploadStatus={uploadStatus}
          manualPeriodStart={manualPeriodStart}
          manualPeriodEnd={manualPeriodEnd}
          onFileChange={handleFileChange}
          onUpload={handleUpload}
          onClose={() => {
            setShowUploadModal(false);
            setUploadFile(null);
            setUploadStatus({ status: null, message: "" });
          }}
          setManualPeriodStart={setManualPeriodStart}
          setManualPeriodEnd={setManualPeriodEnd}
        />
      )}
    </div>
  );
}

// Main Table View Component
function MainTableView({ timecards, onViewIndividual, loading }) {
  if (loading) {
    return <div className="text-center py-8 text-secondary">Loading...</div>;
  }

  if (timecards.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card p-8 text-center"
      >
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-medium text-primary mb-2">No Timecards Found</h3>
        <p className="text-secondary">Select a different pay period or upload timecard data</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="card overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-primary">Employee</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-primary">Email</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-primary">Total Hours</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-primary">Overtime</th>
              <th className="px-6 py-4 text-center text-sm font-medium text-primary">Status</th>
              <th className="px-6 py-4 text-center text-sm font-medium text-primary">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {timecards.map((timecard) => (
              <tr key={timecard.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-primary">{timecard.employee_name}</div>
                  <div className="text-sm text-secondary">{timecard.role_title || "N/A"}</div>
                </td>
                <td className="px-6 py-4 text-sm text-secondary">{timecard.email}</td>
                <td className="px-6 py-4 text-right">
                  <span className="text-primary font-medium">{parseFloat(timecard.total_hours || 0).toFixed(2)}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  {parseFloat(timecard.overtime_hours || 0) > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {parseFloat(timecard.overtime_hours).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-secondary">0.00</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    timecard.status === 'Approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    timecard.status === 'Submitted' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                    timecard.status === 'Rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                    'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
                  }`}>
                    {timecard.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onViewIndividual(timecard.employee_id)}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium text-sm"
                  >
                    View Details →
                  </motion.button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// Dashboard View Component
function DashboardView({ stats, selectedPeriod }) {
  if (!stats) {
    return <div className="text-center py-8 text-secondary">Loading statistics...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-secondary">Total Employees</h3>
            <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-primary">{stats.summary.total_employees}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-secondary">Total Hours</h3>
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-primary">{parseFloat(stats.summary.total_hours || 0).toFixed(2)}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-secondary">Overtime Hours</h3>
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            {parseFloat(stats.summary.total_overtime || 0).toFixed(2)}
          </p>
          <p className="text-xs text-secondary mt-1">{stats.summary.employees_with_overtime} employees</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-secondary">Missing Punches</h3>
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.summary.total_missing_punches || 0}</p>
        </div>
      </div>

      {/* Employee Details Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-primary">Employee Breakdown</h2>
          <p className="text-sm text-secondary">Detailed hours and overtime by employee</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-primary">Employee</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-primary">Total Hours</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-primary">Overtime</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-primary">Missing Punches</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-primary">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {stats.employees.map((emp) => (
                <tr key={emp.employee_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 text-sm text-primary font-medium">{emp.employee_name}</td>
                  <td className="px-6 py-4 text-sm text-right text-primary">{parseFloat(emp.total_hours || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    {parseFloat(emp.overtime_hours || 0) > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {parseFloat(emp.overtime_hours).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-secondary">0.00</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {parseInt(emp.missing_punches_count || 0) > 0 ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                        {emp.missing_punches_count}
                      </span>
                    ) : (
                      <span className="text-secondary">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      emp.status === 'Approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      emp.status === 'Submitted' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

// Individual Timecard View Component
function IndividualView({ timecard, userRole, onBack }) {
  if (!timecard) {
    return <div className="text-center py-8 text-secondary">Loading timecard...</div>;
  }

  // Group entries by date
  const entriesByDate = {};
  (timecard.entries || []).forEach(entry => {
    if (!entriesByDate[entry.work_date]) {
      entriesByDate[entry.work_date] = [];
    }
    entriesByDate[entry.work_date].push(entry);
  });

  // Calculate daily totals
  const dailyTotals = Object.keys(entriesByDate).map(date => {
    const entries = entriesByDate[date];
    const totalHours = entries.reduce((sum, e) => sum + parseFloat(e.hours_worked || 0), 0);
    return { date, entries, totalHours };
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to All Timecards
      </button>

      {/* Employee Info Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">{timecard.employee_name}</h2>
            <p className="text-secondary">{timecard.email}</p>
            <p className="text-sm text-secondary mt-1">
              Pay Period: {new Date(timecard.pay_period_start).toLocaleDateString()} - {new Date(timecard.pay_period_end).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{parseFloat(timecard.total_hours || 0).toFixed(2)}</div>
            <div className="text-sm text-secondary">Total Hours</div>
            {parseFloat(timecard.overtime_hours || 0) > 0 && (
              <div className="mt-2 text-amber-600 dark:text-amber-400 font-medium">
                {parseFloat(timecard.overtime_hours).toFixed(2)} OT
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Entries */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-primary">Daily Time Entries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-primary">Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-primary">Clock In</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-primary">Clock Out</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-primary">Hours</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-primary">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {dailyTotals.map(({ date, entries, totalHours }) => (
                <React.Fragment key={date}>
                  {entries.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      {idx === 0 && (
                        <td rowSpan={entries.length} className="px-6 py-4 font-medium text-primary border-r border-slate-200 dark:border-slate-700">
                          <div>{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div className="text-sm">{new Date(date).toLocaleDateString()}</div>
                          {idx === entries.length - 1 && (
                            <div className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                              Daily: {totalHours.toFixed(2)}h
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-primary">
                        {entry.clock_in || <span className="text-red-500">Missing</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-primary">
                        {entry.clock_out || <span className="text-red-500">Missing</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-primary">
                        {parseFloat(entry.hours_worked || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary">
                        {entry.notes || '—'}
                      </td>
                    </tr>
                  ))}
                  {entries.length > 1 && (
                    <tr className="bg-slate-50 dark:bg-slate-800/30">
                      <td colSpan="3" className="px-6 py-2 text-right text-sm font-semibold text-primary">
                        Daily Total:
                      </td>
                      <td className="px-6 py-2 text-sm text-right font-semibold text-indigo-600 dark:text-indigo-400">
                        {totalHours.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

// Upload Modal Component
function UploadModal({ uploadFile, uploadStatus, manualPeriodStart, manualPeriodEnd, onFileChange, onUpload, onClose, setManualPeriodStart, setManualPeriodEnd }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-2xl"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-primary">Upload Timecard Excel</h2>
            <button
              onClick={onClose}
              className="text-secondary hover:text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium mb-2 text-primary">Excel File</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={onFileChange}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-primary"
              />
              {uploadFile && (
                <p className="mt-2 text-sm text-secondary">Selected: {uploadFile.name}</p>
              )}
            </div>

            {/* Manual Period Override */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-primary">Period Start (Optional)</label>
                <input
                  type="date"
                  value={manualPeriodStart}
                  onChange={(e) => setManualPeriodStart(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-primary">Period End (Optional)</label>
                <input
                  type="date"
                  value={manualPeriodEnd}
                  onChange={(e) => setManualPeriodEnd(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-primary"
                />
              </div>
            </div>

            {/* Status Message */}
            {uploadStatus.status && (
              <div className={`p-4 rounded-lg ${
                uploadStatus.status === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                uploadStatus.status === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              }`}>
                {uploadStatus.message}
              </div>
            )}

            {/* Info Box */}
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
              <h3 className="font-medium mb-2 text-primary">Expected Format:</h3>
              <ul className="text-sm text-secondary space-y-1 list-disc list-inside">
                <li>Excel file with timecard data</li>
                <li>Each employee section includes: Pay Period, Employee name, Date, IN, OUT, Work Time, Daily Total, Note</li>
                <li>Multiple clock-in/out pairs per day supported</li>
                <li>System will automatically match employees by name</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2 text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onUpload}
                disabled={!uploadFile || uploadStatus.status === 'processing'}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {uploadStatus.status === 'processing' ? 'Processing...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

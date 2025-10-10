import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API } from '../config/api.js';
import { 
  UploadsListView, 
  UploadDetailView, 
  EmployeeTimecardView
} from '../components/TimecardUploadViewer.jsx';

export default function TimeTracking() {
  const [view, setView] = useState("day-view"); // uploads, main, individual, upload-detail, day-view, employee-timecard
  const [timecards, setTimecards] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payPeriods, setPayPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Day view state
  const [selectedDate, setSelectedDate] = useState("");
  const [dayViewData, setDayViewData] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [dayViewSearch, setDayViewSearch] = useState("");
  
  // Upload viewing
  const [uploads, setUploads] = useState([]);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [uploadEmployees, setUploadEmployees] = useState([]);
  const [selectedUploadEmployee, setSelectedUploadEmployee] = useState(null);
  const [uploadEntries, setUploadEntries] = useState([]);
  
  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ status: null, message: "" });
  const [manualPeriodStart, setManualPeriodStart] = useState("");
  const [manualPeriodEnd, setManualPeriodEnd] = useState("");

  // Load initial data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Reload timecards when period changes (only for main/individual views)
  useEffect(() => {
    if (selectedPeriod && (view === 'main' || view === 'individual')) {
      loadTimecards();
    }
  }, [selectedPeriod, view]);

  const loadInitialData = async () => {
    try {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log("🔄 [Frontend] LOADING INITIAL DATA...");
      console.log("🔄 [Frontend] Time:", new Date().toISOString());
      setLoading(true);
      
      // Load employees
      console.log("📋 [Frontend] Fetching employees from API...");
      const employeesData = await API("/api/employees");
      console.log("✅ [Frontend] Employees API response:", employeesData.length, "employees");
      setEmployees(employeesData);
      console.log("✅ [Frontend] Employees state updated");
      
      // Load available dates for day view
      try {
        const datesData = await API("/api/timecards/dates-with-data");
        console.log("📅 [Frontend] Dates received:", datesData);
        setAvailableDates(datesData);
        if (datesData.length > 0) {
          const mostRecent = datesData[0];
          console.log(`📅 [Frontend] Setting selectedDate to: ${mostRecent}`);
          setSelectedDate(mostRecent);
          
          // Load day view data for the most recent date
          console.log(`🌅 [Frontend] Loading day view data for: ${mostRecent}`);
          const dayData = await API(`/api/timecards/day-view/${mostRecent}`);
          setDayViewData(dayData);
          console.log(`✅ [Frontend] Loaded ${dayData.length} entries for date ${mostRecent}`);
        } else {
          console.log("⚠️ [Frontend] No dates available");
        }
      } catch (error) {
        console.error("❌ [Frontend] Error loading dates for day view:", error);
      }
      
      // Load periods
      console.log("📅 [Frontend] Fetching periods from API...");
      const periodsData = await API("/api/timecards/periods/list");
      console.log("✅ [Frontend] Periods API response:", periodsData.length, "periods");
      
      if (periodsData.length > 0) {
        console.log("📅 [Frontend] Periods received:");
        periodsData.forEach((period, idx) => {
          console.log(`   ${idx + 1}. ${period.period_label}`);
          console.log(`      - Start: ${period.pay_period_start}`);
          console.log(`      - End: ${period.pay_period_end}`);
          console.log(`      - Count: ${period.timecard_count} timecards`);
        });
        
        console.log("✅ [Frontend] Setting payPeriods state...");
        setPayPeriods(periodsData);
        console.log("✅ [Frontend] PayPeriods state updated");
        
        console.log("✅ [Frontend] Setting default selected period:", periodsData[0].period_label);
        setSelectedPeriod(periodsData[0]);
        console.log("✅ [Frontend] Default period selected");
      } else {
        console.error("⚠️ [Frontend] NO PERIODS RECEIVED from API!");
        console.error("⚠️ [Frontend] This means timecard_uploads table is empty or has no 'processed' uploads");
        setPayPeriods([]);
        setSelectedPeriod(null);
      }
      
      console.log('═══════════════════════════════════════════════════════════\n');
    } catch (error) {
      console.error('\n═══════════════════════════════════════════════════════════');
      console.error("❌ [Frontend] ERROR loading initial data:", error);
      console.error("❌ [Frontend] Error details:", error.message);
      console.error('═══════════════════════════════════════════════════════════\n');
    } finally {
      setLoading(false);
    }
  };

  const loadDayViewData = async (date) => {
    if (!date) return;
    
    try {
      console.log(`🌅 [Frontend] Loading day view for ${date}`);
      setLoading(true);
      const data = await API(`/api/timecards/day-view/${date}`);
      setDayViewData(data);
      console.log(`✅ [Frontend] Loaded ${data.length} entries for ${date}`);
    } catch (error) {
      console.error("❌ [Frontend] Error loading day view:", error);
      setDayViewData([]);
    } finally {
      setLoading(false);
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
      
      // Format dates to YYYY-MM-DD strings to ensure proper comparison
      const formatDate = (date) => {
        if (typeof date === 'string') {
          // Already a string, extract YYYY-MM-DD part
          return date.split('T')[0];
        }
        if (date instanceof Date) {
          // Convert Date object to YYYY-MM-DD
          return date.toISOString().split('T')[0];
        }
        return date;
      };
      
      const startDate = formatDate(selectedPeriod.pay_period_start);
      const endDate = formatDate(selectedPeriod.pay_period_end);
      
      console.log(`📅 [TimeTracking] Querying with dates: ${startDate} to ${endDate}`);
      
      const data = await API(
        `/api/timecards?pay_period_start=${startDate}&pay_period_end=${endDate}`
      );
      console.log("✅ [TimeTracking] Loaded", data.length, "timecards from API");
      console.log("✅ [TimeTracking] Setting", data.length, "timecards");
      setTimecards(data);
    } catch (error) {
      console.error("❌ [TimeTracking] Error loading timecards:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUploads = async () => {
    try {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('🔄 [Frontend] LOADING UPLOADS LIST...');
      console.log('🔄 [Frontend] Time:', new Date().toISOString());
      setLoading(true);
      
      const data = await API('/api/timecard-uploads/uploads');
      
      console.log('✅ [Frontend] Uploads API response:', data.length, 'uploads');
      if (data.length > 0) {
        console.log('📋 [Frontend] Uploads received:');
        data.forEach((upload, idx) => {
          console.log(`   ${idx + 1}. ${upload.filename}`);
          console.log(`      - Period: ${upload.pay_period_start} to ${upload.pay_period_end}`);
          console.log(`      - Employees: ${upload.employee_count}`);
          console.log(`      - Hours: ${upload.total_hours}`);
          console.log(`      - Status: ${upload.status}`);
        });
      } else {
        console.error('⚠️ [Frontend] NO UPLOADS received from API!');
      }
      
      console.log('✅ [Frontend] Setting uploads state...');
      setUploads(data);
      console.log('✅ [Frontend] Uploads state updated');
      console.log('═══════════════════════════════════════════════════════════\n');
    } catch (error) {
      console.error('\n═══════════════════════════════════════════════════════════');
      console.error('❌ [Frontend] ERROR loading uploads:', error);
      console.error('❌ [Frontend] Error details:', error.message);
      console.error('═══════════════════════════════════════════════════════════\n');
    } finally {
      setLoading(false);
    }
  };

  const loadUploadDetails = async (uploadId) => {
    try {
      setLoading(true);
      const employees = await API(`/api/timecard-uploads/uploads/${uploadId}/employees`);
      setUploadEmployees(employees);
      setSelectedUpload(uploads.find(u => u.id === uploadId));
      setView('upload-detail');
    } catch (error) {
      console.error('❌ Error loading upload details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeTimecard = async (uploadId, employeeId) => {
    try {
      setLoading(true);
      const data = await API(`/api/timecard-uploads/uploads/${uploadId}/employees/${employeeId}/entries`);
      setUploadEntries(data.entries);
      setSelectedUploadEmployee(uploadEmployees.find(e => e.id === employeeId));
    } catch (error) {
      console.error('❌ Error loading employee timecard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔄 [Frontend] VIEW CHANGE EFFECT triggered');
    console.log('🔄 [Frontend] Current view:', view);
    
    if (view === 'uploads') {
      console.log('🔄 [Frontend] View is "uploads" - calling loadUploads()');
      loadUploads();
    }
    console.log('═══════════════════════════════════════════════════════════\n');
  }, [view]);

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
    setUploadStatus({ status: "processing", message: "Uploading and processing file..." });

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const API_BASE_URL = 'https://hr-api-wbzs.onrender.com';
      const sessionId = localStorage.getItem('sessionId');

      console.log("🌐 [TimeTracking] Uploading to:", `${API_BASE_URL}/api/timecard-uploads/upload`);
      const response = await fetch(`${API_BASE_URL}/api/timecard-uploads/upload`, {
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

      setUploadStatus({
        status: "success",
        message: `Upload successful! ${result.employeeCount} employees, ${result.totalHours.toFixed(2)} total hours`
      });

      // Reload data based on current view
      console.log("🔄 [TimeTracking] Reloading data after successful import...");
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadStatus({ status: null, message: "" });
        
        // Refresh the appropriate view
        if (view === 'uploads') {
          loadUploads();
        }
        
        // Also refresh uploads list in case user navigates back
        loadUploads();
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
      
      // Format dates consistently
      const formatDate = (date) => {
        if (typeof date === 'string') return date.split('T')[0];
        if (date instanceof Date) return date.toISOString().split('T')[0];
        return date;
      };
      
      const startDate = formatDate(selectedPeriod.pay_period_start);
      const endDate = formatDate(selectedPeriod.pay_period_end);
      
      const data = await API(
        `/api/timecards/employee/${employeeId}/period?pay_period_start=${startDate}&pay_period_end=${endDate}`
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
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <button
          onClick={() => setView("day-view")}
          className={`px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
            view === "day-view"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-secondary hover:text-primary hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Day View
          </div>
        </button>
        <button
          onClick={() => setView("uploads")}
          className={`px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
            view === "uploads" || view === "upload-detail" || view === "employee-timecard"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-secondary hover:text-primary hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Timecard Uploads
          </div>
        </button>
        {/* Removed All Timecards (Old) tab - no longer needed */}
        {view === "individual" && (
          <button
            onClick={() => setView("main")}
            className="px-4 py-3 font-medium border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 flex items-center gap-2 whitespace-nowrap"
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

      {/* Filters (only for old views) */}
      {(view === "main" || view === "individual") && (
      <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Period Filter */}
            <div>
              <label className="block text-sm font-medium mb-2 text-primary">Period</label>
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
        {view === "day-view" && (
          <DayView 
            selectedDate={selectedDate}
            onDateChange={(date) => {
              setSelectedDate(date);
              loadDayViewData(date);
            }}
            dayViewData={dayViewData}
            availableDates={availableDates}
            loading={loading}
            loadDayViewData={loadDayViewData}
            searchQuery={dayViewSearch}
            onSearchChange={setDayViewSearch}
          />
        )}
        {view === "uploads" && (
          <UploadsListView 
            uploads={uploads}
            onViewUpload={loadUploadDetails}
            loading={loading}
          />
        )}
        {view === "upload-detail" && (
          <UploadDetailView
            upload={selectedUpload}
            employees={uploadEmployees}
            onSelectEmployee={(employeeId) => {
              loadEmployeeTimecard(selectedUpload.id, employeeId);
              setView("employee-timecard");
            }}
            onBack={() => setView("uploads")}
            loading={loading}
          />
        )}
        {view === "employee-timecard" && (
          <EmployeeTimecardView
            employee={selectedUploadEmployee}
            entries={uploadEntries}
            upload={selectedUpload}
            onBack={() => setView("upload-detail")}
            loading={loading}
          />
        )}
        {view === "main" && <MainTableView timecards={displayedTimecards} onViewIndividual={viewIndividualTimecard} loading={loading} />}
        {view === "individual" && <IndividualView timecard={selectedEmployee} onBack={() => setView("main")} />}
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
                  <span className="text-primary font-medium">{formatHoursAsTime(parseFloat(timecard.total_hours || 0))}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  {parseFloat(timecard.overtime_hours || 0) > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {formatHoursAsTime(parseFloat(timecard.overtime_hours))}
                    </span>
                  ) : (
                    <span className="text-secondary">0:00</span>
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
          <p className="text-3xl font-bold text-primary">{formatHoursAsTime(parseFloat(stats.summary.total_hours || 0))}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-secondary">Overtime Hours</h3>
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            {formatHoursAsTime(parseFloat(stats.summary.total_overtime || 0))}
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
                  <td className="px-6 py-4 text-sm text-right text-primary">{formatHoursAsTime(parseFloat(emp.total_hours || 0))}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    {parseFloat(emp.overtime_hours || 0) > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {formatHoursAsTime(parseFloat(emp.overtime_hours))}
                      </span>
                    ) : (
                      <span className="text-secondary">0:00</span>
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

// Convert decimal hours to HH:MM format
const formatHoursAsTime = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) return '0:00';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

// Individual Timecard View Component
function IndividualView({ timecard, onBack }) {
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
              Period: {new Date(timecard.pay_period_start).toLocaleDateString()} - {new Date(timecard.pay_period_end).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{formatHoursAsTime(parseFloat(timecard.total_hours || 0))}</div>
            <div className="text-sm text-secondary">Total Hours</div>
            {parseFloat(timecard.overtime_hours || 0) > 0 && (
              <div className="mt-2 text-amber-600 dark:text-amber-400 font-medium">
                {formatHoursAsTime(parseFloat(timecard.overtime_hours))} OT
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
                <th className="px-6 py-3 text-right text-sm font-medium text-primary">Work Time</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-primary">Total Hours</th>
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
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-primary">
                        {entry.clock_in || <span className="text-red-500">Missing</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-primary">
                        {entry.clock_out || <span className="text-red-500">Missing</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-primary">
                        {formatHoursAsTime(parseFloat(entry.hours_worked || 0))}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-indigo-600 dark:text-indigo-400">
                        {formatHoursAsTime(totalHours)}
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
                <li>Each employee section includes: Period, Employee name, Date, IN, OUT, Work Time, Daily Total, Note</li>
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

// Day View Component
function DayView({ selectedDate, onDateChange, dayViewData, availableDates, loading, loadDayViewData, searchQuery, onSearchChange }) {
  const [editingEntryId, setEditingEntryId] = React.useState(null);
  const [editForm, setEditForm] = React.useState({});
  const [saving, setSaving] = React.useState(false);

  // Format time to HH:MM (remove seconds)
  const formatTime = (time) => {
    if (!time) return '';
    // If time has seconds (HH:MM:SS), remove them
    return time.length > 5 ? time.substring(0, 5) : time;
  };

  const handleEdit = (entry) => {
    setEditingEntryId(entry.entry_id);
    setEditForm({
      clock_in: formatTime(entry.clock_in),
      clock_out: formatTime(entry.clock_out),
      notes: entry.notes || ''
    });
  };

  const handleCancel = () => {
    setEditingEntryId(null);
    setEditForm({});
  };

  const handleSave = async (entryId) => {
    try {
      setSaving(true);
      
      console.log('💾 [Frontend] Saving entry:', entryId);
      console.log('💾 [Frontend] Edit form data:', editForm);
      
      const response = await API(`/api/timecards/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      
      console.log('✅ [Frontend] Save response:', response);
      console.log('   - hours_worked:', response.hours_worked);
      console.log('   - is_overtime:', response.is_overtime);
      
      // Reload the day view data
      console.log('🔄 [Frontend] Reloading day view data...');
      await loadDayViewData(selectedDate);
      console.log('✅ [Frontend] Day view data reloaded');
      
      setEditingEntryId(null);
      setEditForm({});
    } catch (error) {
      console.error('❌ [Frontend] Error saving entry:', error);
      alert('Failed to save changes: ' + (error.message || error.error || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Group entries by employee
  const groupedData = dayViewData.reduce((acc, entry) => {
    const key = entry.employee_id;
    if (!acc[key]) {
      acc[key] = {
        employee_id: entry.employee_id,
        first_name: entry.first_name,
        last_name: entry.last_name,
        email: entry.email,
        work_email: entry.work_email,
        department: entry.department,
        entries: [],
        total_hours: 0
      };
    }
    acc[key].entries.push(entry);
    // Only add to total if hours_worked is valid
    const hours = parseFloat(entry.hours_worked || 0);
    if (!isNaN(hours)) {
      acc[key].total_hours += hours;
    }
    return acc;
  }, {});

  const employees = Object.values(groupedData).sort((a, b) => {
    const firstNameCompare = a.first_name.localeCompare(b.first_name);
    if (firstNameCompare !== 0) return firstNameCompare;
    return a.last_name.localeCompare(b.last_name);
  });

  // Filter employees based on search query
  const filteredEmployees = searchQuery.trim() 
    ? employees.filter(employee => {
        const searchTerm = searchQuery.toLowerCase();
        const searchableFields = [
          employee.first_name,
          employee.last_name,
          `${employee.first_name} ${employee.last_name}`,
          employee.email,
          employee.work_email,
          employee.department
        ];
        return searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(searchTerm)
        );
      })
    : employees;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Date Selector */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 w-full sm:w-auto">
            <label className="block text-sm font-medium mb-2 text-primary">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-primary"
            />
          </div>
          <div className="text-sm text-secondary">
            {filteredEmployees.length} of {employees.length} employees • {dayViewData.length} entries
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by employee name, department, or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-primary"
          />
          {searchQuery && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                onClick={() => onSearchChange("")}
                className="text-neutral-400 hover:text-primary transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-secondary">
            Found {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* Day View Data */}
      {loading ? (
        <div className="text-center py-12 text-secondary">Loading...</div>
      ) : filteredEmployees.length === 0 && searchQuery ? (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-lg font-medium text-primary mb-2">No employees found</h3>
          <p className="text-secondary">Try adjusting your search terms or clear the search to see all employees.</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-primary mb-2">No Data for This Date</h3>
          <p className="text-secondary">Select another date or upload timecards</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEmployees.map((employee) => (
            <div key={employee.employee_id} className="card overflow-hidden">
              {/* Employee Header */}
              <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-primary text-lg">
                      {employee.first_name} {employee.last_name}
                    </h3>
                    {/* Work email from database */}
                    {employee.work_email && (
                      <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {employee.work_email}
                      </p>
                    )}
                    {/* Personal email (if exists) */}
                    {employee.email && (
                      <p className="text-sm text-secondary">{employee.email}</p>
                    )}
                    {employee.department && (
                      <p className="text-xs text-secondary uppercase tracking-wide">{employee.department}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {formatHoursAsTime(employee.total_hours)}
                    </div>
                    {employee.total_hours > 8 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">OVERTIME</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Time Entries Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Clock In</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Clock Out</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase">Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Notes</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-secondary uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {employee.entries.map((entry, idx) => {
                      const isEditing = editingEntryId === entry.entry_id;
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-3">
                            {isEditing ? (
                              <input
                                type="time"
                                value={editForm.clock_in}
                                onChange={(e) => setEditForm({ ...editForm, clock_in: e.target.value })}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm text-primary"
                              />
                            ) : (
                              <span className="text-sm text-primary">{formatTime(entry.clock_in) || "—"}</span>
                            )}
                          </td>
                          <td className="px-6 py-3">
                            {isEditing ? (
                              <input
                                type="time"
                                value={editForm.clock_out}
                                onChange={(e) => setEditForm({ ...editForm, clock_out: e.target.value })}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm text-primary"
                              />
                            ) : (
                              <span className="text-sm text-primary">{formatTime(entry.clock_out) || "—"}</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-primary">
                            {entry.hours_worked && !isNaN(entry.hours_worked) 
                              ? formatHoursAsTime(parseFloat(entry.hours_worked)) 
                              : "—"}
                          </td>
                          <td className="px-6 py-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                placeholder="Add notes..."
                                className="w-full px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm text-primary"
                              />
                            ) : (
                              <span className="text-sm text-secondary">{entry.notes || "—"}</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleSave(entry.entry_id)}
                                  disabled={saving}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium disabled:opacity-50"
                                >
                                  {saving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={handleCancel}
                                  disabled={saving}
                                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEdit(entry)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

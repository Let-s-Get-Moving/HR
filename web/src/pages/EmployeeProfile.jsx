import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API = (path, options = {}) => fetch(`http://localhost:8080${path}`, options).then(r => r.json());

export default function EmployeeProfile({ employeeId, onClose, onUpdate }) {
  const [employee, setEmployee] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [trainingRecords, setTrainingRecords] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [hrDetails, setHrDetails] = useState({ addresses: [], emergency_contacts: [], bank_accounts: [], identifiers: [], compensation_history: [], status_history: [] });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    if (employeeId) {
      loadEmployeeData();
    }
  }, [employeeId]);

  const loadEmployeeData = async () => {
    try {
      const [empData, timeData, docData, trainingData, payrollData, hrData] = await Promise.all([
        API(`/api/employees/${employeeId}`),
        API(`/api/employees/${employeeId}/time-entries`),
        API(`/api/employees/${employeeId}/documents`),
        API(`/api/employees/${employeeId}/training-records`),
        API(`/api/employees/${employeeId}/payroll-history`),
        API(`/api/employees/${employeeId}/hr-details`)
      ]);
      
      setEmployee(empData);
      setTimeEntries(timeData);
      setDocuments(docData);
      setTrainingRecords(trainingData);
      setPayrollHistory(payrollData);
      setHrDetails(hrData);
    } catch (error) {
      console.error("Error loading employee data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalHours = () => {
    if (!timeEntries || !Array.isArray(timeEntries) || timeEntries.length === 0) return 0;
    return timeEntries.reduce((total, entry) => total + (entry.hours_worked || 0), 0);
  };

  const calculateTotalEarnings = () => {
    if (!timeEntries || !Array.isArray(timeEntries) || timeEntries.length === 0) return 0;
    return timeEntries.reduce((total, entry) => {
      const hours = entry.hours_worked || 0;
      const rate = employee?.hourly_rate || 25;
      const overtimeHours = entry.overtime_hours || 0;
      const overtimeRate = rate * 1.5;
      
      return total + (hours * rate) + (overtimeHours * overtimeRate);
    }, 0);
  };

  const handleEdit = () => {
    setEditData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      role_title: employee.role_title,
      hourly_rate: employee.hourly_rate || 25,
      employment_type: employee.employment_type,
      department_id: employee.department_id,
      location_id: employee.location_id
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await API(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData)
      });
      setIsEditing(false);
      loadEmployeeData();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error updating employee:", error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  const tabs = [
    { id: "overview", name: "Overview", icon: "👤" },
    { id: "financial", name: "Financial", icon: "💰" },
    { id: "hr", name: "HR Details", icon: "🗂️" },
    { id: "time", name: "Time Tracking", icon: "⏰" },
    { id: "documents", name: "Documents", icon: "📄" },
    { id: "training", name: "Training", icon: "✅" }
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-neutral-400">Loading employee profile...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6">
        <div className="text-red-400">Employee not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold">
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{employee.first_name} {employee.last_name}</h1>
              <p className="text-neutral-400">{employee.role_title} • {employee.department_name}</p>
            </div>
          </div>
          <div className="flex space-x-3">
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-neutral-600 hover:bg-neutral-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-neutral-800 p-4 rounded-lg">
            <div className="text-sm text-neutral-400">Status</div>
            <div className="font-medium">{employee.status}</div>
          </div>
          <div className="bg-neutral-800 p-4 rounded-lg">
            <div className="text-sm text-neutral-400">Hire Date</div>
            <div className="font-medium">{new Date(employee.hire_date).toLocaleDateString()}</div>
          </div>
          <div className="bg-neutral-800 p-4 rounded-lg">
            <div className="text-sm text-neutral-400">Hourly Rate</div>
            <div className="font-medium">${employee.hourly_rate || 25}/hr</div>
          </div>
          <div className="bg-neutral-800 p-4 rounded-lg">
            <div className="text-sm text-neutral-400">Location</div>
            <div className="font-medium">{employee.location_name}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-8 bg-neutral-800 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "text-neutral-400 hover:text-white hover:bg-neutral-700"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-8"
        >
          <div className="space-y-6">
            <div className="bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Email:</span>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => setEditData({...editData, email: e.target.value})}
                      className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-right"
                    />
                  ) : (
                    <span>{employee.email}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Phone:</span>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({...editData, phone: e.target.value})}
                      className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-right"
                    />
                  ) : (
                    <span>{employee.phone || 'Not provided'}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Gender:</span>
                  <span>{employee.gender || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Birth Date:</span>
                  <span>{employee.birth_date ? new Date(employee.birth_date).toLocaleDateString() : 'Not provided'}</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Employment Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Employment Type:</span>
                  <span>{employee.employment_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Department:</span>
                  <span>{employee.department_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Location:</span>
                  <span>{employee.location_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Probation End:</span>
                  <span>{employee.probation_end ? new Date(employee.probation_end).toLocaleDateString() : 'Not set'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Hours Worked</span>
                  <span className="font-bold">{((calculateTotalHours() || 0) || 0).toFixed(1)} hrs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Earnings</span>
                  <span className="font-bold">${((calculateTotalEarnings() || 0) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Documents</span>
                  <span className="font-bold">{documents?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Training Records</span>
                  <span className="font-bold">{trainingRecords?.length || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {(timeEntries || []).slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex justify-between text-sm">
                    <span>{new Date(entry.work_date).toLocaleDateString()}</span>
                    <span>{entry.hours_worked || 0} hrs</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Financial Tab */}
      {activeTab === "financial" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Earnings Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Regular Hours:</span>
                  <span>${(((calculateTotalHours() || 0) || 0) * (employee?.hourly_rate || 25)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overtime:</span>
                  <span>${(timeEntries || []).reduce((total, entry) => {
                    const overtimeHours = entry.overtime_hours || 0;
                    const overtimeRate = (employee.hourly_rate || 25) * 1.5;
                    return total + (overtimeHours * overtimeRate);
                  }, 0).toFixed(2)}</span>
                </div>
                <hr className="border-neutral-700" />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>${(calculateTotalEarnings() || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Deductions</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Taxes:</span>
                  <span>${(((calculateTotalEarnings() || 0) || 0) * 0.25).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Benefits:</span>
                  <span>${(((calculateTotalEarnings() || 0) || 0) * 0.05).toFixed(2)}</span>
                </div>
                <hr className="border-neutral-700" />
                <div className="flex justify-between font-bold">
                  <span>Total Deductions:</span>
                  <span>${(((calculateTotalEarnings() || 0) || 0) * 0.30).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Net Pay</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  ${(((calculateTotalEarnings() || 0) || 0) * 0.70).toFixed(2)}
                </div>
                <div className="text-sm text-neutral-400">Net earnings after deductions</div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Payroll History</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="text-left py-2">Period</th>
                    <th className="text-left py-2">Hours</th>
                    <th className="text-left py-2">Rate</th>
                    <th className="text-left py-2">Gross</th>
                    <th className="text-left py-2">Deductions</th>
                    <th className="text-left py-2">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {(payrollHistory || []).map((payroll) => (
                    <tr key={payroll.id} className="border-b border-neutral-700">
                      <td className="py-2">{new Date(payroll.pay_period_start).toLocaleDateString()} - {new Date(payroll.pay_period_end).toLocaleDateString()}</td>
                      <td className="py-2">{payroll.total_hours}</td>
                      <td className="py-2">${payroll.hourly_rate}</td>
                      <td className="py-2">${payroll.gross_pay}</td>
                      <td className="py-2">${payroll.total_deductions}</td>
                      <td className="py-2">${payroll.net_pay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Time Tracking Tab */}
      {activeTab === "time" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Time Entries</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Clock In</th>
                    <th className="text-left py-2">Clock Out</th>
                    <th className="text-left py-2">Hours</th>
                    <th className="text-left py-2">Overtime</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(timeEntries || []).map((entry) => (
                    <tr key={entry.id} className="border-b border-neutral-700">
                      <td className="py-2">{new Date(entry.work_date).toLocaleDateString()}</td>
                      <td className="py-2">{entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString() : '-'}</td>
                      <td className="py-2">{entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString() : '-'}</td>
                      <td className="py-2">{entry.hours_worked || 0}</td>
                      <td className="py-2">{entry.overtime_hours || 0}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          entry.was_late ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'
                        }`}>
                          {entry.was_late ? 'Late' : 'On Time'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Documents Tab */}
      {activeTab === "documents" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Employee Documents</h3>
            <div className="grid gap-4">
              {(documents || []).map((doc) => (
                <div key={doc.id} className="flex justify-between items-center p-4 bg-neutral-700 rounded-lg">
                  <div>
                    <div className="font-medium">{doc.doc_type}</div>
                    <div className="text-sm text-neutral-400">{doc.file_name}</div>
                    <div className="text-xs text-neutral-500">Uploaded: {new Date(doc.uploaded_on).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      doc.signed ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                    }`}>
                      {doc.signed ? 'Signed' : 'Pending'}
                    </span>
                    <button className="text-indigo-400 hover:text-indigo-300">View</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* HR Details Tab */}
      {activeTab === "hr" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-6"
        >
          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Identifiers</h3>
            <div className="space-y-2">
              {(hrDetails.identifiers || []).map((idn) => (
                <div key={idn.id} className="flex justify-between text-sm">
                  <span>{idn.id_type}</span>
                  <span>{idn.id_value}{idn.expires_on ? ` (exp ${new Date(idn.expires_on).toLocaleDateString()})` : ''}</span>
                </div>
              ))}
              {(!hrDetails.identifiers || hrDetails.identifiers.length === 0) && (
                <div className="text-neutral-400 text-sm">No identifiers on file</div>
              )}
            </div>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Bank Accounts</h3>
            <div className="space-y-2">
              {(hrDetails.bank_accounts || []).map((ba) => (
                <div key={ba.id} className="flex justify-between text-sm">
                  <span>{ba.bank_name || 'Bank'} ({ba.transit_number || '—'})</span>
                  <span>Acct: {ba.account_number || '—'}{ba.is_primary ? ' • Primary' : ''}</span>
                </div>
              ))}
              {(!hrDetails.bank_accounts || hrDetails.bank_accounts.length === 0) && (
                <div className="text-neutral-400 text-sm">No bank info</div>
              )}
            </div>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Addresses</h3>
            <div className="space-y-2">
              {(hrDetails.addresses || []).map((ad) => (
                <div key={ad.id} className="text-sm">
                  <div>{ad.line1}{ad.line2 ? `, ${ad.line2}` : ''}</div>
                  <div className="text-neutral-400">{[ad.city, ad.province, ad.postal_code, ad.country].filter(Boolean).join(', ')}</div>
                </div>
              ))}
              {(!hrDetails.addresses || hrDetails.addresses.length === 0) && (
                <div className="text-neutral-400 text-sm">No address on file</div>
              )}
            </div>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Emergency Contacts</h3>
            <div className="space-y-2">
              {(hrDetails.emergency_contacts || []).map((ec) => (
                <div key={ec.id} className="flex justify-between text-sm">
                  <span>{ec.contact_name || 'Contact'}{ec.relationship ? ` (${ec.relationship})` : ''}</span>
                  <span>{ec.contact_phone || '—'}</span>
                </div>
              ))}
              {(!hrDetails.emergency_contacts || hrDetails.emergency_contacts.length === 0) && (
                <div className="text-neutral-400 text-sm">No emergency contacts</div>
              )}
            </div>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Compensation History</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="text-left py-2">Effective</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Rate</th>
                    <th className="text-left py-2">Hours/biweekly</th>
                  </tr>
                </thead>
                <tbody>
                  {(hrDetails.compensation_history || []).map(ch => (
                    <tr key={ch.id} className="border-b border-neutral-700">
                      <td className="py-2">{new Date(ch.effective_date).toLocaleDateString()}</td>
                      <td className="py-2">{ch.rate_type}</td>
                      <td className="py-2">${ch.regular_rate}</td>
                      <td className="py-2">{ch.hours_biweekly ?? '—'}</td>
                    </tr>
                  ))}
                  {(!hrDetails.compensation_history || hrDetails.compensation_history.length === 0) && (
                    <tr><td className="text-neutral-400 text-sm py-2" colSpan={4}>No compensation records</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Status History</h3>
            <div className="space-y-2">
              {(hrDetails.status_history || []).map(sh => (
                <div key={sh.id} className="flex justify-between text-sm">
                  <span>{sh.status}</span>
                  <span>{new Date(sh.status_date).toLocaleDateString()}</span>
                </div>
              ))}
              {(!hrDetails.status_history || hrDetails.status_history.length === 0) && (
                <div className="text-neutral-400 text-sm">No status history</div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Training Tab */}
      {activeTab === "training" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Training Records</h3>
            <div className="grid gap-4">
              {(trainingRecords || []).map((record) => (
                <div key={record.id} className="flex justify-between items-center p-4 bg-neutral-700 rounded-lg">
                  <div>
                    <div className="font-medium">{record.training_name}</div>
                    <div className="text-sm text-neutral-400">Completed: {new Date(record.completed_on).toLocaleDateString()}</div>
                    <div className="text-xs text-neutral-500">Valid for {record.validity_months} months</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      new Date(record.completed_on).getTime() + (record.validity_months * 30 * 24 * 60 * 60 * 1000) > Date.now()
                        ? 'bg-green-900 text-green-300'
                        : 'bg-red-900 text-red-300'
                    }`}>
                      {new Date(record.completed_on).getTime() + (record.validity_months * 30 * 24 * 60 * 60 * 1000) > Date.now()
                        ? 'Valid'
                        : 'Expired'
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

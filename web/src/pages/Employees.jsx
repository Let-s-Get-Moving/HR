import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';
import EmployeeOnboarding from "../components/EmployeeOnboarding.jsx";
import EmployeeOffboarding from "../components/EmployeeOffboarding.jsx";
import EmployeeProfile from "./EmployeeProfile.jsx";
import { useUserRole } from '../hooks/useUserRole.js';

import { API } from '../config/api.js';
import { formatShortDate } from '../utils/timezone.js';

export default function Employees() {
  const { t } = useTranslation();
  const { userRole } = useUserRole();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOffboarding, setShowOffboarding] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeToTerminate, setEmployeeToTerminate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [filterStatus, setFilterStatus] = useState("active"); // "active" or "terminated"
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    gender: "",
    birth_date: "",
    hire_date: "",
    employment_type: "Full-time",
    department_id: "",
    location_id: "",
    role_title: "",
    probation_end: ""
  });

  useEffect(() => {
    loadEmployees();
    loadDepartments();
    loadLocations();
  }, [filterStatus]); // Reload when filter changes

  // Update filtered employees when main employees list changes
  useEffect(() => {
    handleSearch(searchQuery);
  }, [employees]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const endpoint = filterStatus === "terminated" ? "/api/employees/terminated" : "/api/employees";
      const data = await API(endpoint);
      setEmployees(data);
      setFilteredEmployees(data); // Initialize filtered list
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      setLoading(false);
    }
  };

  // Comprehensive search function that searches all employee fields
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredEmployees(employees);
      return;
    }

    const searchTerm = query.toLowerCase();
    const filtered = employees.filter(employee => {
      // Search across all relevant fields
      const searchableFields = [
        employee.first_name,
        employee.last_name,
        `${employee.first_name} ${employee.last_name}`, // Full name
        employee.email,
        employee.phone,
        employee.role_title,
        employee.department,
        employee.location,
        employee.employment_type,
        employee.status,
        employee.gender,
        employee.hire_date,
        employee.termination_date,
        employee.birth_date
      ];

      return searchableFields.some(field => 
        field && field.toString().toLowerCase().includes(searchTerm)
      );
    });

    setFilteredEmployees(filtered);
  };

  const loadDepartments = async () => {
    try {
      const data = await API("/api/employees/departments");
      setDepartments(data);
    } catch (error) {
      console.error("Error loading departments:", error);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await API("/api/employees/locations");
      setLocations(data);
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      setShowAddForm(false);
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        gender: "",
        birth_date: "",
        hire_date: "",
        employment_type: "Full-time",
        department_id: "",
        location_id: "",
        role_title: "",
        probation_end: ""
      });
      loadEmployees();
    } catch (error) {
      console.error("Error adding employee:", error);
    }
  };

  const handleTerminate = async (employee) => {
    setEmployeeToTerminate(employee);
    setShowOffboarding(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading employees...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Employee Management</h1>
          <p className="text-neutral-400 mt-1">Manage your workforce and employee records</p>
        </div>
        {/* Hide Add Employee button for user role */}
        {userRole !== 'user' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowOnboarding(true)}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 sm:px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto"
          >
            + Add Employee
          </motion.button>
        )}
      </div>

      {/* Filter and Search Bar - Hidden for user role */}
      {userRole !== 'user' && (
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Status Filter Dropdown */}
          <div className="w-full sm:w-64">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="active">Active Employees</option>
              <option value="terminated">Terminated Employees</option>
            </select>
          </div>
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={`Search ${filterStatus === "terminated" ? "terminated" : "active"} employees...`}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="block w-full pl-10 pr-10 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  onClick={() => handleSearch("")}
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {userRole !== 'user' && searchQuery && (
        <div className="mb-4 text-sm text-neutral-400">
          Found {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} matching "{searchQuery}"
        </div>
      )}

      {/* Employee Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-800">
              <tr>
                <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Name</th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Email</th>
                {filterStatus === "active" && (
                  <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Department</th>
                )}
                <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Type</th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Hire Date</th>
                <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Status</th>
                {filterStatus === "terminated" && (
                  <th className="hidden lg:table-cell px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Termination Date</th>
                )}
                {filterStatus === "active" && (
                  <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredEmployees.length === 0 && searchQuery ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-neutral-400">
                    <div className="flex flex-col items-center">
                      <svg className="h-12 w-12 text-neutral-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="text-lg font-medium mb-1">No employees found</p>
                      <p className="text-sm">Try adjusting your search terms or clear the search to see all employees.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                <tr 
                  key={employee.id} 
                  className="hover:bg-neutral-800/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedEmployee(employee)}
                >
                  <td className="px-3 sm:px-6 py-4">
                    <div>
                      <div className="font-medium">{employee.first_name} {employee.last_name}</div>
                      <div className="text-sm text-neutral-400">{employee.role_title}</div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-3 sm:px-6 py-4 text-sm">
                    <div className="space-y-1">
                      <div className="text-indigo-400 font-mono text-xs">
                        {employee.first_name.toLowerCase()}@letsgetmovinggroup.com
                      </div>
                      {employee.email && employee.email.toLowerCase() !== `${employee.first_name.toLowerCase()}@letsgetmovinggroup.com` && (
                        <div className="text-neutral-300 text-xs">
                          {employee.email}
                        </div>
                      )}
                    </div>
                  </td>
                  {filterStatus === "active" && (
                    <td className="px-3 sm:px-6 py-4 text-sm">{employee.department}</td>
                  )}
                  <td className="px-3 sm:px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      employee.employment_type === 'Full-time' ? 'bg-green-900 text-green-300' :
                      employee.employment_type === 'Part-time' ? 'bg-blue-900 text-blue-300' :
                      'bg-purple-900 text-purple-300'
                    }`}>
                      {employee.employment_type}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-3 sm:px-6 py-4 text-sm">{formatShortDate(employee.hire_date)}</td>
                  <td className="px-3 sm:px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      employee.status === 'Active' ? 'bg-green-900 text-green-300' :
                      employee.status === 'On Leave' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {employee.status}
                    </span>
                  </td>
                  {filterStatus === "terminated" && (
                    <td className="hidden lg:table-cell px-3 sm:px-6 py-4 text-sm">
                      {employee.termination_date ? formatShortDate(employee.termination_date) : '-'}
                    </td>
                  )}
                  {filterStatus === "active" && (
                    <td className="px-3 sm:px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTerminate(employee);
                        }}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Terminate
                      </button>
                    </td>
                  )}
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Onboarding Modal */}
      {showOnboarding && (
        <EmployeeOnboarding
          onClose={() => setShowOnboarding(false)}
          onSuccess={() => {
            setShowOnboarding(false);
            loadEmployees();
          }}
        />
      )}

      {/* Employee Offboarding Modal */}
      {showOffboarding && employeeToTerminate && (
        <EmployeeOffboarding
          employee={employeeToTerminate}
          onClose={() => {
            setShowOffboarding(false);
            setEmployeeToTerminate(null);
          }}
          onSuccess={() => {
            setShowOffboarding(false);
            setEmployeeToTerminate(null);
            loadEmployees();
          }}
        />
      )}

      {/* Employee Profile Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-7xl max-h-[95vh] overflow-hidden"
          >
            <div className="bg-neutral-900 rounded-lg shadow-2xl">
              <div className="flex justify-between items-center p-6 border-b border-neutral-800">
                <h2 className="text-2xl font-bold">Employee Profile</h2>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-[85vh] overflow-y-auto">
                <EmployeeProfile 
                  employeeId={selectedEmployee.id} 
                  onClose={() => setSelectedEmployee(null)}
                  onUpdate={() => {
                    loadEmployees();
                    setSelectedEmployee(null);
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

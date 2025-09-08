import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import EmployeeOnboarding from "../components/EmployeeOnboarding.jsx";
import EmployeeOffboarding from "../components/EmployeeOffboarding.jsx";
import EmployeeProfile from "./EmployeeProfile.jsx";

import { API } from '../config/api.js';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOffboarding, setShowOffboarding] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeToTerminate, setEmployeeToTerminate] = useState(null);
  const [loading, setLoading] = useState(true);
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
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await API("/api/employees");
      setEmployees(data);
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      setLoading(false);
    }
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
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowOnboarding(true)}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 sm:px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto"
        >
          + Add Employee
        </motion.button>
      </div>

      {/* Employee Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-800">
              <tr>
                <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Name</th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Email</th>
                <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Department</th>
                <th className="hidden lg:table-cell px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Location</th>
                <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Type</th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Hire Date</th>
                <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Status</th>
                <th className="hidden lg:table-cell px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Termination Date</th>
                <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {employees.map((employee) => (
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
                  <td className="hidden md:table-cell px-3 sm:px-6 py-4 text-sm">{employee.email}</td>
                  <td className="px-3 sm:px-6 py-4 text-sm">{employee.department}</td>
                  <td className="hidden lg:table-cell px-3 sm:px-6 py-4 text-sm">{employee.location}</td>
                  <td className="px-3 sm:px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      employee.employment_type === 'Full-time' ? 'bg-green-900 text-green-300' :
                      employee.employment_type === 'Part-time' ? 'bg-blue-900 text-blue-300' :
                      'bg-purple-900 text-purple-300'
                    }`}>
                      {employee.employment_type}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-3 sm:px-6 py-4 text-sm">{new Date(employee.hire_date).toLocaleDateString()}</td>
                  <td className="px-3 sm:px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      employee.status === 'Active' ? 'bg-green-900 text-green-300' :
                      employee.status === 'On Leave' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-3 sm:px-6 py-4 text-sm">
                    {employee.termination_date ? new Date(employee.termination_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    {employee.status === 'Active' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTerminate(employee);
                        }}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Terminate
                      </button>
                    ) : (
                      <span className="text-neutral-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))}
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

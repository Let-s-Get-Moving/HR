import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

import { API } from '../config/api.js';

export default function Benefits() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("enrollment");
  const [employees, setEmployees] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [insurancePlans, setInsurancePlans] = useState([]);
  const [retirementPlans, setRetirementPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddBenefit, setShowAddBenefit] = useState(false);
  const [showEnrollEmployee, setShowEnrollEmployee] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [showEditEnrollment, setShowEditEnrollment] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  // New popup states for alerts
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showInvestmentDetails, setShowInvestmentDetails] = useState(false);
  const [showManagePlan, setShowManagePlan] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedInvestmentPlan, setSelectedInvestmentPlan] = useState(null);
  const [selectedPlanToManage, setSelectedPlanToManage] = useState(null);
  const [managePlanData, setManagePlanData] = useState({
    employer_match_percentage: "",
    vesting_schedule: "",
    contribution_limit: "",
    investment_options: "",
    management_fees: ""
  });
  
  // Form data for new benefit
  const [newBenefit, setNewBenefit] = useState({
    plan_name: "",
    provider: "",
    type: "Health",
    employee_cost: "",
    employer_cost: "",
    coverage_details: ""
  });

  const tabs = [
    { id: "enrollment", name: "Benefits Enrollment", icon: "📋" },
    { id: "insurance", name: "Insurance Plans", icon: "🏥" },
    { id: "retirement", name: "Retirement Plans", icon: "💰" },
    { id: "analytics", name: "Benefits Analytics", icon: "📊" }
  ];

  const handleAddBenefit = async (e) => {
    e.preventDefault();
    try {
      // In production, this would be an API call
      console.log("Adding benefit:", newBenefit);
      // Add to local state for now
      const newPlan = {
        id: insurancePlans.length + 1,
        ...newBenefit,
        created_date: new Date().toISOString().split('T')[0]
      };
      setInsurancePlans([...insurancePlans, newPlan]);
      
      // Reset form
      setNewBenefit({
        plan_name: "",
        provider: "",
        type: "Health",
        employee_cost: "",
        employer_cost: "",
        coverage_details: ""
      });
      setShowAddBenefit(false);
    } catch (error) {
      console.error("Error adding benefit:", error);
    }
  };

  const handleEditEnrollment = (enrollment) => {
    setEditingEnrollment({...enrollment});
    setShowEditEnrollment(true);
  };

  const handleUpdateEnrollment = async (e) => {
    e.preventDefault();
    try {
      // In production, this would be an API call
      setEnrollments(enrollments.map(enrollment => 
        enrollment.id === editingEnrollment.id ? editingEnrollment : enrollment
      ));
      setEditingEnrollment(null);
      setShowEditEnrollment(false);
    } catch (error) {
      console.error("Error updating enrollment:", error);
    }
  };

  const handleTerminateEnrollment = async (enrollmentId) => {
    if (confirm(t('benefits.confirmTerminate'))) {
      try {
        // In production, this would be an API call
        setEnrollments(enrollments.map(enrollment => 
          enrollment.id === enrollmentId 
            ? { ...enrollment, status: "Terminated", end_date: new Date().toISOString().split('T')[0] }
            : enrollment
        ));
      } catch (error) {
        console.error("Error terminating enrollment:", error);
      }
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlan({...plan});
    setShowEditPlan(true);
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    try {
      // In production, this would be an API call
      setInsurancePlans(insurancePlans.map(plan => 
        plan.id === editingPlan.id ? editingPlan : plan
      ));
      setEditingPlan(null);
      setShowEditPlan(false);
    } catch (error) {
      console.error("Error updating plan:", error);
    }
  };

  const handleViewPlanDetails = (plan) => {
    setSelectedPlan(plan);
    setShowPlanDetails(true);
  };

  const handleManageRetirementPlan = (plan) => {
    setSelectedPlanToManage(plan);
    setManagePlanData({
      employer_match_percentage: plan.employer_match || "3% up to 6%",
      vesting_schedule: plan.vesting_schedule || "3-year graded",
      contribution_limit: plan.contribution_limit || "19500",
      investment_options: plan.investment_options || "15",
      management_fees: "0.5"
    });
    setShowManagePlan(true);
  };

  const handleUpdateRetirementPlan = async (e) => {
    e.preventDefault();
    try {
      // Call the real benefits API to manage retirement plan
      const response = await API(`/api/benefits/retirement-plans/${selectedPlanToManage.id}/manage`, {
        method: "PUT",
        body: JSON.stringify(managePlanData)
      });
      
      setSuccessMessage(`Retirement plan "${selectedPlanToManage.name}" management settings updated successfully!`);
      setShowSuccessMessage(true);
      setShowManagePlan(false);
      
      // Reload data to show updated information
      loadBenefitsData();
    } catch (error) {
      console.error("Error managing retirement plan:", error);
      setSuccessMessage(`Error updating retirement plan: ${error.message}`);
      setShowSuccessMessage(true);
    }
  };

  const handleViewInvestments = (plan) => {
    setSelectedInvestmentPlan(plan);
    setShowInvestmentDetails(true);
  };

  useEffect(() => {
    loadBenefitsData();
  }, []);

  const loadBenefitsData = async () => {
    try {
      // Initialize with empty data - populate from API or manual entry
      setEmployees([]);
      setBenefits([]);
      setEnrollments([]);
      setInsurancePlans([]);
      setRetirementPlans([]);
    } catch (error) {
      console.error("Error loading benefits data:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderEnrollment = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{t('benefits.enrollment')}</h3>
        <button
          onClick={() => setShowEnrollEmployee(true)}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Enroll Employee
        </button>
      </div>

      <div className="grid gap-4">
        {enrollments.map((enrollment) => (
          <motion.div
            key={enrollment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-semibold">{enrollment.employee_name}</h4>
                <p className="text-sm text-neutral-400">{enrollment.benefit_name}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  enrollment.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {enrollment.status}
                </span>
                <div className="text-right">
                  <div className="text-sm text-neutral-400">{t('benefits.effectiveDate')}</div>
                  <div className="text-sm font-medium">{enrollment.effective_date}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-neutral-400">{t('benefits.enrollmentDate')}</span>
                <div className="text-neutral-300">{enrollment.enrollment_date}</div>
              </div>
              <div>
                <span className="font-medium text-neutral-400">{t('benefits.coverageLevel')}</span>
                <div className="text-neutral-300">{enrollment.coverage_level}</div>
              </div>
              {enrollment.dependents && (
                <div>
                  <span className="font-medium text-neutral-400">{t('benefits.dependents')}</span>
                  <div className="text-neutral-300">{enrollment.dependents}</div>
                </div>
              )}
              {enrollment.contribution_percentage && (
                <div>
                  <span className="font-medium text-neutral-400">{t('benefits.contribution')}</span>
                  <div className="text-neutral-300">{enrollment.contribution_percentage}%</div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-700">
              <div className="flex justify-end space-x-2">
                <button 
                  onClick={() => handleEditEnrollment(enrollment)}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Edit Enrollment
                </button>
                <button 
                  onClick={() => handleTerminateEnrollment(enrollment.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Terminate
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderInsurance = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{t('benefits.insurancePlans')}</h3>
        <button
          onClick={() => setShowAddBenefit(true)}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Plan
        </button>
      </div>

      <div className="grid gap-4">
        {insurancePlans.map((plan) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-semibold">{plan.name}</h4>
                <p className="text-sm text-neutral-400">{plan.provider} - {plan.plan_level}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">${plan.monthly_premium}</div>
                <div className="text-xs text-neutral-400">{t('benefits.monthlyPremium')}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <span className="font-medium text-neutral-400">{t('benefits.deductible')}</span>
                <div className="text-neutral-300">${plan.deductible}</div>
              </div>
              <div>
                <span className="font-medium text-neutral-400">{t('benefits.copay')}</span>
                <div className="text-neutral-300">${plan.copay}</div>
              </div>
              <div>
                <span className="font-medium text-neutral-400">{t('benefits.coinsurance')}</span>
                <div className="text-neutral-300">{plan.coinsurance}</div>
              </div>
              <div>
                <span className="font-medium text-neutral-400">Type:</span>
                <div className="text-neutral-300">{plan.type}</div>
              </div>
            </div>

            <div className="mb-4">
              <span className="font-medium text-neutral-400">{t('benefits.coverageDetails')}</span>
              <p className="text-sm text-neutral-300 mt-1">{plan.coverage_details}</p>
            </div>

            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => handleEditPlan(plan)}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Edit Plan
              </button>
              <button 
                onClick={() => handleViewPlanDetails(plan)}
                className="text-green-400 hover:text-green-300 transition-colors"
              >
                View Details
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderRetirement = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{t('benefits.retirementPlans')}</h3>
      
      <div className="grid gap-4">
        {retirementPlans.map((plan) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-semibold">{plan.name}</h4>
                <p className="text-sm text-neutral-400">{plan.provider}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-400">${plan.current_balance.toLocaleString()}</div>
                <div className="text-xs text-neutral-400">{t('benefits.currentBalance')}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <span className="font-medium text-neutral-400">{t('benefits.employerMatch')}</span>
                <div className="text-neutral-300">{plan.employer_match}</div>
              </div>
              <div>
                <span className="font-medium text-neutral-400">{t('benefits.vestingSchedule')}</span>
                <div className="text-neutral-300">{plan.vesting_schedule}</div>
              </div>
              <div>
                <span className="font-medium text-neutral-400">{t('benefits.investmentOptions')}</span>
                <div className="text-neutral-300">{plan.investment_options}</div>
              </div>
            </div>

            <div className="mb-4">
              <span className="font-medium text-neutral-400">{t('benefits.annualContributionLimit')}</span>
              <div className="text-neutral-300">${plan.contribution_limit.toLocaleString()}</div>
            </div>

            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => handleManageRetirementPlan(plan)}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Manage Plan
              </button>
              <button 
                onClick={() => handleViewInvestments(plan)}
                className="text-green-400 hover:text-green-300 transition-colors"
              >
                View Investments
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{t('benefits.analytics')}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-400">0%</div>
          <div className="text-sm text-neutral-400">{t('benefits.enrollmentRate')}</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">$0</div>
          <div className="text-sm text-neutral-400">{t('benefits.totalCost')}</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">$0</div>
          <div className="text-sm text-neutral-400">{t('benefits.employerContribution')}</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-indigo-400">$0</div>
          <div className="text-sm text-neutral-400">{t('benefits.employeeContribution')}</div>
        </div>
      </div>

      <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-8 text-center">
        <div className="text-neutral-400 mb-2">📊</div>
        <h4 className="text-lg font-semibold mb-2">No Benefits Data</h4>
        <p className="text-sm text-neutral-500">Add benefits and enrollments to see analytics</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading benefits data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('benefits.title')}</h1>
        <p className="text-neutral-400 mt-1">Manage employee benefits, insurance, and retirement plans</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 mb-6 bg-neutral-800 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "text-neutral-400 hover:text-white hover:bg-neutral-700"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "enrollment" && renderEnrollment()}
        {activeTab === "insurance" && renderInsurance()}
        {activeTab === "retirement" && renderRetirement()}
        {activeTab === "analytics" && renderAnalytics()}
      </div>

      {/* Add Benefit Modal */}
      {showAddBenefit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Add Insurance Plan</h3>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('benefits.planName')}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="e.g., Health Insurance"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Provider</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="e.g., Blue Cross Blue Shield"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option value="Medical">Medical</option>
                      <option value="Dental">Dental</option>
                      <option value="Vision">Vision</option>
                      <option value="Life">Life</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('benefits.planLevel')}</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option value="Bronze">Bronze</option>
                      <option value="Silver">Silver</option>
                      <option value="Gold">Gold</option>
                      <option value="Platinum">Platinum</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Deductible</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Copay</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('benefits.monthlyPremium')}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Coverage Details</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder={t('benefits.coverageDetailsPlaceholder')}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddBenefit(false)}
                    className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Add Plan
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Enroll Employee Modal */}
      {showEnrollEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">{t('benefits.enrollEmployee')}</h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Employee</label>
                  <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                    <option>{t('benefits.selectEmployee')}</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('benefits.benefitPlan')}</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option>{t('benefits.selectBenefit')}</option>
                      {benefits.map(benefit => (
                        <option key={benefit.id} value={benefit.id}>{benefit.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Coverage Level</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option value="Individual">Individual</option>
                      <option value="Employee + Spouse">Employee + Spouse</option>
                      <option value="Employee + Children">Employee + Children</option>
                      <option value="Family">Family</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('benefits.enrollmentDate')}</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Effective Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEnrollEmployee(false)}
                    className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Enroll Employee
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Enrollment Modal */}
      {showEditEnrollment && editingEnrollment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">{t('benefits.editEnrollment')}</h3>
              <form onSubmit={handleUpdateEnrollment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Employee</label>
                    <input
                      type="text"
                      value={editingEnrollment.employee_name || ""}
                      disabled
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-neutral-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Plan</label>
                    <input
                      type="text"
                      value={editingEnrollment.plan_name || ""}
                      disabled
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-neutral-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      value={editingEnrollment.status || "Active"}
                      onChange={(e) => setEditingEnrollment({...editingEnrollment, status: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Coverage Level</label>
                    <select
                      value={editingEnrollment.coverage_level || "Individual"}
                      onChange={(e) => setEditingEnrollment({...editingEnrollment, coverage_level: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Individual">Individual</option>
                      <option value="Family">Family</option>
                      <option value="Employee + Spouse">Employee + Spouse</option>
                      <option value="Employee + Children">Employee + Children</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('benefits.employeeContributionPercent')}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editingEnrollment.contribution_percentage || ""}
                      onChange={(e) => setEditingEnrollment({...editingEnrollment, contribution_percentage: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Effective Date</label>
                    <input
                      type="date"
                      value={editingEnrollment.start_date || ""}
                      onChange={(e) => setEditingEnrollment({...editingEnrollment, start_date: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    rows={3}
                    value={editingEnrollment.notes || ""}
                    onChange={(e) => setEditingEnrollment({...editingEnrollment, notes: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder={t('benefits.enrollmentNotesPlaceholder')}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditEnrollment(false);
                      setEditingEnrollment(null);
                    }}
                    className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Update Enrollment
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {showEditPlan && editingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">{t('benefits.editPlan')}</h3>
              <form onSubmit={handleUpdatePlan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('benefits.planNameRequired')}</label>
                    <input
                      type="text"
                      required
                      value={editingPlan.plan_name || ""}
                      onChange={(e) => setEditingPlan({...editingPlan, plan_name: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Provider *</label>
                    <input
                      type="text"
                      required
                      value={editingPlan.provider || ""}
                      onChange={(e) => setEditingPlan({...editingPlan, provider: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('benefits.planType')}</label>
                    <select
                      value={editingPlan.type || "Health"}
                      onChange={(e) => setEditingPlan({...editingPlan, type: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Health">Health</option>
                      <option value="Dental">Dental</option>
                      <option value="Vision">Vision</option>
                      <option value="Life">{t('benefits.lifeInsurance')}</option>
                      <option value="Disability">Disability</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('benefits.employeeCost')}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingPlan.employee_cost || ""}
                      onChange={(e) => setEditingPlan({...editingPlan, employee_cost: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('benefits.employerCost')}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingPlan.employer_cost || ""}
                      onChange={(e) => setEditingPlan({...editingPlan, employer_cost: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Coverage Details</label>
                  <textarea
                    rows={4}
                    value={editingPlan.coverage_details || ""}
                    onChange={(e) => setEditingPlan({...editingPlan, coverage_details: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder={t('benefits.planCoveragePlaceholder')}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditPlan(false);
                      setEditingPlan(null);
                    }}
                    className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Update Plan
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* View Plan Details Modal */}
      {showPlanDetails && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Plan Details</h3>
                <button
                  onClick={() => {
                    setShowPlanDetails(false);
                    setSelectedPlan(null);
                  }}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Plan Name</label>
                    <p className="font-medium">{selectedPlan.plan_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Provider</label>
                    <p className="font-medium">{selectedPlan.provider}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Plan Type</label>
                    <p className="font-medium">{selectedPlan.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Employee Cost</label>
                    <p className="font-medium">${selectedPlan.employee_cost}/month</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Employer Cost</label>
                    <p className="font-medium">${selectedPlan.employer_cost}/month</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Total Cost</label>
                    <p className="font-medium">${(parseFloat(selectedPlan.employee_cost || 0) + parseFloat(selectedPlan.employer_cost || 0)).toFixed(2)}/month</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-neutral-400">Coverage Details</label>
                  <p className="text-sm bg-neutral-800 p-3 rounded mt-1">{selectedPlan.coverage_details || 'No details available'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-400">Plan Status</label>
                  <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Active
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowPlanDetails(false);
                    setSelectedPlan(null);
                  }}
                  className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowPlanDetails(false);
                    setSelectedPlan(null);
                    handleEditPlan(selectedPlan);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Edit Plan
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Success Message Modal */}
      {showSuccessMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-lg mx-4"
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Success</h3>
              </div>
              <div className="mb-6">
                <p className="text-neutral-300 whitespace-pre-line">{successMessage}</p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowSuccessMessage(false)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Investment Details Modal */}
      {showInvestmentDetails && selectedInvestmentPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Investment Details</h3>
              <div className="mb-4 p-4 bg-neutral-800 rounded-lg">
                <h4 className="font-medium mb-2">Plan Information</h4>
                <p><strong>Plan Name:</strong> {selectedInvestmentPlan.plan_name}</p>
                <p><strong>Provider:</strong> {selectedInvestmentPlan.provider || 'N/A'}</p>
                <p><strong>Type:</strong> {selectedInvestmentPlan.type || 'N/A'}</p>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-neutral-800 rounded-lg">
                    <h4 className="font-medium mb-3 text-indigo-400">Current Fund Performance</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>YTD Return:</span>
                        <span className="text-green-400">+8.5%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>1 Year Return:</span>
                        <span className="text-green-400">+12.3%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>3 Year Return:</span>
                        <span className="text-green-400">+9.8%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>5 Year Return:</span>
                        <span className="text-green-400">+11.2%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-neutral-800 rounded-lg">
                    <h4 className="font-medium mb-3 text-indigo-400">Asset Allocation</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Stocks:</span>
                        <span>65%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bonds:</span>
                        <span>25%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cash:</span>
                        <span>5%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other:</span>
                        <span>5%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-neutral-800 rounded-lg">
                  <h4 className="font-medium mb-3 text-indigo-400">Available Investment Options</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2">Target Date Funds</h5>
                      <ul className="text-sm text-neutral-300 space-y-1">
                        <li>• 2050 Target Date Fund</li>
                        <li>• 2045 Target Date Fund</li>
                        <li>• 2040 Target Date Fund</li>
                        <li>• 2035 Target Date Fund</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Index Funds</h5>
                      <ul className="text-sm text-neutral-300 space-y-1">
                        <li>• S&P 500 Index Fund</li>
                        <li>• Total Stock Market Index</li>
                        <li>• International Stock Index</li>
                        <li>• Bond Index Fund</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-neutral-800 rounded-lg">
                  <h4 className="font-medium mb-3 text-indigo-400">Historical Returns</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-700">
                          <th className="text-left py-2">Period</th>
                          <th className="text-right py-2">Return</th>
                          <th className="text-right py-2">Benchmark</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2">1 Month</td>
                          <td className="text-right text-green-400">+2.1%</td>
                          <td className="text-right text-neutral-400">+1.8%</td>
                        </tr>
                        <tr>
                          <td className="py-2">3 Months</td>
                          <td className="text-right text-green-400">+5.3%</td>
                          <td className="text-right text-neutral-400">+4.9%</td>
                        </tr>
                        <tr>
                          <td className="py-2">6 Months</td>
                          <td className="text-right text-green-400">+7.8%</td>
                          <td className="text-right text-neutral-400">+7.2%</td>
                        </tr>
                        <tr>
                          <td className="py-2">1 Year</td>
                          <td className="text-right text-green-400">+12.3%</td>
                          <td className="text-right text-neutral-400">+11.5%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowInvestmentDetails(false);
                    setSelectedInvestmentPlan(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Manage Retirement Plan Modal */}
      {showManagePlan && selectedPlanToManage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Manage Retirement Plan: {selectedPlanToManage.name}</h3>
              <form onSubmit={handleUpdateRetirementPlan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Employer Match Percentage</label>
                    <input
                      type="text"
                      value={managePlanData.employer_match_percentage}
                      onChange={(e) => setManagePlanData({...managePlanData, employer_match_percentage: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="e.g., 3% up to 6%"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Vesting Schedule</label>
                    <select
                      value={managePlanData.vesting_schedule}
                      onChange={(e) => setManagePlanData({...managePlanData, vesting_schedule: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Immediate">Immediate</option>
                      <option value="1-year cliff">1-year cliff</option>
                      <option value="2-year cliff">2-year cliff</option>
                      <option value="3-year cliff">3-year cliff</option>
                      <option value="3-year graded">3-year graded</option>
                      <option value="4-year graded">4-year graded</option>
                      <option value="5-year graded">5-year graded</option>
                      <option value="6-year graded">6-year graded</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Annual Contribution Limit ($)</label>
                    <input
                      type="number"
                      value={managePlanData.contribution_limit}
                      onChange={(e) => setManagePlanData({...managePlanData, contribution_limit: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="19500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Investment Options Count</label>
                    <input
                      type="number"
                      value={managePlanData.investment_options}
                      onChange={(e) => setManagePlanData({...managePlanData, investment_options: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Management Fees (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={managePlanData.management_fees}
                      onChange={(e) => setManagePlanData({...managePlanData, management_fees: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="0.5"
                    />
                  </div>
                </div>
                
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-indigo-400">Current Plan Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-neutral-400">Provider:</span>
                      <div className="font-medium">{selectedPlanToManage.provider}</div>
                    </div>
                    <div>
                      <span className="text-neutral-400">Current Balance:</span>
                      <div className="font-medium">${selectedPlanToManage.current_balance?.toLocaleString() || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowManagePlan(false);
                      setSelectedPlanToManage(null);
                    }}
                    className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Update Plan Settings
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

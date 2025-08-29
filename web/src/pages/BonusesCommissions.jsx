import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API = (path, options = {}) => fetch(`http://localhost:8080${path}`, {
  ...options,
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    ...options.headers
  }
}).then(r => r.json());

export default function BonusesCommissions() {
  const [activeTab, setActiveTab] = useState("bonuses");
  const [employees, setEmployees] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [bonusStructures, setBonusStructures] = useState([]);
  const [commissionStructures, setCommissionStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddBonus, setShowAddBonus] = useState(false);
  const [showAddCommission, setShowAddCommission] = useState(false);
  const [showAddStructure, setShowAddStructure] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const tabs = [
    { id: "bonuses", name: "Bonuses", icon: "🎁" },
    { id: "commissions", name: "Commissions", icon: "💰" },
    { id: "structures", name: "Compensation Structures", icon: "🏗️" },
    { id: "analytics", name: "Analytics", icon: "📊" }
  ];

  useEffect(() => {
    loadBonusesCommissionsData();
  }, []);

  const loadBonusesCommissionsData = async () => {
    try {
      // Mock data for now - in production this would come from API
      const mockEmployees = [
        {
          id: 1,
          name: "Sarah Johnson",
          department: "Sales",
          position: "Senior Sales Representative",
          base_salary: 65000,
          commission_rate: 8,
          bonus_eligible: true,
          performance_rating: 4.2,
          total_earnings_ytd: 85000
        },
        {
          id: 2,
          name: "Michael Chen",
          department: "Engineering",
          position: "Software Engineer",
          base_salary: 75000,
          commission_rate: 0,
          bonus_eligible: true,
          performance_rating: 3.8,
          total_earnings_ytd: 82000
        },
        {
          id: 3,
          name: "Lisa Rodriguez",
          department: "Sales",
          position: "Account Manager",
          base_salary: 55000,
          commission_rate: 6,
          bonus_eligible: true,
          performance_rating: 4.5,
          total_earnings_ytd: 72000
        }
      ];

      const mockBonuses = [
        {
          id: 1,
          employee_id: 1,
          employee_name: "Sarah Johnson",
          bonus_type: "Performance Bonus",
          amount: 5000,
          percentage: 7.7,
          criteria: "Exceeded Q4 sales targets by 25%",
          period: "Q4 2024",
          status: "Approved",
          payment_date: "2025-01-15",
          approved_by: "Sales Manager"
        },
        {
          id: 2,
          employee_id: 2,
          employee_name: "Michael Chen",
          bonus_type: "Project Completion",
          amount: 3000,
          percentage: 4.0,
          criteria: "Successfully delivered major client project",
          period: "Q4 2024",
          status: "Pending",
          payment_date: null,
          approved_by: null
        },
        {
          id: 3,
          employee_id: 3,
          employee_name: "Lisa Rodriguez",
          bonus_type: "Customer Satisfaction",
          amount: 2500,
          percentage: 4.5,
          criteria: "Achieved 98% customer satisfaction score",
          period: "Q4 2024",
          status: "Approved",
          payment_date: "2025-01-15",
          approved_by: "Sales Manager"
        }
      ];

      const mockCommissions = [
        {
          id: 1,
          employee_id: 1,
          employee_name: "Sarah Johnson",
          commission_type: "Sales Commission",
          base_amount: 150000,
          commission_rate: 8,
          commission_amount: 12000,
          period: "Q4 2024",
          status: "Paid",
          payment_date: "2025-01-15",
          sales_target: 120000,
          target_achievement: 125
        },
        {
          id: 2,
          employee_id: 3,
          employee_name: "Lisa Rodriguez",
          commission_type: "Sales Commission",
          base_amount: 95000,
          commission_rate: 6,
          commission_amount: 5700,
          period: "Q4 2024",
          status: "Paid",
          payment_date: "2025-01-15",
          sales_target: 80000,
          target_achievement: 119
        }
      ];

      const mockBonusStructures = [
        {
          id: 1,
          name: "Sales Performance Bonus",
          department: "Sales",
          type: "Performance-based",
          calculation_method: "Percentage of base salary",
          tiers: [
            { min_performance: 90, max_performance: 100, bonus_percentage: 10 },
            { min_performance: 80, max_performance: 89, bonus_percentage: 7 },
            { min_performance: 70, max_performance: 79, bonus_percentage: 5 }
          ],
          max_bonus: 15000,
          eligibility_criteria: "Sales targets met, customer satisfaction >90%",
          status: "Active"
        },
        {
          id: 2,
          name: "Engineering Project Bonus",
          department: "Engineering",
          type: "Project-based",
          calculation_method: "Fixed amount per project milestone",
          tiers: [
            { min_performance: 100, max_performance: 100, bonus_percentage: 5 },
            { min_performance: 90, max_performance: 99, bonus_percentage: 3 },
            { min_performance: 80, max_performance: 89, bonus_percentage: 2 }
          ],
          max_bonus: 8000,
          eligibility_criteria: "Project completed on time and within budget",
          status: "Active"
        }
      ];

      const mockCommissionStructures = [
        {
          id: 1,
          name: "Standard Sales Commission",
          department: "Sales",
          base_rate: 6,
          acceleration_rate: 8,
          threshold: 100000,
          max_commission: 20000,
          calculation_method: "Progressive tiered structure",
          tiers: [
            { min_sales: 0, max_sales: 50000, rate: 4 },
            { min_sales: 50001, max_sales: 100000, rate: 6 },
            { min_sales: 100001, max_sales: 200000, rate: 8 },
            { min_sales: 200001, max_sales: 999999, rate: 10 }
          ],
          status: "Active"
        }
      ];

      setEmployees(mockEmployees);
      setBonuses(mockBonuses);
      setCommissions(mockCommissions);
      setBonusStructures(mockBonusStructures);
      setCommissionStructures(mockCommissionStructures);
    } catch (error) {
      console.error("Error loading bonuses and commissions data:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderBonuses = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Employee Bonuses</h3>
        <button
          onClick={() => setShowAddBonus(true)}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Bonus
        </button>
      </div>

      <div className="grid gap-4">
        {bonuses.map((bonus) => (
          <motion.div
            key={bonus.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-semibold">{bonus.employee_name}</h4>
                <p className="text-sm text-neutral-400">{bonus.bonus_type} - {bonus.period}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  bonus.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                  bonus.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  {bonus.status}
                </span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">${bonus.amount.toLocaleString()}</div>
                  <div className="text-xs text-neutral-400">{bonus.percentage}% of base</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="font-medium text-neutral-400">Criteria:</span>
                <p className="text-sm text-neutral-300 mt-1">{bonus.criteria}</p>
              </div>
              <div>
                <span className="font-medium text-neutral-400">Payment Date:</span>
                <div className="text-sm text-neutral-300">
                  {bonus.payment_date || 'Pending'}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-700">
              <div className="flex justify-between items-center text-sm text-neutral-400">
                <span>Approved by: {bonus.approved_by || 'Pending'}</span>
                <div className="flex space-x-2">
                  <button className="text-indigo-400 hover:text-indigo-300 transition-colors">
                    Edit
                  </button>
                  {bonus.status === 'Pending' && (
                    <button className="text-green-400 hover:text-green-300 transition-colors">
                      Approve
                    </button>
                  )}
                  <button className="text-red-400 hover:text-red-300 transition-colors">
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderCommissions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Sales Commissions</h3>
        <button
          onClick={() => setShowAddCommission(true)}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Commission
        </button>
      </div>

      <div className="grid gap-4">
        {commissions.map((commission) => (
          <motion.div
            key={commission.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-semibold">{commission.employee_name}</h4>
                <p className="text-sm text-neutral-400">{commission.commission_type} - {commission.period}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  commission.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {commission.status}
                </span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-400">${commission.commission_amount.toLocaleString()}</div>
                  <div className="text-xs text-neutral-400">{commission.commission_rate}% rate</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <span className="font-medium text-neutral-400">Base Amount:</span>
                <div className="text-sm text-neutral-300">${commission.base_amount.toLocaleString()}</div>
              </div>
              <div>
                <span className="font-medium text-neutral-400">Commission Rate:</span>
                <div className="text-sm text-neutral-300">{commission.commission_rate}%</div>
              </div>
              <div>
                <span className="font-medium text-neutral-400">Sales Target:</span>
                <div className="text-sm text-neutral-300">${commission.sales_target.toLocaleString()}</div>
              </div>
              <div>
                <span className="font-medium text-neutral-400">Achievement:</span>
                <div className="text-sm text-neutral-300">{commission.target_achievement}%</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Target Achievement</span>
                <span className="text-sm text-neutral-400">{commission.target_achievement}%</span>
              </div>
              <div className="w-full bg-neutral-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    commission.target_achievement >= 100 ? 'bg-green-400' : 
                    commission.target_achievement >= 80 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min(commission.target_achievement, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-700">
              <div className="flex justify-between items-center text-sm text-neutral-400">
                <span>Payment Date: {commission.payment_date}</span>
                <div className="flex space-x-2">
                  <button className="text-indigo-400 hover:text-indigo-300 transition-colors">
                    View Details
                  </button>
                  <button className="text-green-400 hover:text-green-300 transition-colors">
                    Export
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderStructures = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Compensation Structures</h3>
        <button
          onClick={() => setShowAddStructure(true)}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Structure
        </button>
      </div>

      <div className="grid gap-6">
        {/* Bonus Structures */}
        <div>
          <h4 className="text-lg font-semibold mb-4 text-green-400">Bonus Structures</h4>
          <div className="grid gap-4">
            {bonusStructures.map((structure) => (
              <motion.div
                key={structure.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h5 className="text-lg font-semibold">{structure.name}</h5>
                    <p className="text-sm text-neutral-400">{structure.department} - {structure.type}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      structure.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {structure.status}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-400">Max: ${structure.max_bonus.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="font-medium text-neutral-400">Calculation Method:</span>
                  <p className="text-sm text-neutral-300 mt-1">{structure.calculation_method}</p>
                </div>

                <div className="mb-4">
                  <span className="font-medium text-neutral-400">Bonus Tiers:</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    {structure.tiers.map((tier, index) => (
                      <div key={index} className="bg-neutral-800 p-2 rounded text-sm">
                        <div className="text-neutral-400">{tier.min_performance}-{tier.max_performance}%</div>
                        <div className="text-green-400 font-medium">{tier.bonus_percentage}% bonus</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <span className="font-medium text-neutral-400">Eligibility Criteria:</span>
                  <p className="text-sm text-neutral-300 mt-1">{structure.eligibility_criteria}</p>
                </div>

                <div className="flex justify-end space-x-2">
                  <button className="text-indigo-400 hover:text-indigo-300 transition-colors">
                    Edit Structure
                  </button>
                  <button className="text-green-400 hover:text-green-300 transition-colors">
                    Apply to Employees
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Commission Structures */}
        <div>
          <h4 className="text-lg font-semibold mb-4 text-blue-400">Commission Structures</h4>
          <div className="grid gap-4">
            {commissionStructures.map((structure) => (
              <motion.div
                key={structure.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h5 className="text-lg font-semibold">{structure.name}</h5>
                    <p className="text-sm text-neutral-400">{structure.department}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      structure.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {structure.status}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-medium text-blue-400">Max: ${structure.max_commission.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="font-medium text-neutral-400">Base Rate:</span>
                    <div className="text-sm text-neutral-300">{structure.base_rate}%</div>
                  </div>
                  <div>
                    <span className="font-medium text-neutral-400">Acceleration Rate:</span>
                    <div className="text-sm text-neutral-300">{structure.acceleration_rate}%</div>
                  </div>
                  <div>
                    <span className="font-medium text-neutral-400">Threshold:</span>
                    <div className="text-sm text-neutral-300">${structure.threshold.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="font-medium text-neutral-400">Calculation:</span>
                    <div className="text-sm text-neutral-300">{structure.calculation_method}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="font-medium text-neutral-400">Commission Tiers:</span>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                    {structure.tiers.map((tier, index) => (
                      <div key={index} className="bg-neutral-800 p-2 rounded text-sm">
                        <div className="text-neutral-400">${tier.min_sales.toLocaleString()}-${tier.max_sales.toLocaleString()}</div>
                        <div className="text-blue-400 font-medium">{tier.rate}% rate</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button className="text-indigo-400 hover:text-indigo-300 transition-colors">
                    Edit Structure
                  </button>
                  <button className="text-green-400 hover:text-green-300 transition-colors">
                    Apply to Employees
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Bonuses & Commissions Analytics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-400">$20.5K</div>
          <div className="text-sm text-neutral-400">Total Bonuses Q4</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">$17.7K</div>
          <div className="text-sm text-neutral-400">Total Commissions Q4</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">$38.2K</div>
          <div className="text-sm text-neutral-400">Total Variable Pay</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-indigo-400">12.3%</div>
          <div className="text-sm text-neutral-400">Avg Bonus % of Base</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h4 className="text-lg font-semibold mb-4">Bonuses by Department</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Sales</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-neutral-700 rounded-full h-2">
                  <div className="bg-green-400 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
                <span className="text-sm text-neutral-400">$13.3K</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Engineering</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-neutral-700 rounded-full h-2">
                  <div className="bg-blue-400 h-2 rounded-full" style={{ width: '35%' }}></div>
                </div>
                <span className="text-sm text-neutral-400">$7.2K</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h4 className="text-lg font-semibold mb-4">Commission Performance</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Target Achievement</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-neutral-700 rounded-full h-2">
                  <div className="bg-green-400 h-2 rounded-full" style={{ width: '119%' }}></div>
                </div>
                <span className="text-sm text-neutral-400">119%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Average Commission Rate</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-neutral-700 rounded-full h-2">
                  <div className="bg-blue-400 h-2 rounded-full" style={{ width: '7%' }}></div>
                </div>
                <span className="text-sm text-neutral-400">7.0%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h4 className="text-lg font-semibold mb-4">Employee Performance vs. Compensation</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-700">
                <th className="text-left py-3 px-4">Employee</th>
                <th className="text-left py-3 px-4">Department</th>
                <th className="text-left py-3 px-4">Base Salary</th>
                <th className="text-left py-3 px-4">Performance Rating</th>
                <th className="text-left py-3 px-4">Total Bonuses</th>
                <th className="text-left py-3 px-4">Total Commissions</th>
                <th className="text-left py-3 px-4">Total Earnings</th>
                <th className="text-left py-3 px-4">Variable Pay %</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const employeeBonuses = bonuses.filter(b => b.employee_id === employee.id);
                const employeeCommissions = commissions.filter(c => c.employee_id === employee.id);
                const totalBonuses = employeeBonuses.reduce((sum, b) => sum + b.amount, 0);
                const totalCommissions = employeeCommissions.reduce((sum, c) => sum + c.commission_amount, 0);
                const totalEarnings = employee.base_salary + totalBonuses + totalCommissions;
                const variablePayPercentage = ((totalBonuses + totalCommissions) / employee.base_salary * 100).toFixed(1);

                return (
                  <tr key={employee.id} className="border-b border-neutral-800">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-sm text-neutral-400">{employee.position}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{employee.department}</td>
                    <td className="py-3 px-4">${employee.base_salary.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        employee.performance_rating >= 4.0 ? 'bg-green-100 text-green-800' :
                        employee.performance_rating >= 3.5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {employee.performance_rating}
                      </span>
                    </td>
                    <td className="py-3 px-4">${totalBonuses.toLocaleString()}</td>
                    <td className="py-3 px-4">${totalCommissions.toLocaleString()}</td>
                    <td className="py-3 px-4 font-medium">${totalEarnings.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        parseFloat(variablePayPercentage) >= 20 ? 'bg-green-100 text-green-800' :
                        parseFloat(variablePayPercentage) >= 10 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {variablePayPercentage}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading bonuses and commissions data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Bonuses & Commissions</h1>
        <p className="text-neutral-400 mt-1">Manage performance-based compensation and sales commissions</p>
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
        {activeTab === "bonuses" && renderBonuses()}
        {activeTab === "commissions" && renderCommissions()}
        {activeTab === "structures" && renderStructures()}
        {activeTab === "analytics" && renderAnalytics()}
      </div>

      {/* Add Bonus Modal */}
      {showAddBonus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Add Employee Bonus</h3>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Employee</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option>Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Bonus Type</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option value="Performance Bonus">Performance Bonus</option>
                      <option value="Project Completion">Project Completion</option>
                      <option value="Customer Satisfaction">Customer Satisfaction</option>
                      <option value="Sales Target">Sales Target</option>
                      <option value="Innovation">Innovation</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Period</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option value="Q1 2025">Q1 2025</option>
                      <option value="Q2 2025">Q2 2025</option>
                      <option value="Q3 2025">Q3 2025</option>
                      <option value="Q4 2025">Q4 2025</option>
                      <option value="Annual 2025">Annual 2025</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Criteria</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Describe the criteria for this bonus..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddBonus(false)}
                    className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Add Bonus
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Commission Modal */}
      {showAddCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Add Sales Commission</h3>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Employee</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option>Select Employee</option>
                      {employees.filter(emp => emp.commission_rate > 0).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Commission Type</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option value="Sales Commission">Sales Commission</option>
                      <option value="Referral Commission">Referral Commission</option>
                      <option value="Upsell Commission">Upsell Commission</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Base Amount</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="150000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Period</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option value="Q1 2025">Q1 2025</option>
                      <option value="Q2 2025">Q2 2025</option>
                      <option value="Q3 2025">Q3 2025</option>
                      <option value="Q4 2025">Q4 2025</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Sales Target</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="120000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Target Achievement</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="125"
                      step="0.1"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddCommission(false)}
                    className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Add Commission
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Structure Modal */}
      {showAddStructure && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Add Compensation Structure</h3>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Structure Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="e.g., Sales Performance Bonus"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Department</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option value="Sales">Sales</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Operations">Operations</option>
                      <option value="All">All Departments</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Structure Type</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option value="Bonus">Bonus</option>
                      <option value="Commission">Commission</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Amount</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="15000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Calculation Method</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Describe how the compensation is calculated..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Eligibility Criteria</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Describe eligibility requirements..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddStructure(false)}
                    className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Add Structure
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

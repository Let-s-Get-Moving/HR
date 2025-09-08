import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { API } from '../config/api.js';

export default function EmployeeOffboarding({ employee, onClose, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Termination Details
    termination_date: "",
    termination_type: "",
    termination_reason: "",
    reason_category: "",
    initiated_by: "",
    notice_period_days: 0,
    last_working_day: "",
    
    // Step 2: Financial & Benefits
    final_pay_date: "",
    severance_paid: false,
    severance_amount: 0,
    vacation_payout: 0,
    benefits_end_date: "",
    final_pay_notes: "",
    
    // Step 3: Exit Process
    exit_interview_date: "",
    exit_interview_conducted_by: "",
    exit_interview_notes: "",
    equipment_returned: false,
    equipment_return_date: "",
    equipment_return_notes: "",
    access_revoked: false,
    access_revoked_date: "",
    
    // Step 4: Documentation
    termination_letter: null,
    release_agreement: null,
    roe_document: null,
    final_pay_statement: null,
    exit_interview_form: null,
    
    // Step 5: Review & Submit
    reviewed: false
  });

  const [checklistItems, setChecklistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const steps = [
    { id: 1, title: "Termination Details", icon: "📋" },
    { id: 2, title: "Financial & Benefits", icon: "💰" },
    { id: 3, title: "Exit Process", icon: "🚪" },
    { id: 4, title: "Documentation", icon: "📄" },
    { id: 5, title: "Review & Submit", icon: "✅" }
  ];

  useEffect(() => {
    if (employee) {
      loadChecklistItems();
    }
  }, [employee]);

  const loadChecklistItems = async () => {
    try {
      const items = await API("/api/termination/checklist-template");
      setChecklistItems(items);
    } catch (error) {
      console.error("Error loading checklist items:", error);
    }
  };

  const handleFileUpload = (field, file) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Create termination details
      const terminationResponse = await API("/api/termination/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employee.id,
          termination_date: formData.termination_date,
          termination_type: formData.termination_type,
          termination_reason: formData.termination_reason,
          reason_category: formData.reason_category,
          initiated_by: formData.initiated_by,
          notice_period_days: formData.notice_period_days,
          last_working_day: formData.last_working_day,
          exit_interview_date: formData.exit_interview_date,
          exit_interview_conducted_by: formData.exit_interview_conducted_by,
          exit_interview_notes: formData.exit_interview_notes,
          final_pay_date: formData.final_pay_date,
          severance_paid: formData.severance_paid,
          severance_amount: formData.severance_amount,
          vacation_payout: formData.vacation_payout,
          benefits_end_date: formData.benefits_end_date,
          equipment_returned: formData.equipment_returned,
          equipment_return_date: formData.equipment_return_date,
          equipment_return_notes: formData.equipment_return_notes,
          access_revoked: formData.access_revoked,
          access_revoked_date: formData.access_revoked_date
        })
      });

      // Update employee status
      await API(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Terminated",
          termination_date: formData.termination_date,
          termination_type: formData.termination_type,
          termination_reason: formData.termination_reason,
          severance_paid: formData.severance_paid,
          severance_amount: formData.severance_amount,
          vacation_payout: formData.vacation_payout,
          final_pay_date: formData.final_pay_date,
          benefits_end_date: formData.benefits_end_date
        })
      });

      // Create checklist items
      await API("/api/termination/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employee.id,
          termination_detail_id: terminationResponse.id,
          checklist_items: checklistItems
        })
      });

      // Upload documents if provided
      const documents = [
        { type: "Termination Letter", file: formData.termination_letter },
        { type: "Release Agreement", file: formData.release_agreement },
        { type: "ROE", file: formData.roe_document },
        { type: "Final Pay Statement", file: formData.final_pay_statement },
        { type: "Exit Interview Form", file: formData.exit_interview_form }
      ].filter(doc => doc.file);

      for (const doc of documents) {
        const formData = new FormData();
        formData.append('file', doc.file);
        formData.append('document_type', doc.type);
        formData.append('employee_id', employee.id);
        formData.append('termination_detail_id', terminationResponse.id);

        await API("/api/termination/documents", {
          method: "POST",
          body: formData
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error processing termination:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold mb-4">Termination Details</h3>
            
            <div className="bg-neutral-800 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Employee Information</h4>
              <div className="text-sm text-neutral-400">
                <div>Name: {employee.first_name} {employee.last_name}</div>
                <div>Department: {employee.department_name}</div>
                <div>Hire Date: {new Date(employee.hire_date).toLocaleDateString()}</div>
                <div>Years of Service: {Math.floor((new Date() - new Date(employee.hire_date)) / (1000 * 60 * 60 * 24 * 365))}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Termination Date *</label>
                <input
                  type="date"
                  required
                  value={formData.termination_date}
                  onChange={(e) => setFormData({...formData, termination_date: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Termination Type *</label>
                <select
                  required
                  value={formData.termination_type}
                  onChange={(e) => setFormData({...formData, termination_type: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Type</option>
                  <option value="Voluntary">Voluntary (Resignation)</option>
                  <option value="Involuntary">Involuntary (Termination)</option>
                  <option value="Retirement">Retirement</option>
                  <option value="End of Contract">End of Contract</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Reason Category</label>
                <select
                  value={formData.reason_category}
                  onChange={(e) => setFormData({...formData, reason_category: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Category</option>
                  <option value="Performance">Performance</option>
                  <option value="Conduct">Conduct</option>
                  <option value="Redundancy">Redundancy</option>
                  <option value="Resignation">Resignation</option>
                  <option value="Health">Health</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Initiated By *</label>
                <select
                  required
                  value={formData.initiated_by}
                  onChange={(e) => setFormData({...formData, initiated_by: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select</option>
                  <option value="Employee">Employee</option>
                  <option value="Employer">Employer</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Termination Reason *</label>
              <textarea
                required
                value={formData.termination_reason}
                onChange={(e) => setFormData({...formData, termination_reason: e.target.value})}
                placeholder="Provide detailed reason for termination..."
                rows={3}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Notice Period (Days)</label>
                <input
                  type="number"
                  value={formData.notice_period_days}
                  onChange={(e) => setFormData({...formData, notice_period_days: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Working Day</label>
                <input
                  type="date"
                  value={formData.last_working_day}
                  onChange={(e) => setFormData({...formData, last_working_day: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold mb-4">Financial & Benefits</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Final Pay Date</label>
                <input
                  type="date"
                  value={formData.final_pay_date}
                  onChange={(e) => setFormData({...formData, final_pay_date: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Benefits End Date</label>
                <input
                  type="date"
                  value={formData.benefits_end_date}
                  onChange={(e) => setFormData({...formData, benefits_end_date: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="bg-neutral-800 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Severance Package</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.severance_paid}
                    onChange={(e) => setFormData({...formData, severance_paid: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 bg-neutral-700 border-neutral-600 rounded focus:ring-indigo-500"
                  />
                  <label className="text-sm">Severance Paid</label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Severance Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.severance_amount}
                    onChange={(e) => setFormData({...formData, severance_amount: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Vacation Payout ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.vacation_payout}
                onChange={(e) => setFormData({...formData, vacation_payout: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Final Pay Notes</label>
              <textarea
                value={formData.final_pay_notes}
                onChange={(e) => setFormData({...formData, final_pay_notes: e.target.value})}
                placeholder="Additional notes about final pay calculation..."
                rows={3}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold mb-4">Exit Process</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Exit Interview Date</label>
                <input
                  type="date"
                  value={formData.exit_interview_date}
                  onChange={(e) => setFormData({...formData, exit_interview_date: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Conducted By</label>
                <input
                  type="text"
                  value={formData.exit_interview_conducted_by}
                  onChange={(e) => setFormData({...formData, exit_interview_conducted_by: e.target.value})}
                  placeholder="HR Manager name"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Exit Interview Notes</label>
              <textarea
                value={formData.exit_interview_notes}
                onChange={(e) => setFormData({...formData, exit_interview_notes: e.target.value})}
                placeholder="Key points from exit interview..."
                rows={3}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="bg-neutral-800 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Equipment Return</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.equipment_returned}
                    onChange={(e) => setFormData({...formData, equipment_returned: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 bg-neutral-700 border-neutral-600 rounded focus:ring-indigo-500"
                  />
                  <label className="text-sm">Equipment Returned</label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Return Date</label>
                  <input
                    type="date"
                    value={formData.equipment_return_date}
                    onChange={(e) => setFormData({...formData, equipment_return_date: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium mb-2">Equipment Return Notes</label>
                <textarea
                  value={formData.equipment_return_notes}
                  onChange={(e) => setFormData({...formData, equipment_return_notes: e.target.value})}
                  placeholder="List of returned equipment..."
                  rows={2}
                  className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="bg-neutral-800 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Access Revocation</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.access_revoked}
                    onChange={(e) => setFormData({...formData, access_revoked: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 bg-neutral-700 border-neutral-600 rounded focus:ring-indigo-500"
                  />
                  <label className="text-sm">Access Revoked</label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Revocation Date</label>
                  <input
                    type="date"
                    value={formData.access_revoked_date}
                    onChange={(e) => setFormData({...formData, access_revoked_date: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold mb-4">Documentation</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Termination Letter</label>
                <div className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload('termination_letter', e.target.files[0])}
                    className="hidden"
                    id="termination-letter-upload"
                  />
                  <label htmlFor="termination-letter-upload" className="cursor-pointer">
                    <div className="text-4xl mb-2">📄</div>
                    <p className="text-neutral-400">
                      {formData.termination_letter ? formData.termination_letter.name : "Click to upload termination letter"}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">PDF, DOC, or DOCX files</p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Release Agreement</label>
                <div className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload('release_agreement', e.target.files[0])}
                    className="hidden"
                    id="release-agreement-upload"
                  />
                  <label htmlFor="release-agreement-upload" className="cursor-pointer">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-neutral-400">
                      {formData.release_agreement ? formData.release_agreement.name : "Click to upload release agreement"}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">PDF, DOC, or DOCX files</p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ROE (Record of Employment)</label>
                <div className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload('roe_document', e.target.files[0])}
                    className="hidden"
                    id="roe-upload"
                  />
                  <label htmlFor="roe-upload" className="cursor-pointer">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-neutral-400">
                      {formData.roe_document ? formData.roe_document.name : "Click to upload ROE"}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">PDF, DOC, or DOCX files</p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Final Pay Statement</label>
                <div className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload('final_pay_statement', e.target.files[0])}
                    className="hidden"
                    id="final-pay-upload"
                  />
                  <label htmlFor="final-pay-upload" className="cursor-pointer">
                    <div className="text-4xl mb-2">💰</div>
                    <p className="text-neutral-400">
                      {formData.final_pay_statement ? formData.final_pay_statement.name : "Click to upload final pay statement"}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">PDF, DOC, or DOCX files</p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Exit Interview Form</label>
                <div className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload('exit_interview_form', e.target.files[0])}
                    className="hidden"
                    id="exit-interview-upload"
                  />
                  <label htmlFor="exit-interview-upload" className="cursor-pointer">
                    <div className="text-4xl mb-2">📝</div>
                    <p className="text-neutral-400">
                      {formData.exit_interview_form ? formData.exit_interview_form.name : "Click to upload exit interview form"}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">PDF, DOC, or DOCX files</p>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold mb-4">Review & Submit</h3>
            
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Termination Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-neutral-400">Date:</span> {formData.termination_date}</div>
                    <div><span className="text-neutral-400">Type:</span> {formData.termination_type}</div>
                    <div><span className="text-neutral-400">Category:</span> {formData.reason_category}</div>
                    <div><span className="text-neutral-400">Initiated By:</span> {formData.initiated_by}</div>
                  </div>
                </div>
                
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Financial Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-neutral-400">Severance:</span> ${formData.severance_amount}</div>
                    <div><span className="text-neutral-400">Vacation Payout:</span> ${formData.vacation_payout}</div>
                    <div><span className="text-neutral-400">Final Pay Date:</span> {formData.final_pay_date}</div>
                    <div><span className="text-neutral-400">Benefits End:</span> {formData.benefits_end_date}</div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-800 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Exit Process Status</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-neutral-400">Exit Interview:</span> {formData.exit_interview_date || 'Not scheduled'}</div>
                  <div><span className="text-neutral-400">Equipment Returned:</span> {formData.equipment_returned ? 'Yes' : 'No'}</div>
                  <div><span className="text-neutral-400">Access Revoked:</span> {formData.access_revoked ? 'Yes' : 'No'}</div>
                  <div><span className="text-neutral-400">Documents Uploaded:</span> {
                    [formData.termination_letter, formData.release_agreement, formData.roe_document, formData.final_pay_statement, formData.exit_interview_form]
                    .filter(Boolean).length
                  } / 5</div>
                </div>
              </div>

              <div className="bg-neutral-800 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Termination Reason</h4>
                <p className="text-sm text-neutral-300">{formData.termination_reason}</p>
              </div>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.reviewed}
                  onChange={(e) => setFormData({...formData, reviewed: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 bg-neutral-700 border-neutral-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm">I confirm all termination information is correct and complete</span>
              </label>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Employee Offboarding</h2>
              <p className="text-neutral-400">Complete termination process for {employee.first_name} {employee.last_name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'bg-red-600 border-red-600 text-white' 
                    : 'border-neutral-600 text-neutral-400'
                }`}>
                  {currentStep > step.id ? '✓' : step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-red-600' : 'bg-neutral-600'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-4 py-2 text-neutral-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            
            {currentStep < 5 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!formData.reviewed || loading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-neutral-600 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Processing...' : 'Complete Termination'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

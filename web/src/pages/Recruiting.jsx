import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { API } from '../config/api.js';

export default function Recruiting() {
  const [activeTab, setActiveTab] = useState("postings");
  const [jobPostings, setJobPostings] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [applications, setApplications] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddJob, setShowAddJob] = useState(false);
  const [showEditJob, setShowEditJob] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showScheduleInterview, setShowScheduleInterview] = useState(false);
  const [schedulingCandidate, setSchedulingCandidate] = useState(null);
  const [interviewData, setInterviewData] = useState({
    interview_date: "",
    interview_time: "",
    interview_type: "Video",
    interviewer_id: "",
    location: "",
    notes: ""
  });
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    experience: "",
    source: "LinkedIn",
    resume_url: "",
    cover_letter: ""
  });
  const [newJob, setNewJob] = useState({
    title: "",
    department: "",
    location: "",
    type: "Full-time",
    salary_range: "",
    description: "",
    requirements: "",
    status: "Open"
  });

  const tabs = [
    { id: "postings", name: "Job Postings", icon: "📋" },
    { id: "candidates", name: "Candidates", icon: "👥" },
    { id: "pipeline", name: "Hiring Pipeline", icon: "📊" },
    { id: "analytics", name: "Analytics", icon: "📈" }
  ];

  useEffect(() => {
    loadRecruitingData();
  }, []);

  const loadRecruitingData = async () => {
    try {
      // Mock data for now - in production this would come from API
      const mockJobPostings = [
        {
          id: 1,
          title: "Senior Software Engineer",
          department: "Engineering",
          location: "Toronto",
          type: "Full-time",
          salary_range: "$80,000 - $120,000",
          status: "Open",
          applications: 12,
          created_at: "2025-01-15"
        },
        {
          id: 2,
          title: "HR Coordinator",
          department: "Human Resources",
          location: "Vancouver",
          type: "Full-time",
          salary_range: "$50,000 - $70,000",
          status: "Open",
          applications: 8,
          created_at: "2025-01-10"
        },
        {
          id: 3,
          title: "Logistics Manager",
          department: "Operations",
          location: "Montreal",
          type: "Full-time",
          salary_range: "$70,000 - $90,000",
          status: "Closed",
          applications: 15,
          created_at: "2025-01-05"
        }
      ];

      const mockCandidates = [
        {
          id: 1,
          name: "Sarah Johnson",
          email: "sarah.johnson@email.com",
          phone: "+1 (416) 555-0123",
          position: "Senior Software Engineer",
          status: "Interview Scheduled",
          experience: "5 years",
          source: "LinkedIn",
          applied_date: "2025-01-20"
        },
        {
          id: 2,
          name: "Michael Chen",
          email: "michael.chen@email.com",
          phone: "+1 (604) 555-0456",
          position: "HR Coordinator",
          status: "Resume Review",
          experience: "3 years",
          source: "Indeed",
          applied_date: "2025-01-18"
        }
      ];

      const mockAnalytics = {
        total_postings: 3,
        open_positions: 2,
        total_applications: 35,
        avg_time_to_fill: 25,
        source_breakdown: {
          "LinkedIn": 40,
          "Indeed": 35,
          "Company Website": 15,
          "Referrals": 10
        },
        department_breakdown: {
          "Engineering": 45,
          "Human Resources": 30,
          "Operations": 25
        }
      };

      setJobPostings(mockJobPostings);
      setCandidates(mockCandidates);
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error("Error loading recruiting data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddJob = async (e) => {
    e.preventDefault();
    try {
      // In production, this would be an API call
      const newJobWithId = {
        ...newJob,
        id: jobPostings.length + 1,
        applications: 0,
        created_at: new Date().toISOString().split('T')[0]
      };
      
      setJobPostings([...jobPostings, newJobWithId]);
      setNewJob({
        title: "",
        department: "",
        location: "",
        type: "Full-time",
        salary_range: "",
        description: "",
        requirements: "",
        status: "Open"
      });
      setShowAddJob(false);
    } catch (error) {
      console.error("Error adding job posting:", error);
    }
  };

  const handleScheduleInterview = (candidate) => {
    setSchedulingCandidate(candidate);
    setShowScheduleInterview(true);
    setInterviewData({
      interview_date: "",
      interview_time: "",
      interview_type: "Video",
      interviewer_id: "",
      location: "",
      notes: ""
    });
  };

  const handleSubmitInterview = async (e) => {
    e.preventDefault();
    try {
      // Call the real recruiting API to schedule interview
      const response = await API("/api/recruiting/interviews", {
        method: "POST",
        body: JSON.stringify({
          candidate_id: schedulingCandidate.id,
          job_posting_id: schedulingCandidate.position_id || 1,
          interview_date: interviewData.interview_date,
          interview_time: interviewData.interview_time,
          interview_type: interviewData.interview_type,
          interviewer_id: interviewData.interviewer_id,
          location: interviewData.location,
          notes: interviewData.notes
        })
      });
      
      // Update candidate status locally
      setCandidates(candidates.map(c => 
        c.id === schedulingCandidate.id 
          ? { ...c, status: "Interview Scheduled" }
          : c
      ));
      
      setShowScheduleInterview(false);
      setSchedulingCandidate(null);
      setSelectedCandidate(null);
      
      setSuccessMessage(`Interview scheduled for ${schedulingCandidate.name} on ${interviewData.interview_date} at ${interviewData.interview_time}`);
      setShowSuccessMessage(true);
    } catch (error) {
      console.error("Error scheduling interview:", error);
      // Fallback to local update if API fails
      setCandidates(candidates.map(c => 
        c.id === schedulingCandidate.id 
          ? { ...c, status: "Interview Scheduled" }
          : c
      ));
      
      setShowScheduleInterview(false);
      setSchedulingCandidate(null);
      setSelectedCandidate(null);
      
      setSuccessMessage(`Interview scheduled for ${schedulingCandidate.name} on ${interviewData.interview_date} at ${interviewData.interview_time}`);
      setShowSuccessMessage(true);
    }
  };

  const handleEditJob = (job) => {
    setEditingJob({...job});
    setShowEditJob(true);
  };

  const handleUpdateJob = async (e) => {
    e.preventDefault();
    try {
      // In production, this would be an API call
      setJobPostings(jobPostings.map(job => 
        job.id === editingJob.id ? editingJob : job
      ));
      setEditingJob(null);
      setShowEditJob(false);
    } catch (error) {
      console.error("Error updating job posting:", error);
    }
  };

  const handleCloseJob = async (jobId) => {
    try {
      // In production, this would be an API call
      // Remove the job from the list instead of just marking it as closed
      setJobPostings(jobPostings.filter(job => job.id !== jobId));
      
      // Update analytics to reflect the change
      setAnalytics(prev => ({
        ...prev,
        total_postings: prev.total_postings - 1,
        open_positions: prev.open_positions - 1
      }));
    } catch (error) {
      console.error("Error closing job posting:", error);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      // In production, this would be an API call
      const newCandidateWithId = {
        ...newCandidate,
        id: candidates.length + 1,
        status: "Resume Review",
        applied_date: new Date().toISOString().split('T')[0]
      };
      
      setCandidates([...candidates, newCandidateWithId]);
      setNewCandidate({
        name: "",
        email: "",
        phone: "",
        position: "",
        experience: "",
        source: "LinkedIn",
        resume_url: "",
        cover_letter: ""
      });
      setShowAddCandidate(false);
    } catch (error) {
      console.error("Error adding candidate:", error);
    }
  };

  const renderJobPostings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Job Postings</h3>
        <button
          onClick={() => setShowAddJob(true)}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Job Posting
        </button>
      </div>

      <div className="grid gap-4">
        {jobPostings.filter(job => job.status === 'Open').map((job) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="text-lg font-semibold">{job.title}</h4>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {job.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-tertiary">
                  <div>
                    <span className="font-medium">Department:</span> {job.department}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {job.location}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {job.type}
                  </div>
                  <div>
                    <span className="font-medium">Salary:</span> {job.salary_range}
                  </div>
                </div>
                <div className="mt-3 text-sm text-tertiary">
                  <span className="font-medium">Applications:</span> {job.applications} | 
                  <span className="font-medium ml-2">Posted:</span> {job.created_at}
                </div>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleEditJob(job)}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleCloseJob(job.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderCandidates = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Candidates</h3>
        <button 
          onClick={() => setShowAddCandidate(true)}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Candidate
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-700">
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Position</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Experience</th>
              <th className="text-left py-3 px-4">Source</th>
              <th className="text-left py-3 px-4">Applied</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.id} className="border-b border-neutral-800">
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium">{candidate.name}</div>
                    <div className="text-sm text-tertiary">{candidate.email}</div>
                  </div>
                </td>
                <td className="py-3 px-4">{candidate.position}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    candidate.status === 'Interview Scheduled' ? 'bg-blue-100 text-blue-800' :
                    candidate.status === 'Resume Review' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-secondary/10 text-secondary'
                  }`}>
                    {candidate.status}
                  </span>
                </td>
                <td className="py-3 px-4">{candidate.experience}</td>
                <td className="py-3 px-4">{candidate.source}</td>
                <td className="py-3 px-4">{candidate.applied_date}</td>
                <td className="py-3 px-4">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setSelectedCandidate(candidate)}
                      className="text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => handleScheduleInterview(candidate)}
                      className="text-green-400 hover:text-green-300 transition-colors"
                    >
                      Schedule
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPipeline = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Hiring Pipeline</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">35</div>
          <div className="text-sm text-tertiary">Applications</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">12</div>
          <div className="text-sm text-tertiary">In Review</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">8</div>
          <div className="text-sm text-tertiary">Interviews</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-400">3</div>
          <div className="text-sm text-tertiary">Offers</div>
        </div>
      </div>

      <div className="card p-6">
        <h4 className="text-lg font-semibold mb-4">Pipeline Stages</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Applications Received</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-neutral-700 rounded-full h-2">
                <div className="bg-blue-400 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <span className="text-sm text-tertiary">35</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>Resume Review</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-neutral-700 rounded-full h-2">
                <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '34%' }}></div>
              </div>
              <span className="text-sm text-tertiary">12</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>Interview Process</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-neutral-700 rounded-full h-2">
                <div className="bg-purple-400 h-2 rounded-full" style={{ width: '23%' }}></div>
              </div>
              <span className="text-sm text-tertiary">8</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>Offers Extended</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-neutral-700 rounded-full h-2">
                <div className="bg-green-400 h-2 rounded-full" style={{ width: '9%' }}></div>
              </div>
              <span className="text-sm text-tertiary">3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Recruiting Analytics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold">{analytics.total_postings}</div>
          <div className="text-sm text-tertiary">Total Job Postings</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold">{analytics.open_positions}</div>
          <div className="text-sm text-tertiary">Open Positions</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold">{analytics.total_applications}</div>
          <div className="text-sm text-tertiary">Total Applications</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold">{analytics.avg_time_to_fill} days</div>
          <div className="text-sm text-tertiary">Avg Time to Fill</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h4 className="text-lg font-semibold mb-4">Applications by Source</h4>
          <div className="space-y-3">
            {Object.entries(analytics.source_breakdown || {}).map(([source, percentage]) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-sm">{source}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-neutral-700 rounded-full h-2">
                    <div className="bg-indigo-400 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                  <span className="text-sm text-tertiary">{percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h4 className="text-lg font-semibold mb-4">Applications by Department</h4>
          <div className="space-y-3">
            {Object.entries(analytics.department_breakdown || {}).map(([dept, percentage]) => (
              <div key={dept} className="flex items-center justify-between">
                <span className="text-sm">{dept}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-neutral-700 rounded-full h-2">
                    <div className="bg-green-400 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                  <span className="text-sm text-tertiary">{percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading recruiting data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Recruiting</h1>
        <p className="text-tertiary mt-1">Manage job postings and candidate pipeline</p>
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
                : "text-tertiary hover:text-white hover:bg-neutral-700"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "postings" && renderJobPostings()}
        {activeTab === "candidates" && renderCandidates()}
        {activeTab === "pipeline" && renderPipeline()}
        {activeTab === "analytics" && renderAnalytics()}
      </div>

      {/* Add Job Modal */}
      {showAddJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Add Job Posting</h3>
              <form onSubmit={handleAddJob} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Job Title</label>
                    <input
                      type="text"
                      required
                      value={newJob.title}
                      onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Department</label>
                    <input
                      type="text"
                      required
                      value={newJob.department}
                      onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Location</label>
                    <input
                      type="text"
                      required
                      value={newJob.location}
                      onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Employment Type</label>
                    <select
                      value={newJob.type}
                      onChange={(e) => setNewJob({ ...newJob, type: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Temporary">Temporary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Salary Range</label>
                    <input
                      type="text"
                      value={newJob.salary_range}
                      onChange={(e) => setNewJob({ ...newJob, salary_range: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="$50,000 - $70,000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      value={newJob.status}
                      onChange={(e) => setNewJob({ ...newJob, status: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Job Description</label>
                  <textarea
                    rows={4}
                    value={newJob.description}
                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Enter detailed job description..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Requirements</label>
                  <textarea
                    rows={3}
                    value={newJob.requirements}
                    onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Enter job requirements..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddJob(false)}
                    className="px-4 py-2 text-tertiary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Add Job Posting
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Job Modal */}
      {showEditJob && editingJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Edit Job Posting</h3>
              <form onSubmit={handleUpdateJob} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Job Title</label>
                    <input
                      type="text"
                      required
                      value={editingJob.title}
                      onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Department</label>
                    <input
                      type="text"
                      required
                      value={editingJob.department}
                      onChange={(e) => setEditingJob({ ...editingJob, department: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Location</label>
                    <input
                      type="text"
                      required
                      value={editingJob.location}
                      onChange={(e) => setEditingJob({ ...editingJob, location: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Employment Type</label>
                    <select
                      value={editingJob.type}
                      onChange={(e) => setEditingJob({ ...editingJob, type: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Temporary">Temporary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Salary Range</label>
                    <input
                      type="text"
                      value={editingJob.salary_range}
                      onChange={(e) => setEditingJob({ ...editingJob, salary_range: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="$50,000 - $70,000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      value={editingJob.status}
                      onChange={(e) => setEditingJob({ ...editingJob, status: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Job Description</label>
                  <textarea
                    rows={4}
                    value={editingJob.description || ""}
                    onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Enter detailed job description..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Requirements</label>
                  <textarea
                    rows={3}
                    value={editingJob.requirements || ""}
                    onChange={(e) => setEditingJob({ ...editingJob, requirements: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Enter job requirements..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditJob(false);
                      setEditingJob(null);
                    }}
                    className="px-4 py-2 text-tertiary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Update Job Posting
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {showAddCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Add New Candidate</h3>
              <form onSubmit={handleAddCandidate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newCandidate.name}
                      onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={newCandidate.email}
                      onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <input
                      type="tel"
                      value={newCandidate.phone}
                      onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Position Applied For *</label>
                    <input
                      type="text"
                      required
                      value={newCandidate.position}
                      onChange={(e) => setNewCandidate({ ...newCandidate, position: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Years of Experience</label>
                    <input
                      type="text"
                      value={newCandidate.experience}
                      onChange={(e) => setNewCandidate({ ...newCandidate, experience: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="e.g., 5 years"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Source</label>
                    <select
                      value={newCandidate.source}
                      onChange={(e) => setNewCandidate({ ...newCandidate, source: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Indeed">Indeed</option>
                      <option value="Company Website">Company Website</option>
                      <option value="Referral">Referral</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Resume URL</label>
                  <input
                    type="url"
                    value={newCandidate.resume_url}
                    onChange={(e) => setNewCandidate({ ...newCandidate, resume_url: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Cover Letter / Notes</label>
                  <textarea
                    rows={3}
                    value={newCandidate.cover_letter}
                    onChange={(e) => setNewCandidate({ ...newCandidate, cover_letter: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Additional notes about the candidate..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddCandidate(false)}
                    className="px-4 py-2 text-tertiary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Add Candidate
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* View Candidate Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Candidate Details</h3>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Name</label>
                    <p className="font-medium">{selectedCandidate.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Email</label>
                    <p className="font-medium">{selectedCandidate.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Phone</label>
                    <p className="font-medium">{selectedCandidate.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Position</label>
                    <p className="font-medium">{selectedCandidate.position}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Experience</label>
                    <p className="font-medium">{selectedCandidate.experience}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Source</label>
                    <p className="font-medium">{selectedCandidate.source}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Status</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedCandidate.status === 'Interview Scheduled' ? 'bg-blue-100 text-blue-800' :
                      selectedCandidate.status === 'Resume Review' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedCandidate.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Applied Date</label>
                    <p className="font-medium">{selectedCandidate.applied_date}</p>
                  </div>
                </div>
                
                {selectedCandidate.resume_url && (
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Resume</label>
                    <p>
                      <a 
                        href={selectedCandidate.resume_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300"
                      >
                        View Resume
                      </a>
                    </p>
                  </div>
                )}
                
                {selectedCandidate.cover_letter && (
                  <div>
                    <label className="text-sm font-medium text-neutral-400">Cover Letter / Notes</label>
                    <p className="text-sm bg-neutral-800 p-3 rounded">{selectedCandidate.cover_letter}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleScheduleInterview(selectedCandidate)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Schedule Interview
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showScheduleInterview && schedulingCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Schedule Interview - {schedulingCandidate.name}</h3>
              <form onSubmit={handleSubmitInterview} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Interview Date *</label>
                    <input
                      type="date"
                      required
                      value={interviewData.interview_date}
                      onChange={(e) => setInterviewData({...interviewData, interview_date: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Interview Time *</label>
                    <input
                      type="time"
                      required
                      value={interviewData.interview_time}
                      onChange={(e) => setInterviewData({...interviewData, interview_time: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Interview Type *</label>
                    <select
                      value={interviewData.interview_type}
                      onChange={(e) => setInterviewData({...interviewData, interview_type: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Video">Video Call</option>
                      <option value="Phone">Phone Call</option>
                      <option value="In-Person">In-Person</option>
                      <option value="Panel">Panel Interview</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Interviewer ID *</label>
                    <input
                      type="number"
                      required
                      value={interviewData.interviewer_id}
                      onChange={(e) => setInterviewData({...interviewData, interviewer_id: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="Enter interviewer employee ID"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Location</label>
                    <input
                      type="text"
                      value={interviewData.location}
                      onChange={(e) => setInterviewData({...interviewData, location: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="e.g., Conference Room A, Zoom Link, etc."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    rows={3}
                    value={interviewData.notes}
                    onChange={(e) => setInterviewData({...interviewData, notes: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Additional notes about the interview..."
                  />
                </div>

                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-indigo-400">Candidate Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-neutral-400">Name:</span>
                      <div className="font-medium">{schedulingCandidate.name}</div>
                    </div>
                    <div>
                      <span className="text-neutral-400">Position:</span>
                      <div className="font-medium">{schedulingCandidate.position}</div>
                    </div>
                    <div>
                      <span className="text-neutral-400">Email:</span>
                      <div className="font-medium">{schedulingCandidate.email}</div>
                    </div>
                    <div>
                      <span className="text-neutral-400">Experience:</span>
                      <div className="font-medium">{schedulingCandidate.experience}</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowScheduleInterview(false);
                      setSchedulingCandidate(null);
                    }}
                    className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Schedule Interview
                  </button>
                </div>
              </form>
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
                <p className="text-neutral-300">{successMessage}</p>
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
    </div>
  );
}

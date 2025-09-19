import { Router } from "express";
import { q } from "../db.js";
import { z } from "zod";

const r = Router();

// Get all job postings
r.get("/job-postings", async (_req, res) => {
  try {
    const { rows } = await q(`
      SELECT jp.*, d.name as department_name, 
             COUNT(ja.id) as application_count
      FROM job_postings jp
      LEFT JOIN departments d ON jp.department_id = d.id
      LEFT JOIN job_applications ja ON jp.id = ja.job_posting_id
      GROUP BY jp.id, d.name
      ORDER BY jp.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all candidates
r.get("/candidates", async (_req, res) => {
  try {
    const { rows } = await q(`
      SELECT c.*, jp.title as position_title, d.name as department_name
      FROM candidates c
      LEFT JOIN job_postings jp ON c.position_id = jp.id
      LEFT JOIN departments d ON jp.department_id = d.id
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all job applications
r.get("/applications", async (_req, res) => {
  try {
    const { rows } = await q(`
      SELECT ja.*, c.name as candidate_name, c.email, c.phone,
             jp.title as job_title, d.name as department_name
      FROM job_applications ja
      JOIN candidates c ON ja.candidate_id = c.id
      JOIN job_postings jp ON ja.job_posting_id = jp.id
      LEFT JOIN departments d ON jp.department_id = d.id
      ORDER BY ja.applied_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create job posting
const jobPostingSchema = z.object({
  title: z.string(),
  department_id: z.number().int(),
  location: z.string(),
  employment_type: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']),
  salary_range: z.string(),
  description: z.string(),
  requirements: z.string(),
  status: z.enum(['Open', 'Closed', 'On Hold']).default('Open')
});

r.post("/job-postings", async (req, res) => {
  try {
    const data = jobPostingSchema.parse(req.body);
    const { rows } = await q(`
      INSERT INTO job_postings 
      (title, department_id, location, employment_type, salary_range, description, requirements, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [data.title, data.department_id, data.location, data.employment_type, data.salary_range, data.description, data.requirements, data.status]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create candidate
const candidateSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  position_id: z.number().int(),
  experience_years: z.number(),
  source: z.string(),
  resume_url: z.string().url().optional(),
  cover_letter: z.string().optional()
});

r.post("/candidates", async (req, res) => {
  try {
    const data = candidateSchema.parse(req.body);
    const { rows } = await q(`
      INSERT INTO candidates 
      (name, email, phone, position_id, experience_years, source, resume_url, cover_letter)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [data.name, data.email, data.phone, data.position_id, data.experience_years, data.source, data.resume_url, data.cover_letter]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Schedule interview
const interviewSchema = z.object({
  candidate_id: z.number().int(),
  job_posting_id: z.number().int(),
  interview_date: z.string(),
  interview_time: z.string(),
  interview_type: z.enum(['Phone', 'Video', 'In-person']),
  interviewer_id: z.number().int(),
  location: z.string().optional(),
  notes: z.string().optional()
});

r.post("/interviews", async (req, res) => {
  try {
    const data = interviewSchema.parse(req.body);
    const { rows } = await q(`
      INSERT INTO interviews 
      (candidate_id, job_posting_id, interview_date, interview_time, interview_type, interviewer_id, location, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [data.candidate_id, data.job_posting_id, data.interview_date, data.interview_time, data.interview_type, data.interviewer_id, data.location, data.notes]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get interviews
r.get("/interviews", async (_req, res) => {
  try {
    const { rows } = await q(`
      SELECT i.*, c.name as candidate_name, c.email, c.phone,
             jp.title as job_title, e.first_name, e.last_name as interviewer_name
      FROM interviews i
      JOIN candidates c ON i.candidate_id = c.id
      JOIN job_postings jp ON i.job_posting_id = jp.id
      JOIN employees e ON i.interviewer_id = e.id
      ORDER BY i.interview_date DESC, i.interview_time DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update candidate status
r.put("/candidates/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  
  try {
    const { rows } = await q(`
      UPDATE candidates 
      SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [status, notes, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recruiting analytics
r.get("/analytics", async (_req, res) => {
  try {
    const [jobStats, candidateStats, applicationStats, interviewStats] = await Promise.all([
      q(`SELECT 
          COUNT(*) as total_jobs,
          COUNT(*) FILTER (WHERE status = 'Open') as open_jobs,
          COUNT(*) FILTER (WHERE status = 'Closed') as closed_jobs
         FROM job_postings`),
      q(`SELECT 
          COUNT(*) as total_candidates,
          COUNT(*) FILTER (WHERE status = 'New') as new_candidates,
          COUNT(*) FILTER (WHERE status = 'Interview Scheduled') as interview_scheduled,
          COUNT(*) FILTER (WHERE status = 'Hired') as hired,
          COUNT(*) FILTER (WHERE status = 'Rejected') as rejected
         FROM candidates`),
      q(`SELECT 
          COUNT(*) as total_applications,
          AVG(EXTRACT(EPOCH FROM (applied_at - created_at))/86400) as avg_days_to_apply
         FROM job_applications ja
         JOIN job_postings jp ON ja.job_posting_id = jp.id`),
      q(`SELECT 
          COUNT(*) as total_interviews,
          COUNT(*) FILTER (WHERE interview_date >= CURRENT_DATE) as upcoming_interviews
         FROM interviews`)
    ]);
    
    res.json({
      job_postings: jobStats.rows[0],
      candidates: candidateStats.rows[0],
      applications: applicationStats.rows[0],
      interviews: interviewStats.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default r;

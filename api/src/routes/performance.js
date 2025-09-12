import { Router } from "express";
import { q } from "../db.js";
import { z } from "zod";
import { formatRating, formatNumber } from "../utils/formatting.js";

const r = Router();

// Get all performance reviews
r.get("/reviews", async (_req, res) => {
  const { rows } = await q(`
    SELECT pr.*, e.first_name, e.last_name, e.email, d.name as department
    FROM performance_reviews pr
    JOIN employees e ON pr.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    ORDER BY pr.review_date DESC
  `);
  res.json(rows);
});

// Get all performance goals
r.get("/goals", async (_req, res) => {
  const { rows } = await q(`
    SELECT pg.*, e.first_name, e.last_name, e.email, d.name as department
    FROM performance_goals pg
    JOIN employees e ON pg.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    ORDER BY pg.target_date DESC
  `);
  res.json(rows);
});

// Get employee performance reviews
r.get("/employee/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const [reviews, goals, metrics] = await Promise.all([
      q(`SELECT * FROM performance_reviews WHERE employee_id = $1 ORDER BY review_date DESC`, [id]),
      q(`SELECT * FROM performance_goals WHERE employee_id = $1 ORDER BY target_date DESC`, [id]),
      q(`SELECT * FROM performance_metrics WHERE employee_id = $1 ORDER BY recorded_date DESC`, [id])
    ]);
    
    res.json({
      reviews: reviews.rows,
      goals: goals.rows,
      metrics: metrics.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create performance review
const reviewSchema = z.object({
  employee_id: z.number().int(),
  reviewer_id: z.number().int(),
  review_date: z.string(),
  review_period: z.string(),
  overall_rating: z.number().min(1).max(5),
  strengths: z.string(),
  areas_for_improvement: z.string(),
  goals_for_next_period: z.string(),
  comments: z.string().optional()
});

r.post("/reviews", async (req, res) => {
  try {
    const data = reviewSchema.parse(req.body);
    const { rows } = await q(`
      INSERT INTO performance_reviews 
      (employee_id, reviewer_id, review_date, review_period, overall_rating, strengths, areas_for_improvement, goals_for_next_period, comments)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [data.employee_id, data.reviewer_id, data.review_date, data.review_period, data.overall_rating, data.strengths, data.areas_for_improvement, data.goals_for_next_period, data.comments]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create performance goal
const goalSchema = z.object({
  employee_id: z.number().int(),
  goal_title: z.string(),
  goal_description: z.string(),
  target_date: z.string(),
  priority: z.enum(['Low', 'Medium', 'High']),
  status: z.enum(['Not Started', 'In Progress', 'Completed', 'On Hold']).default('Not Started')
});

r.post("/goals", async (req, res) => {
  try {
    const data = goalSchema.parse(req.body);
    const { rows } = await q(`
      INSERT INTO performance_goals 
      (employee_id, goal_title, goal_description, target_date, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [data.employee_id, data.goal_title, data.goal_description, data.target_date, data.priority, data.status]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update goal status
r.put("/goals/:id", async (req, res) => {
  const { id } = req.params;
  const { status, completion_notes } = req.body;
  
  try {
    const { rows } = await q(`
      UPDATE performance_goals 
      SET status = $1, completion_notes = $2, completed_at = CASE WHEN $1 = 'Completed' THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id = $3
      RETURNING *
    `, [status, completion_notes, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Goal not found" });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record performance metrics
const metricSchema = z.object({
  employee_id: z.number().int(),
  metric_type: z.enum(['Sales', 'Hours', 'Quality', 'Attendance', 'Customer_Satisfaction']),
  metric_value: z.number(),
  target_value: z.number().optional(),
  recorded_date: z.string(),
  notes: z.string().optional()
});

r.post("/metrics", async (req, res) => {
  try {
    const data = metricSchema.parse(req.body);
    const { rows } = await q(`
      INSERT INTO performance_metrics 
      (employee_id, metric_type, metric_value, target_value, recorded_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [data.employee_id, data.metric_type, data.metric_value, data.target_value, data.recorded_date, data.notes]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get performance analytics
r.get("/analytics", async (_req, res) => {
  try {
    const [avgRating, reviewsByMonth, goalsByStatus, topPerformers] = await Promise.all([
      q(`SELECT ROUND(AVG(overall_rating), 2) as avg_rating FROM performance_reviews`),
      q(`SELECT DATE_TRUNC('month', review_date) as month, COUNT(*) as reviews
         FROM performance_reviews 
         WHERE review_date >= CURRENT_DATE - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', review_date)
         ORDER BY month`),
      q(`SELECT status, COUNT(*) as count FROM performance_goals GROUP BY status`),
      q(`SELECT e.first_name, e.last_name, AVG(pr.overall_rating) as avg_rating
         FROM performance_reviews pr
         JOIN employees e ON pr.employee_id = e.id
         GROUP BY e.id, e.first_name, e.last_name
         HAVING COUNT(pr.id) >= 2
         ORDER BY avg_rating DESC
         LIMIT 10`)
    ]);
    
    // Format top performers ratings
    const formattedTopPerformers = topPerformers.rows.map(performer => ({
      ...performer,
      avg_rating: formatRating(performer.avg_rating)
    }));

    res.json({
      average_rating: formatRating(avgRating.rows[0].avg_rating),
      reviews_by_month: reviewsByMonth.rows,
      goals_by_status: goalsByStatus.rows,
      top_performers: formattedTopPerformers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get 360 feedback
r.get("/360/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await q(`
      SELECT f.*, r.first_name as reviewer_first_name, r.last_name as reviewer_last_name
      FROM feedback_360 f
      JOIN employees r ON f.reviewer_id = r.id
      WHERE f.employee_id = $1
      ORDER BY f.created_at DESC
    `, [id]);
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit 360 feedback
const feedbackSchema = z.object({
  employee_id: z.number().int(),
  reviewer_id: z.number().int(),
  communication_rating: z.number().min(1).max(5),
  teamwork_rating: z.number().min(1).max(5),
  leadership_rating: z.number().min(1).max(5),
  problem_solving_rating: z.number().min(1).max(5),
  overall_rating: z.number().min(1).max(5),
  strengths: z.string(),
  areas_for_improvement: z.string(),
  comments: z.string().optional()
});

r.post("/360", async (req, res) => {
  try {
    const data = feedbackSchema.parse(req.body);
    const { rows } = await q(`
      INSERT INTO feedback_360 
      (employee_id, reviewer_id, communication_rating, teamwork_rating, leadership_rating, problem_solving_rating, overall_rating, strengths, areas_for_improvement, comments)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [data.employee_id, data.reviewer_id, data.communication_rating, data.teamwork_rating, data.leadership_rating, data.problem_solving_rating, data.overall_rating, data.strengths, data.areas_for_improvement, data.comments]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default r;

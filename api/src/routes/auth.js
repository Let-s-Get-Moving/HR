import express from "express";
import { z } from "zod";
import { q } from "../db.js";
import { SessionManager } from "../session.js";

const r = express.Router();

// Simple user store (in production, use database)
const users = [
  { id: 1, username: "Avneet", password: "password123" }
];

// Login schema
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

// Login endpoint
r.post("/login", async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    
    // Find user
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Create session
    const sessionId = SessionManager.createSession(user.id, user.username);
    
    // Set cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: false, // Allow JavaScript access
      secure: false, // Allow HTTP in development
      sameSite: 'lax', // More permissive for development
      maxAge: 30 * 60 * 1000, // 30 minutes
      path: '/' // Ensure cookie is available for all paths
    });
    
    res.json({
      message: "Login successful",
      user: { id: user.id, username: user.username },
      sessionId
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({ error: "Invalid request" });
  }
});

// Logout endpoint
r.post("/logout", (req, res) => {
  const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
  
  if (sessionId) {
    SessionManager.destroySession(sessionId);
  }
  
  res.clearCookie('sessionId');
  res.json({ message: "Logout successful" });
});

// Check session endpoint
r.get("/session", (req, res) => {
  const sessionId = req.cookies?.sessionId || 
                   req.headers.authorization?.replace('Bearer ', '') ||
                   req.headers['x-session-id'];
  
  console.log('Session check - cookies:', req.cookies);
  console.log('Session check - headers:', req.headers);
  console.log('Session check - sessionId:', sessionId);
  
  if (!sessionId) {
    return res.status(401).json({ error: "No session" });
  }
  
  const session = SessionManager.getSession(sessionId);
  
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  
  res.json({
    user: { id: session.userId, username: session.username },
    session: {
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastActivity: session.lastActivity
    }
  });
});

// Extend session endpoint
r.post("/extend", (req, res) => {
  const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionId) {
    return res.status(401).json({ error: "No session" });
  }
  
  const session = SessionManager.getSession(sessionId);
  
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  
  SessionManager.extendSession(sessionId);
  
  // Update cookie
  res.cookie('sessionId', sessionId, {
    httpOnly: false, // Allow JavaScript access in development
    secure: false, // Allow HTTP in development
    sameSite: 'lax', // More permissive for development
    maxAge: 30 * 60 * 1000 // 30 minutes
  });
  
  res.json({ message: "Session extended" });
});

export default r;

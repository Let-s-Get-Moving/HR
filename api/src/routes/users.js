/**
 * User Management Routes
 * CRUD operations for HR users (admin only)
 */

import express from "express";
import { UserManagementService } from "../services/user-management.js";
import { requireAuth } from "../session.js";

const r = express.Router();

// Middleware to check admin role
const requireAdmin = async (req, res, next) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const user = await UserManagementService.getUserById(userId);
  
  if (!user || user.role_name !== 'hr_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

// Get all users (admin only)
r.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await UserManagementService.getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
r.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await UserManagementService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove sensitive fields
    delete user.password_hash;
    
    res.json({ user });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID (admin only)
r.get("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await UserManagementService.getUserById(parseInt(req.params.id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    delete user.password_hash;
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new user (admin only)
r.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, first_name, last_name, password, role_id } = req.body;
    
    if (!email || !first_name || !last_name || !password || !role_id) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    const user = await UserManagementService.createUser({
      email,
      first_name,
      last_name,
      password,
      role_id
    }, req.user.id);
    
    // Log activity
    await UserManagementService.logActivity(
      req.user.id,
      'user_created',
      'users',
      user.id,
      { email: user.email }
    );
    
    delete user.password_hash;
    res.status(201).json({ user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user (admin only or self for basic fields)
r.put("/:id", requireAuth, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const currentUser = await UserManagementService.getUserById(req.user.id);
    
    // Only admin can update other users or change roles
    if (targetUserId !== req.user.id && currentUser.role_name !== 'hr_admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Non-admin cannot change role
    if (currentUser.role_name !== 'hr_admin' && req.body.role_id) {
      return res.status(403).json({ error: 'Cannot change role' });
    }
    
    const user = await UserManagementService.updateUser(targetUserId, req.body);
    
    await UserManagementService.logActivity(
      req.user.id,
      'user_updated',
      'users',
      targetUserId,
      req.body
    );
    
    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update password (self or admin)
r.put("/:id/password", requireAuth, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const currentUser = await UserManagementService.getUserById(req.user.id);
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'New password required' });
    }
    
    // Only admin can change other users' passwords
    if (targetUserId !== req.user.id && currentUser.role_name !== 'hr_admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    await UserManagementService.updatePassword(targetUserId, newPassword);
    
    await UserManagementService.logActivity(
      req.user.id,
      'password_changed',
      'users',
      targetUserId
    );
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deactivate user (admin only)
r.post("/:id/deactivate", requireAuth, requireAdmin, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    
    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate yourself' });
    }
    
    await UserManagementService.deactivateUser(targetUserId);
    
    await UserManagementService.logActivity(
      req.user.id,
      'user_deactivated',
      'users',
      targetUserId
    );
    
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reactivate user (admin only)
r.post("/:id/reactivate", requireAuth, requireAdmin, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    
    await UserManagementService.reactivateUser(targetUserId);
    
    await UserManagementService.logActivity(
      req.user.id,
      'user_reactivated',
      'users',
      targetUserId
    );
    
    res.json({ message: 'User reactivated successfully' });
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all roles
r.get("/roles/list", requireAuth, async (req, res) => {
  try {
    const roles = await UserManagementService.getRoles();
    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user activity log (admin only or self)
r.get("/:id/activity", requireAuth, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const currentUser = await UserManagementService.getUserById(req.user.id);
    
    if (targetUserId !== req.user.id && currentUser.role_name !== 'hr_admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const activity = await UserManagementService.getUserActivity(targetUserId);
    res.json({ activity });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default r;


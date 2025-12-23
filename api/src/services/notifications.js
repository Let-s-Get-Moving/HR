import { q } from '../db.js';
import { emailService } from './email.js';
import { parseLocalDate } from '../utils/dateUtils.js';

class NotificationService {
  // Check if user has email notifications enabled (default: true)
  async canSendEmail(userId) {
    if (!userId) return true; // Default enabled for non-logged users
    
    try {
      const result = await q(`
        SELECT value 
        FROM application_settings 
        WHERE key = 'email_notifications' 
          AND category = 'notifications' 
          AND user_id = $1
      `, [userId]);
      
      if (result.rows.length === 0) return true; // Default enabled
      
      const value = result.rows[0].value;
      return value === 'true' || value === true || value === 'ON';
    } catch (error) {
      console.error('Error checking email setting:', error);
      return true; // Default to enabled on error
    }
  }

  // Get employee work email
  async getEmployeeEmail(employeeId) {
    try {
      const result = await q(`
        SELECT work_email, email, first_name, last_name
        FROM employees
        WHERE id = $1
      `, [employeeId]);
      
      if (result.rows.length === 0) return null;
      
      const emp = result.rows[0];
      const emailAddress = emp.work_email || emp.email;
      
      if (!emailAddress) return null;
      
      return {
        email: emailAddress,
        name: `${emp.first_name} ${emp.last_name}`
      };
    } catch (error) {
      console.error(`Error getting employee email for ID ${employeeId}:`, error);
      return null;
    }
  }

  // Get user ID from employee ID
  async getUserIdFromEmployee(employeeId) {
    try {
      const result = await q(`
        SELECT id FROM users WHERE employee_id = $1
      `, [employeeId]);
      
      return result.rows[0]?.id || null;
    } catch (error) {
      console.error(`Error getting user from employee ID ${employeeId}:`, error);
      return null;
    }
  }

  // Get all active HR users
  async getHRUsers() {
    try {
      const result = await q(`
        SELECT u.id, u.email, u.full_name, u.employee_id
        FROM users u
        JOIN hr_roles r ON u.role_id = r.id
        WHERE r.role_name IN ('hr_admin', 'hr_manager', 'hr_user')
          AND u.is_active = true
          AND u.email IS NOT NULL
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting HR users:', error);
      return [];
    }
  }

  // Send leave request notification to HR (with full details)
  async notifyLeaveRequestSubmitted(leaveRequestId) {
    try {
      console.log(`📧 Sending leave request notification for ID ${leaveRequestId}`);
      
      const leaveResult = await q(`
        SELECT lr.*, e.first_name, e.last_name, e.work_email, e.email, lt.name as leave_type_name
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.id = $1
      `, [leaveRequestId]);
      
      if (leaveResult.rows.length === 0) {
        console.warn(`Leave request ${leaveRequestId} not found`);
        return;
      }
      
      const leave = leaveResult.rows[0];
      const employeeName = `${leave.first_name} ${leave.last_name}`;
      const leaveType = leave.leave_type_name || 'Leave';
      const totalDays = leave.total_days || 'N/A';
      
      // Format dates
      const startDateObj = parseLocalDate(leave.start_date) || new Date(leave.start_date);
      const endDateObj = parseLocalDate(leave.end_date) || new Date(leave.end_date);
      const startDate = startDateObj.toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric' 
      });
      const endDate = endDateObj.toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric' 
      });
      
      // Get all HR users
      const hrUsers = await this.getHRUsers();
      
      if (hrUsers.length === 0) {
        console.warn('No HR users found to notify');
        return;
      }
      
      for (const hrUser of hrUsers) {
        const canSend = await this.canSendEmail(hrUser.id);
        if (!canSend) {
          console.log(`Skipping email to ${hrUser.email} (notifications disabled)`);
          continue;
        }
        
        const subject = `Leave Request: ${employeeName} - ${leaveType}`;
        const message = `${employeeName} submitted a ${leaveType} request.

Details:
- Dates: ${startDate} to ${endDate}
- Duration: ${totalDays} day(s)
- Reason: ${leave.reason || 'Not provided'}${leave.notes ? `\n- Additional Notes: ${leave.notes}` : ''}

Please review and approve or reject this request in the HR system.

HR System`;
        
        await emailService.send({
          to: hrUser.email,
          subject,
          textContent: message
        });
      }
    } catch (error) {
      console.error('Error in notifyLeaveRequestSubmitted:', error);
    }
  }

  // Send leave decision notification to employee
  async notifyLeaveRequestDecision(leaveRequestId, decision, approvedByName) {
    try {
      console.log(`📧 Sending leave decision notification for ID ${leaveRequestId}`);
      
      const leaveResult = await q(`
        SELECT lr.*, e.first_name, e.last_name, e.work_email, e.email, e.id as employee_id, lt.name as leave_type_name
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.id = $1
      `, [leaveRequestId]);
      
      if (leaveResult.rows.length === 0) return;
      
      const leave = leaveResult.rows[0];
      const employeeEmail = leave.work_email || leave.email;
      
      if (!employeeEmail) {
        console.warn(`No email for employee ID ${leave.employee_id}`);
        return;
      }
      
      // Get user ID and check settings
      const userId = await this.getUserIdFromEmployee(leave.employee_id);
      if (userId) {
        const canSend = await this.canSendEmail(userId);
        if (!canSend) {
          console.log(`Skipping email to ${employeeEmail} (notifications disabled)`);
          return;
        }
      }
      
      const leaveType = leave.leave_type_name || 'leave';
      const startDateObj = parseLocalDate(leave.start_date) || new Date(leave.start_date);
      const endDateObj = parseLocalDate(leave.end_date) || new Date(leave.end_date);
      const startDate = startDateObj.toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric' 
      });
      const endDate = endDateObj.toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric' 
      });
      
      const subject = decision === 'Approved' 
        ? `Leave Request Approved - ${leaveType}`
        : `Leave Request ${decision} - ${leaveType}`;
      
      const message = `Your ${leaveType} request for ${startDate} to ${endDate} has been ${decision.toLowerCase()}${approvedByName ? ` by ${approvedByName}` : ''}.

${decision === 'Approved' ? 'Enjoy your time off!' : 'If you have questions, please contact HR.'}

HR System`;
      
      await emailService.send({
        to: employeeEmail,
        subject,
        textContent: message
      });
    } catch (error) {
      console.error('Error in notifyLeaveRequestDecision:', error);
    }
  }

  // Send new employee notification to HR
  async notifyNewEmployee(employeeId) {
    try {
      const empInfo = await this.getEmployeeEmail(employeeId);
      if (!empInfo) return;
      
      const hrUsers = await this.getHRUsers();
      
      for (const hrUser of hrUsers) {
        const canSend = await this.canSendEmail(hrUser.id);
        if (!canSend) continue;
        
        const subject = `New Employee: ${empInfo.name}`;
        const message = `A new employee has been added to the HR system.

Name: ${empInfo.name}
Email: ${empInfo.email}

HR System`;
        
        await emailService.send({
          to: hrUser.email,
          subject,
          textContent: message
        });
      }
    } catch (error) {
      console.error('Error in notifyNewEmployee:', error);
    }
  }

  // Send termination notification to HR
  async notifyEmployeeTermination(employeeId, terminationDate) {
    try {
      const empInfo = await this.getEmployeeEmail(employeeId);
      if (!empInfo) return;
      
      const hrUsers = await this.getHRUsers();
      const dateObj = parseLocalDate(terminationDate) || new Date(terminationDate);
      const formattedDate = dateObj.toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric' 
      });
      
      for (const hrUser of hrUsers) {
        const canSend = await this.canSendEmail(hrUser.id);
        if (!canSend) continue;
        
        const subject = `Employee Termination: ${empInfo.name}`;
        const message = `Employee ${empInfo.name} has been terminated.

Termination Date: ${formattedDate}

HR System`;
        
        await emailService.send({
          to: hrUser.email,
          subject,
          textContent: message
        });
      }
    } catch (error) {
      console.error('Error in notifyEmployeeTermination:', error);
    }
  }
}

export const notificationService = new NotificationService();


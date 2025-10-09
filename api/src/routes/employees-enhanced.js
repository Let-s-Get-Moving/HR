/**
 * ENHANCED EMPLOYEES ROUTE WITH COMPREHENSIVE VALIDATION
 * 
 * This is an example of how to implement the new validation system
 * in existing routes. It shows:
 * 1. Schema validation
 * 2. Business rule validation
 * 3. Database constraint validation
 * 4. File upload validation
 * 5. User-friendly error responses
 */

import { Router } from "express";
import { q } from "../db.js";
import { createValidationMiddleware, createFileValidationMiddleware, businessRules, dbConstraints } from "../middleware/validation.js";
import { enhancedEmployeeSchema } from "../schemas/enhancedSchemas.js";
import multer from "multer";

const r = Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Get all employees
r.get("/", async (_req, res) => {
  try {
    const { rows } = await q(`
      SELECT e.*, 
       e.first_name || ' ' || e.last_name AS name,
       d.name AS department, 
       l.name AS location
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN locations l ON l.id = e.location_id
       WHERE e.status <> 'Terminated'
       ORDER BY e.first_name, e.last_name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Get departments
r.get("/departments", async (_req, res) => {
  try {
    const { rows } = await q(`SELECT * FROM departments ORDER BY name`);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get locations
r.get("/locations", async (_req, res) => {
  try {
    const { rows } = await q(`SELECT * FROM locations WHERE is_active = true ORDER BY name`);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Create new employee with comprehensive validation
r.post("/", 
  createValidationMiddleware(enhancedEmployeeSchema, {
    businessRules: [
      businessRules.hireDateBeforeTermination,
      businessRules.notInFuture('hire_date')
    ],
    dbConstraints: [
      dbConstraints.departmentExists,
      dbConstraints.locationExists,
      dbConstraints.uniqueEmail
    ]
  }),
  async (req, res) => {
    try {
      const data = req.validatedData; // Already validated and sanitized
      
      console.log('✅ [EMPLOYEES] Creating employee with validated data:', {
        name: `${data.first_name} ${data.last_name}`,
        email: data.email,
        department_id: data.department_id
      });
      
      const { rows } = await q(`
        INSERT INTO employees
        (first_name, last_name, email, phone, gender, birth_date, hire_date, 
         employment_type, department_id, location_id, role_title, probation_end, 
         hourly_rate, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [
        data.first_name, data.last_name, data.email, data.phone || null,
        data.gender || null, data.birth_date || null, data.hire_date,
        data.employment_type, data.department_id || null, data.location_id || null,
        data.role_title || null, data.probation_end || null, 
        data.hourly_rate || 25, data.status
      ]);
      
      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: rows[0]
      });
      
    } catch (error) {
      console.error('Error creating employee:', error);
      res.status(500).json({ 
        error: 'Failed to create employee',
        details: error.message 
      });
    }
  }
);

// Update employee with validation
r.put("/:id",
  createValidationMiddleware(enhancedEmployeeSchema, {
    businessRules: [
      businessRules.hireDateBeforeTermination,
      businessRules.notInFuture('hire_date')
    ],
    dbConstraints: [
      dbConstraints.departmentExists,
      dbConstraints.locationExists,
      dbConstraints.uniqueEmail
    ]
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.validatedData;
      
      // Check if employee exists
      const { rows: existingEmployee } = await q(
        'SELECT id FROM employees WHERE id = $1',
        [id]
      );
      
      if (existingEmployee.length === 0) {
        return res.status(404).json({
          error: 'Employee not found',
          details: `No employee found with ID ${id}`
        });
      }
      
      console.log('✅ [EMPLOYEES] Updating employee with validated data:', {
        id,
        name: `${data.first_name} ${data.last_name}`,
        email: data.email
      });
      
      const { rows } = await q(`
        UPDATE employees 
        SET first_name = $1, last_name = $2, email = $3, phone = $4, 
            role_title = $5, hourly_rate = $6, employment_type = $7,
            department_id = $8, location_id = $9, hire_date = $10,
            gender = $11, birth_date = $12, status = $13, probation_end = $14,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $15
        RETURNING *
      `, [
        data.first_name, data.last_name, data.email, data.phone || null,
        data.role_title || null, data.hourly_rate || 25, data.employment_type,
        data.department_id || null, data.location_id || null, data.hire_date,
        data.gender || null, data.birth_date || null, data.status, 
        data.probation_end || null, id
      ]);
      
      res.json({
        success: true,
        message: 'Employee updated successfully',
        data: rows[0]
      });
      
    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({ 
        error: 'Failed to update employee',
        details: error.message 
      });
    }
  }
);

// Delete employee (soft delete)
r.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if employee exists
    const { rows: existingEmployee } = await q(
      'SELECT id, first_name, last_name FROM employees WHERE id = $1',
      [id]
    );
    
    if (existingEmployee.length === 0) {
      return res.status(404).json({
        error: 'Employee not found',
        details: `No employee found with ID ${id}`
      });
    }
    
    console.log('✅ [EMPLOYEES] Terminating employee:', {
      id,
      name: `${existingEmployee[0].first_name} ${existingEmployee[0].last_name}`
    });
    
    await q(`
      UPDATE employees 
      SET status = 'Terminated', 
          termination_date = CURRENT_DATE,
          termination_reason = 'Terminated via HR system',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
    
    res.json({
      success: true,
      message: 'Employee terminated successfully'
    });
    
  } catch (error) {
    console.error('Error terminating employee:', error);
    res.status(500).json({ 
      error: 'Failed to terminate employee',
      details: error.message 
    });
  }
});

// Upload employee photo with validation
r.post("/:id/photo",
  upload.single('photo'),
  createFileValidationMiddleware({
    required: true,
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    contentValidation: 'image'
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const file = req.file;
      
      // Check if employee exists
      const { rows: existingEmployee } = await q(
        'SELECT id, first_name, last_name FROM employees WHERE id = $1',
        [id]
      );
      
      if (existingEmployee.length === 0) {
        return res.status(404).json({
          error: 'Employee not found',
          details: `No employee found with ID ${id}`
        });
      }
      
      console.log('✅ [EMPLOYEES] Uploading photo for employee:', {
        id,
        name: `${existingEmployee[0].first_name} ${existingEmployee[0].last_name}`,
        fileName: file.originalname,
        fileSize: file.size
      });
      
      // In a real application, you would:
      // 1. Save the file to a secure location (AWS S3, etc.)
      // 2. Generate a secure URL
      // 3. Update the employee record with the photo URL
      
      // For now, just simulate success
      res.json({
        success: true,
        message: 'Photo uploaded successfully',
        data: {
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype
        }
      });
      
    } catch (error) {
      console.error('Error uploading photo:', error);
      res.status(500).json({ 
        error: 'Failed to upload photo',
        details: error.message 
      });
    }
  }
);

// Bulk import employees from CSV
r.post("/bulk-import",
  upload.single('csv_file'),
  createFileValidationMiddleware({
    required: true,
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['text/csv', 'application/csv'],
    allowedExtensions: ['csv'],
    contentValidation: 'csv'
  }),
  async (req, res) => {
    try {
      const file = req.file;
      
      console.log('✅ [EMPLOYEES] Starting bulk import:', {
        fileName: file.originalname,
        fileSize: file.size
      });
      
      // Parse CSV content
      const csvContent = file.buffer.toString('utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({
          error: 'Invalid CSV file',
          details: 'CSV file must have at least a header row and one data row'
        });
      }
      
      const headers = lines[0].split(',').map(h => h.trim());
      const dataRows = lines.slice(1);
      
      console.log('📊 [EMPLOYEES] CSV parsed:', {
        headers,
        rowCount: dataRows.length
      });
      
      // Validate each row
      const validationErrors = [];
      const validRows = [];
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i].split(',').map(cell => cell.trim());
        const rowData = {};
        
        // Map CSV columns to employee fields
        headers.forEach((header, index) => {
          const value = row[index] || '';
          switch (header.toLowerCase()) {
            case 'first_name':
            case 'firstname':
              rowData.first_name = value;
              break;
            case 'last_name':
            case 'lastname':
              rowData.last_name = value;
              break;
            case 'email':
              rowData.email = value;
              break;
            case 'phone':
              rowData.phone = value;
              break;
            case 'hire_date':
            case 'hiredate':
              rowData.hire_date = value;
              break;
            case 'employment_type':
            case 'type':
              rowData.employment_type = value;
              break;
            case 'department_id':
            case 'department':
              rowData.department_id = value ? Number(value) : null;
              break;
            case 'hourly_rate':
            case 'rate':
              rowData.hourly_rate = value ? Number(value) : null;
              break;
          }
        });
        
        // Validate row data
        const validation = enhancedEmployeeSchema.safeParse(rowData);
        if (!validation.success) {
          validationErrors.push({
            row: i + 2, // +2 because CSV is 1-indexed and we skipped header
            errors: validation.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          });
        } else {
          validRows.push(validation.data);
        }
      }
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'CSV validation failed',
          details: 'Some rows contain invalid data',
          validationErrors,
          validRowCount: validRows.length,
          totalRowCount: dataRows.length
        });
      }
      
      // Insert valid rows
      let insertedCount = 0;
      const insertedEmployees = [];
      
      for (const employeeData of validRows) {
        try {
          const { rows } = await q(`
            INSERT INTO employees
            (first_name, last_name, email, phone, hire_date, employment_type, 
             department_id, hourly_rate, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, first_name, last_name, email
          `, [
            employeeData.first_name, employeeData.last_name, employeeData.email,
            employeeData.phone || null, employeeData.hire_date, employeeData.employment_type,
            employeeData.department_id || null, employeeData.hourly_rate || 25, 'Active'
          ]);
          
          insertedEmployees.push(rows[0]);
          insertedCount++;
        } catch (error) {
          console.error(`Error inserting employee ${employeeData.email}:`, error);
          // Continue with other employees
        }
      }
      
      res.json({
        success: true,
        message: `Bulk import completed successfully`,
        data: {
          totalRows: dataRows.length,
          insertedCount,
          insertedEmployees: insertedEmployees.slice(0, 10), // Show first 10
          summary: `${insertedCount} employees imported successfully`
        }
      });
      
    } catch (error) {
      console.error('Error in bulk import:', error);
      res.status(500).json({ 
        error: 'Bulk import failed',
        details: error.message 
      });
    }
  }
);

export default r;

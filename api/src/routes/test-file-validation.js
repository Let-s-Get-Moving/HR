/**
 * TEST FILE VALIDATION ENDPOINT
 * This endpoint allows testing file validation without authentication
 * FOR TESTING PURPOSES ONLY - DO NOT USE IN PRODUCTION
 */

import { Router } from "express";
import multer from "multer";
import { validateFileContent } from '../utils/fileValidation.js';

const r = Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Test file validation endpoint (NO AUTH REQUIRED)
r.post("/test-validation", upload.single('file'), async (req, res) => {
  try {
    console.log('🔍 [TEST] Received request:', {
      hasFile: !!req.file,
      body: req.body,
      files: req.files
    });
    
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        test: 'file-validation',
        received: {
          body: req.body,
          files: req.files
        }
      });
    }

    const filename = req.file.originalname;
    const fileBuffer = req.file.buffer;
    
    console.log(`🔍 [TEST] Testing file validation for: ${filename}`);
    console.log(`🔍 [TEST] File size: ${fileBuffer.length} bytes`);
    console.log(`🔍 [TEST] MIME type: ${req.file.mimetype}`);
    
    // Determine file type based on extension
    let fileType = 'csv'; // Default to CSV
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      fileType = 'excel';
    } else if (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.gif') || filename.endsWith('.webp')) {
      fileType = 'image';
    }
    
    console.log(`🔍 [TEST] Detected file type: ${fileType}`);
    
    // Run comprehensive file validation
    const fileValidation = validateFileContent(req.file, fileType);
    
    console.log(`🔍 [TEST] Validation result:`, fileValidation);
    
    // Return detailed validation results
    res.json({
      test: 'file-validation',
      filename: filename,
      fileSize: fileBuffer.length,
      mimeType: req.file.mimetype,
      detectedFileType: fileType,
      validation: fileValidation,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TEST] File validation test error:', error);
    res.status(500).json({ 
      error: 'File validation test failed',
      details: error.message,
      test: 'file-validation'
    });
  }
});

// Test multiple file types endpoint
r.post("/test-multiple", upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        error: 'No files uploaded',
        test: 'multiple-file-validation'
      });
    }

    console.log(`🔍 [TEST] Testing ${req.files.length} files`);
    
    const results = [];
    
    for (const file of req.files) {
      const filename = file.originalname;
      const fileBuffer = file.buffer;
      
      // Determine file type
      let fileType = 'csv';
      if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
        fileType = 'excel';
      } else if (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.gif') || filename.endsWith('.webp')) {
        fileType = 'image';
      }
      
      // Validate file
      const fileValidation = validateFileContent(file, fileType);
      
      results.push({
        filename: filename,
        fileSize: fileBuffer.length,
        mimeType: file.mimetype,
        detectedFileType: fileType,
        validation: fileValidation
      });
    }
    
    res.json({
      test: 'multiple-file-validation',
      fileCount: req.files.length,
      results: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TEST] Multiple file validation test error:', error);
    res.status(500).json({ 
      error: 'Multiple file validation test failed',
      details: error.message,
      test: 'multiple-file-validation'
    });
  }
});

// Health check endpoint
r.get("/health", (req, res) => {
  res.json({
    status: 'ok',
    test: 'file-validation',
    message: 'File validation test endpoint is running',
    timestamp: new Date().toISOString()
  });
});

export default r;

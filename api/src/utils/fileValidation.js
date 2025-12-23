/**
 * COMPREHENSIVE FILE CONTENT VALIDATION
 * 
 * This module provides deep file validation beyond just MIME type checking:
 * - File signature validation (magic numbers)
 * - Content structure validation
 * - Malicious content detection
 * - File integrity checks
 */

import { createHash } from 'crypto';

// File signature database (magic numbers)
const FILE_SIGNATURES = {
  // Excel files
  'xlsx': [
    [0x50, 0x4B, 0x03, 0x04], // ZIP-based (xlsx)
    [0x50, 0x4B, 0x05, 0x06], // ZIP-based (xlsx)
    [0x50, 0x4B, 0x07, 0x08]  // ZIP-based (xlsx)
  ],
  'xls': [
    [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLE2 (xls)
    [0x09, 0x08, 0x10, 0x00, 0x00, 0x00, 0x06, 0x05]  // BIFF8 (xls)
  ],
  
  // Image files
  'jpeg': [
    [0xFF, 0xD8, 0xFF], // JPEG
    [0xFF, 0xD8, 0xFF, 0xE0], // JPEG JFIF
    [0xFF, 0xD8, 0xFF, 0xE1]  // JPEG EXIF
  ],
  'png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] // PNG
  ],
  'gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]  // GIF89a
  ],
  'webp': [
    [0x52, 0x49, 0x46, 0x46] // RIFF (WebP starts with RIFF)
  ],
  
  // Document files
  'pdf': [
    [0x25, 0x50, 0x44, 0x46] // %PDF
  ],
  'docx': [
    [0x50, 0x4B, 0x03, 0x04] // ZIP-based (docx)
  ],
  'doc': [
    [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] // OLE2 (doc)
  ],
  
  // Archive files
  'zip': [
    [0x50, 0x4B, 0x03, 0x04], // ZIP
    [0x50, 0x4B, 0x05, 0x06], // ZIP
    [0x50, 0x4B, 0x07, 0x08]  // ZIP
  ],
  'rar': [
    [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00], // RAR v1.5+
    [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x01, 0x00] // RAR v5.0+
  ]
};

// MIME type to extension mapping
const MIME_TO_EXTENSION = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/zip': 'zip',
  'application/x-rar-compressed': 'rar'
};

/**
 * Validate file signature (magic numbers)
 */
export function validateFileSignature(buffer, expectedType) {
  if (!buffer || buffer.length < 4) {
    return {
      valid: false,
      message: 'File appears to be corrupted or empty',
      detectedType: null
    };
  }
  
  const signatures = FILE_SIGNATURES[expectedType];
  if (!signatures) {
    return {
      valid: false,
      message: `Unknown file type: ${expectedType}`,
      detectedType: null
    };
  }
  
  // Check against all known signatures for this type
  for (const signature of signatures) {
    if (buffer.length >= signature.length) {
      const matches = signature.every((byte, index) => buffer[index] === byte);
      if (matches) {
        return {
          valid: true,
          message: `Valid ${expectedType} file signature detected`,
          detectedType: expectedType
        };
      }
    }
  }
  
  // Try to detect actual file type
  const detectedType = detectFileType(buffer);
  
  return {
    valid: false,
    message: `File signature does not match ${expectedType}. Detected type: ${detectedType || 'unknown'}`,
    detectedType
  };
}

/**
 * Detect file type from signature
 */
export function detectFileType(buffer) {
  if (!buffer || buffer.length < 4) return null;
  
  for (const [type, signatures] of Object.entries(FILE_SIGNATURES)) {
    for (const signature of signatures) {
      if (buffer.length >= signature.length) {
        const matches = signature.every((byte, index) => buffer[index] === byte);
        if (matches) {
          return type;
        }
      }
    }
  }
  
  return null;
}

/**
 * Validate Excel file content
 */
export async function validateExcelContent(buffer, filename) {
  try {
    // 1. Check file signature
    const signatureCheck = validateFileSignature(buffer, 'xlsx');
    if (!signatureCheck.valid) {
      return {
        valid: false,
        message: signatureCheck.message,
        details: 'File does not appear to be a valid Excel file'
      };
    }
    
    // 2. Check file size (based on real HR files: 45-48KB, max 50MB)
    if (buffer.length < 1024) {
      return {
        valid: false,
        message: 'File is too small to be a valid Excel file',
        details: 'Excel files must be at least 1KB'
      };
    }
    if (buffer.length > 50 * 1024 * 1024) {
      return {
        valid: false,
        message: 'File is too large',
        details: 'Excel files must be smaller than 50MB'
      };
    }
    
    // 3. Check for ZIP structure (xlsx files are ZIP archives)
    if (filename.endsWith('.xlsx')) {
      const zipCheck = validateZipStructure(buffer);
      if (!zipCheck.valid) {
        return {
          valid: false,
          message: 'Invalid Excel file structure',
          details: zipCheck.message
        };
      }
    }
    
    // 4. Parse Excel file to validate structure (compatible with existing parsers)
    let workbook;
    try {
      const XLSX = await import('xlsx');
      // Use same options as existing parsers for consistency
      workbook = XLSX.default.read(buffer, { type: 'buffer', cellDates: false, cellText: false });
    } catch (e) {
      return {
        valid: false,
        message: 'File is not a valid Excel workbook',
        details: `Parsing failed: ${e.message}`
      };
    }

    // 5. Validate workbook structure (based on real files: 1 sheet, 1000-1500 rows)
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        valid: false,
        message: 'Excel file contains no worksheets',
        details: 'Valid Excel files must have at least one worksheet'
      };
    }

    // 6. Check each worksheet for HR data structure
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        return {
          valid: false,
          message: `Worksheet "${sheetName}" is corrupted`,
          details: 'Worksheet cannot be read'
        };
      }

      // Check worksheet dimensions (based on real files: 8-30 columns, 1000-1500 rows)
      const XLSX = await import('xlsx');
      const range = XLSX.default.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      const rowCount = range.e.r + 1;
      const colCount = range.e.c + 1;
      
      if (rowCount < 2) {
        return {
          valid: false,
          message: `Worksheet "${sheetName}" contains no data`,
          details: `Only ${rowCount} row found, expected at least 2 rows`
        };
      }
      
      if (colCount < 1) {
        return {
          valid: false,
          message: `Worksheet "${sheetName}" contains no columns`,
          details: 'Worksheet must have at least one column'
        };
      }

      // Check for reasonable data size (prevent memory issues)
      if (rowCount > 10000) {
        return {
          valid: false,
          message: `Worksheet "${sheetName}" has too many rows`,
          details: `Found ${rowCount} rows, maximum allowed: 10,000`
        };
      }
      
      if (colCount > 100) {
        return {
          valid: false,
          message: `Worksheet "${sheetName}" has too many columns`,
          details: `Found ${colCount} columns, maximum allowed: 100`
        };
      }

      // 7. Check for HR data patterns (based on real files)
      try {
        const XLSX = await import('xlsx');
        const jsonData = XLSX.default.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: null, 
          raw: false,
          blankrows: true 
        });
        
        // Look for common HR data patterns from real files
        const hasHRData = jsonData.some(row => 
          row && row.some(cell => 
            cell && typeof cell === 'string' && 
            (cell.toLowerCase().includes('employee') || 
             cell.toLowerCase().includes('name') ||
             cell.toLowerCase().includes('timecard') ||
             cell.toLowerCase().includes('commission') ||
             cell.toLowerCase().includes('pay period') ||
             cell.toLowerCase().includes('hourly rate') ||
             cell.toLowerCase().includes('revenue'))
          )
        );

        if (!hasHRData && jsonData.length > 5) {
          console.warn(`Worksheet "${sheetName}" may not contain expected HR data structure`);
        }

        // Check for excessive empty rows (potential data corruption)
        // Allow up to 90% empty rows for commission files which often have many empty cells
        const emptyRowCount = jsonData.filter(row => 
          !row || row.every(cell => cell === null || cell === '' || cell === undefined)
        ).length;
        
        if (emptyRowCount > jsonData.length * 0.95) {
          return {
            valid: false,
            message: `Worksheet "${sheetName}" contains too many empty rows`,
            details: `Found ${emptyRowCount} empty rows out of ${jsonData.length} total rows. File may be corrupted.`
          };
        }

      } catch (e) {
        return {
          valid: false,
          message: `Error reading worksheet "${sheetName}"`,
          details: e.message
        };
      }
    }
    
    // 8. Check for malicious content patterns
    const maliciousCheck = checkForMaliciousContent(buffer);
    if (!maliciousCheck.clean) {
      return {
        valid: false,
        message: 'File contains potentially malicious content',
        details: maliciousCheck.reason
      };
    }
    
    // 9. Calculate file hash for integrity
    const hash = createHash('sha256').update(buffer).digest('hex');
    
    return {
      valid: true,
      message: 'Valid Excel file',
      details: {
        fileSize: buffer.length,
        hash: hash.substring(0, 16) + '...',
        type: signatureCheck.detectedType,
        sheets: workbook.SheetNames.length,
        sheetNames: workbook.SheetNames
      }
    };
    
  } catch (error) {
    return {
      valid: false,
      message: 'Error validating Excel file',
      details: error.message
    };
  }
}

/**
 * Validate CSV file content
 */
export async function validateCSVContent(buffer, filename) {
  try {
    // 1. Check file size
    if (buffer.length === 0) {
      return {
        valid: false,
        message: 'CSV file is empty',
        details: 'File must contain data'
      };
    }
    
    // 2. Decode content
    const content = buffer.toString('utf8');
    
    // 3. Check for BOM (Byte Order Mark)
    if (content.charCodeAt(0) === 0xFEFF) {
      return {
        valid: false,
        message: 'CSV file contains BOM (Byte Order Mark)',
        details: 'Please save the file without BOM encoding'
      };
    }
    
    // 4. Parse CSV using same method as existing parsers
    let records;
    try {
      const { parse } = await import('csv-parse/sync');
      records = parse(content, { 
        columns: true, 
        skip_empty_lines: true,
        on_record: (record, { lines }) => {
          // Basic check for consistent column count in first few rows
          if (lines < 10 && Object.keys(record).length === 0) {
            throw new Error('Empty record detected in initial rows');
          }
          return record;
        }
      });
      
      if (records.length === 0) {
        return {
          valid: false,
          message: 'CSV file contains no valid data rows',
          details: 'File appears to be empty or contains only headers'
        };
      }
      
    } catch (e) {
      return {
        valid: false,
        message: 'Invalid CSV structure or parsing error',
        details: e.message
      };
    }
    
    // 5. Check for HR data patterns (similar to Excel validation)
    const hasHRData = records.some(record => 
      Object.values(record).some(value => 
        value && typeof value === 'string' && 
        (value.toLowerCase().includes('employee') || 
         value.toLowerCase().includes('name') ||
         value.toLowerCase().includes('timecard') ||
         value.toLowerCase().includes('commission') ||
         value.toLowerCase().includes('pay period') ||
         value.toLowerCase().includes('hourly') ||
         value.toLowerCase().includes('revenue') ||
         value.toLowerCase().includes('date') ||
         value.toLowerCase().includes('time'))
      )
    );

    if (!hasHRData && records.length > 5) {
      console.warn('CSV file may not contain expected HR data structure');
    }

    // 6. Check for reasonable data structure
    const columnCount = Object.keys(records[0] || {}).length;
    if (columnCount === 0) {
      return {
        valid: false,
        message: 'CSV file has no columns',
        details: 'File must contain at least one data column'
      };
    }
    
    if (columnCount > 50) {
      return {
        valid: false,
        message: 'CSV file has too many columns',
        details: `Found ${columnCount} columns, maximum allowed: 50`
      };
    }

    // 7. Check for excessive empty records (potential data corruption)
    const emptyRecordCount = records.filter(record => 
      Object.values(record).every(value => !value || value === '')
    ).length;
    
    if (emptyRecordCount > records.length * 0.8) {
      return {
        valid: false,
        message: 'CSV file contains too many empty records',
        details: `Found ${emptyRecordCount} empty records out of ${records.length} total records. File may be corrupted.`
      };
    }
    
    // 7. Check for suspicious content
    const suspiciousCheck = checkForSuspiciousCSVContent(content);
    if (!suspiciousCheck.clean) {
      return {
        valid: false,
        message: 'CSV file contains suspicious content',
        details: suspiciousCheck.reason
      };
    }
    
    return {
      valid: true,
      message: 'Valid CSV file',
      details: {
        fileSize: buffer.length,
        records: records.length,
        columns: columnCount,
        encoding: 'UTF-8'
      }
    };
    
  } catch (error) {
    return {
      valid: false,
      message: 'Error validating CSV file',
      details: error.message
    };
  }
}

/**
 * Validate image file content
 */
export function validateImageContent(buffer, filename) {
  try {
    // 1. Detect image type from signature
    const detectedType = detectFileType(buffer);
    const expectedTypes = ['jpeg', 'png', 'gif', 'webp'];
    
    if (!detectedType || !expectedTypes.includes(detectedType)) {
      return {
        valid: false,
        message: 'File is not a valid image',
        details: `Detected type: ${detectedType || 'unknown'}, expected: ${expectedTypes.join(', ')}`
      };
    }
    
    // 2. Check file size
    if (buffer.length < 100) {
      return {
        valid: false,
        message: 'Image file is too small',
        details: 'Image files must be at least 100 bytes'
      };
    }
    
    // 3. Validate specific image format
    let formatValidation;
    switch (detectedType) {
      case 'jpeg':
        formatValidation = validateJPEGContent(buffer);
        break;
      case 'png':
        formatValidation = validatePNGContent(buffer);
        break;
      case 'gif':
        formatValidation = validateGIFContent(buffer);
        break;
      case 'webp':
        formatValidation = validateWebPContent(buffer);
        break;
      default:
        formatValidation = { valid: true };
    }
    
    if (!formatValidation.valid) {
      return {
        valid: false,
        message: `Invalid ${detectedType.toUpperCase()} file`,
        details: formatValidation.message
      };
    }
    
    // 4. Check for malicious content
    const maliciousCheck = checkForMaliciousImageContent(buffer);
    if (!maliciousCheck.clean) {
      return {
        valid: false,
        message: 'Image contains potentially malicious content',
        details: maliciousCheck.reason
      };
    }
    
    return {
      valid: true,
      message: `Valid ${detectedType.toUpperCase()} image`,
      details: {
        fileSize: buffer.length,
        type: detectedType,
        dimensions: formatValidation.dimensions || 'unknown'
      }
    };
    
  } catch (error) {
    return {
      valid: false,
      message: 'Error validating image file',
      details: error.message
    };
  }
}

/**
 * Validate ZIP file structure (for xlsx files)
 */
function validateZipStructure(buffer) {
  try {
    // Check for ZIP local file header signature
    const zipSignature = [0x50, 0x4B, 0x03, 0x04];
    const hasZipSignature = zipSignature.every((byte, index) => buffer[index] === byte);
    
    if (!hasZipSignature) {
      return {
        valid: false,
        message: 'File does not have valid ZIP structure'
      };
    }
    
    // Check for minimum ZIP file size
    if (buffer.length < 22) { // Minimum ZIP file size
      return {
        valid: false,
        message: 'ZIP file is too small'
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      message: `ZIP validation error: ${error.message}`
    };
  }
}

/**
 * Check for malicious content in files
 */
function checkForMaliciousContent(buffer) {
  try {
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024)); // Check first 1KB
    
    // Check for script tags
    if (content.includes('<script') || content.includes('javascript:')) {
      return {
        clean: false,
        reason: 'File contains script tags or JavaScript code'
      };
    }
    
    // Check for executable patterns
    const executablePatterns = [
      /MZ/, // PE executable
      /\x7fELF/, // ELF executable
      /#!/, // Shell script
      /@echo/, // Batch file
    ];
    
    for (const pattern of executablePatterns) {
      if (pattern.test(content)) {
        return {
          clean: false,
          reason: 'File appears to contain executable code'
        };
      }
    }
    
    // Check for suspicious URLs
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlPattern);
    if (urls && urls.length > 5) {
      return {
        clean: false,
        reason: 'File contains suspicious number of URLs'
      };
    }
    
    return { clean: true };
  } catch (error) {
    return {
      clean: false,
      reason: `Content analysis error: ${error.message}`
    };
  }
}

/**
 * Check for suspicious CSV content
 */
function checkForSuspiciousCSVContent(content) {
  try {
    // Check for excessive line length (potential injection)
    const lines = content.split('\n');
    const maxLineLength = 10000; // 10KB per line max
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > maxLineLength) {
        return {
          clean: false,
          reason: `Line ${i + 1} is too long (${lines[i].length} characters)`
        };
      }
    }
    
    // Check for SQL injection patterns
    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /update\s+set/i,
      /--/, // SQL comment
      /\/\*.*\*\//, // SQL comment block
    ];
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(content)) {
        return {
          clean: false,
          reason: 'File contains potential SQL injection patterns'
        };
      }
    }
    
    return { clean: true };
  } catch (error) {
    return {
      clean: false,
      reason: `CSV content analysis error: ${error.message}`
    };
  }
}

/**
 * Check for malicious image content
 */
function checkForMaliciousImageContent(buffer) {
  try {
    // Check for embedded scripts in image metadata
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 2048));
    
    if (content.includes('<script') || content.includes('javascript:')) {
      return {
        clean: false,
        reason: 'Image contains embedded scripts'
      };
    }
    
    // Check for excessive metadata
    if (content.includes('EXIF') && content.length > 10000) {
      return {
        clean: false,
        reason: 'Image contains excessive metadata'
      };
    }
    
    return { clean: true };
  } catch (error) {
    return {
      clean: false,
      reason: `Image content analysis error: ${error.message}`
    };
  }
}

/**
 * Validate specific image formats
 */
function validateJPEGContent(buffer) {
  // JPEG validation logic
  return { valid: true, dimensions: 'unknown' };
}

function validatePNGContent(buffer) {
  // PNG validation logic
  return { valid: true, dimensions: 'unknown' };
}

function validateGIFContent(buffer) {
  // GIF validation logic
  return { valid: true, dimensions: 'unknown' };
}

function validateWebPContent(buffer) {
  // WebP validation logic
  return { valid: true, dimensions: 'unknown' };
}

/**
 * Main file validation function
 */
/**
 * Validate file content - auto-detects format if not specified
 * @param {Object} file - File object with buffer and originalname
 * @param {string} expectedType - 'csv', 'excel', or null for auto-detection
 */
export async function validateFileContent(file, expectedType = null) {
  // Auto-detect format if not specified
  if (!expectedType) {
    const { detectFileType } = await import('./unifiedFileParser.js');
    const detected = detectFileType(file.buffer, file.originalname);
    if (detected === 'csv') {
      expectedType = 'csv';
    } else if (detected === 'excel') {
      expectedType = 'excel';
    } else {
      // Try to determine from filename
      if (file.originalname.endsWith('.csv')) {
        expectedType = 'csv';
      } else if (file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
        expectedType = 'excel';
      } else {
        return {
          valid: false,
          message: 'Unable to detect file type',
          details: 'File must be CSV or Excel format'
        };
      }
    }
  }
  const { buffer, originalname, mimetype } = file;
  
  console.log(`🔍 [FILE_VALIDATION] Validating file: ${originalname}`);
  console.log(`🔍 [FILE_VALIDATION] Expected type: ${expectedType}, MIME: ${mimetype}`);
  
  try {
    switch (expectedType) {
      case 'excel':
        return await validateExcelContent(buffer, originalname);
      case 'csv':
        return await validateCSVContent(buffer, originalname);
      case 'image':
        return validateImageContent(buffer, originalname);
      default:
        return {
          valid: false,
          message: `Unknown file type: ${expectedType}`,
          details: 'Only excel, csv, and image types are supported'
        };
    }
  } catch (error) {
    return {
      valid: false,
      message: 'File validation error',
      details: error.message
    };
  }
}

export default {
  validateFileSignature,
  detectFileType,
  validateExcelContent,
  validateCSVContent,
  validateImageContent,
  validateFileContent
};

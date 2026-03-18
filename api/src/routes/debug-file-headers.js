/**
 * File Header Debugger Route
 * 
 * Temporary debugging endpoint to help diagnose file format issues.
 * Upload a file and it will show you exactly what headers were detected.
 */

import { Router } from 'express';
import multer from 'multer';
import { loadExcelWorkbook, getWorksheetData } from '../utils/excelParser.js';
import { cleanCellValue } from '../utils/excelParser.js';

const r = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});

r.post('/debug-file-headers', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const workbook = await loadExcelWorkbook(req.file.buffer, req.file.originalname);
        const sheetName = workbook.SheetNames[0];
        const data = getWorksheetData(workbook, sheetName);

        if (!data || data.length === 0) {
            return res.json({
                filename: req.file.originalname,
                error: 'No data found in file'
            });
        }

        const headerRow = data[0];
        const cleanedHeaders = headerRow.map((h, idx) => ({
            index: idx,
            raw: h,
            cleaned: cleanCellValue(h),
            normalized: cleanCellValue(h)?.trim().toLowerCase()
        }));

        res.json({
            filename: req.file.originalname,
            sheetName: sheetName,
            totalRows: data.length,
            headers: cleanedHeaders,
            sampleRow1: data[1],
            sampleRow2: data[2]
        });

    } catch (error) {
        res.status(500).json({
            error: 'Failed to parse file',
            details: error.message,
            stack: error.stack
        });
    }
});

export default r;

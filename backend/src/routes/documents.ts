import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { FileProcessor } from '../utils/fileProcessor';
import openaiService from '../services/openaiService';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.docx', '.xlsx', '.xls', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only DOCX, XLSX, XLS, TXT, and MD files are allowed.'));
    }
  },
});

// Upload document
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { filename, originalname, mimetype, size, path: filePath } = req.file;

    // Save document metadata to database
    const result = await pool.query(
      `INSERT INTO documents (filename, original_name, file_type, file_size, processed)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [filename, originalname, mimetype, size, false]
    );

    const document = result.rows[0];

    // Process file asynchronously
    processDocumentAsync(document.id, filePath, mimetype);

    res.status(201).json({
      message: 'File uploaded successfully',
      document,
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Detect if spreadsheet header row looks like KPI columns
function isKPISpreadsheet(headers: any[]): boolean {
  const headerText = headers.map(h => String(h || '').toLowerCase()).join(' ');
  const kpiKeywords = ['kpi', 'kpi name', 'metric', 'measure', 'kpi name/id',
    'target', 'target value', 'target_value', 'goal', 'goal value',
    'current', 'current value', 'current_value', 'actual', 'actual value',
    'unit', 'frequency', 'owner', 'responsible', 'status'];
  const matches = kpiKeywords.filter(kw => headerText.includes(kw)).length;
  return matches >= 2;
}

// Parse KPI rows from a spreadsheet
function parseKPIsFromSheet(headers: any[], rows: any[][]): any[] {
  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    const key = String(h || '').toLowerCase().trim();
    headerMap[key] = i;
  });

  const kpis: any[] = [];
  for (const row of rows) {
    if (!row || row.every(c => c === undefined || c === null || String(c).trim() === '')) continue;
    const nameCol = headerMap['kpi'] ?? headerMap['kpi name'] ?? headerMap['kpi name/id']
      ?? headerMap['metric'] ?? headerMap['measure'] ?? headerMap['name'];
    if (nameCol === undefined) continue;
    const name = String(row[nameCol] || '').trim();
    if (!name) continue;

    const targetKey = Object.keys(headerMap).find(k => k.includes('target') || k.includes('goal')) ?? '';
    const currentKey = Object.keys(headerMap).find(k => k.includes('current') || k.includes('actual')) ?? '';
    const unitKey = Object.keys(headerMap).find(k => k === 'unit') ?? '';
    const freqKey = Object.keys(headerMap).find(k => k === 'frequency') ?? '';
    const descKey = Object.keys(headerMap).find(k => k.includes('description')) ?? '';

    kpis.push({
      name,
      description: descKey ? String(row[headerMap[descKey]] || '') : '',
      target_value: targetKey ? parseFloat(row[headerMap[targetKey]] as any) || null : null,
      current_value: currentKey ? parseFloat(row[headerMap[currentKey]] as any) || null : null,
      unit: unitKey ? String(row[headerMap[unitKey]] || '') : '',
      frequency: freqKey ? String(row[headerMap[freqKey]] || '').toLowerCase() : 'monthly',
    });
  }
  return kpis;
}

// Process document and extract OGSM components
async function processDocumentAsync(documentId: string, filePath: string, fileType: string) {
  console.log(`[Document ${documentId}] Starting processing...`);

  try {
    // Process the file
    const processed = await FileProcessor.processFile(filePath, fileType);
    console.log(`[Document ${documentId}] File processed, extracted ${processed.text.length} characters`);

    if (!processed.text || processed.text.trim().length === 0) {
      throw new Error('Document contains no extractable text');
    }

    let ogsmComponents: any[] = [];
    let kpis: any[] = [];

    // For XLSX/XLS files: try to detect and parse KPI spreadsheets directly
    const ext = path.extname(filePath).toLowerCase();
    if ((ext === '.xlsx' || ext === '.xls') && processed.tables && processed.tables.length > 0) {
      console.log(`[Document ${documentId}] Detected spreadsheet with ${processed.tables.length} sheets`);

      for (const sheet of processed.tables) {
        if (!sheet.data || sheet.data.length < 2) continue;

        const headers = sheet.data[0];
        const rows = sheet.data.slice(1);

        if (isKPISpreadsheet(headers)) {
          console.log(`[Document ${documentId}] Sheet "${sheet.name}" identified as KPI spreadsheet`);
          const sheetKpis = parseKPIsFromSheet(headers, rows);
          if (sheetKpis.length > 0) {
            console.log(`[Document ${documentId}] Parsed ${sheetKpis.length} KPIs from sheet "${sheet.name}"`);
            kpis.push(...sheetKpis);
          }
        } else {
          console.log(`[Document ${documentId}] Sheet "${sheet.name}" not identified as KPI sheet, using AI extraction`);
        }
      }

      // If no KPIs were parsed directly, fall back to AI extraction with structured data
      if (kpis.length === 0) {
        console.log(`[Document ${documentId}] No direct KPI parse, falling back to AI extraction`);
        const structuredText = processed.text + '\n\nStructured table data:\n' +
          JSON.stringify(processed.tables);
        kpis = await extractWithRetry(
          () => openaiService.extractKPIsFromText(structuredText),
          'KPIs',
          documentId
        );
      }
    } else {
      // Text-based documents: extract both OGSM and KPIs via AI
      console.log(`[Document ${documentId}] Extracting OGSM components...`);
      ogsmComponents = await extractWithRetry(
        () => openaiService.extractOGSMFromText(processed.text),
        'OGSM components',
        documentId
      );

      console.log(`[Document ${documentId}] Extracting KPIs...`);
      kpis = await extractWithRetry(
        () => openaiService.extractKPIsFromText(processed.text),
        'KPIs',
        documentId
      );
    }

    console.log(`[Document ${documentId}] Extraction complete: ${ogsmComponents.length} OGSM components, ${kpis.length} KPIs`);

    // Save OGSM components to database
    const componentIdMap = new Map<string, string>();
    for (const component of ogsmComponents) {
      if (!component.title || !component.component_type) {
        console.warn(`[Document ${documentId}] Skipping invalid component:`, component);
        continue;
      }

      const componentResult = await pool.query(
        `INSERT INTO ogsm_components (document_id, component_type, title, description, order_index)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          documentId,
          component.component_type,
          component.title,
          component.description || '',
          component.order_index || 0,
        ]
      );

      const componentId = componentResult.rows[0].id;
      componentIdMap.set(component.title, componentId);

      if (component.component_type === 'measure' && kpis.length > 0) {
        console.log(`[Document ${documentId}] Linking ${kpis.length} KPIs to measure: ${component.title}`);
        for (const kpi of kpis) {
          if (!kpi.name) continue;
          await pool.query(
            `INSERT INTO kpis (ogsm_component_id, name, description, target_value, current_value, unit, frequency, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [componentId, kpi.name, kpi.description || '', kpi.target_value || null,
             kpi.current_value || null, kpi.unit || '', kpi.frequency || 'monthly', 'on_track']
          );
        }
        kpis = [];
      }
    }

    // Create standalone KPIs (not linked to a measure)
    if (kpis.length > 0) {
      console.log(`[Document ${documentId}] Creating ${kpis.length} standalone KPIs`);
      for (const kpi of kpis) {
        if (!kpi.name) continue;
        await pool.query(
          `INSERT INTO kpis (name, description, target_value, current_value, unit, frequency, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [kpi.name, kpi.description || '', kpi.target_value || null,
           kpi.current_value || null, kpi.unit || '', kpi.frequency || 'monthly', 'on_track']
        );
      }
    }

    const totalExtracted = ogsmComponents.length + kpis.length;
    const metadata: any = {
      ...processed.metadata,
      ogsm_count: ogsmComponents.length,
      kpi_count: kpis.length,
      processed_at: new Date().toISOString(),
    };

    if (totalExtracted === 0) {
      metadata.warning = 'No strategic content detected';
      metadata.text_length = processed.text.length;
    }

    await pool.query(
      `UPDATE documents SET processed = true, metadata = $1 WHERE id = $2`,
      [JSON.stringify(metadata), documentId]
    );

    console.log(`[Document ${documentId}] Processing completed successfully`);
  } catch (error) {
    console.error(`[Document ${documentId}] Error processing document:`, error);
    await pool.query(
      `UPDATE documents SET processed = false, metadata = $1 WHERE id = $2`,
      [JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        failed_at: new Date().toISOString()
      }), documentId]
    );
  }
}

// Retry extraction with exponential backoff
async function extractWithRetry<T>(
  extractFn: () => Promise<T[]>,
  dataType: string,
  documentId: string,
  maxRetries = 3
): Promise<T[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await extractFn();

      if (result && result.length > 0) {
        console.log(`[Document ${documentId}] Successfully extracted ${result.length} ${dataType} (attempt ${attempt})`);
        return result;
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.warn(`[Document ${documentId}] No ${dataType} extracted on attempt ${attempt}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`[Document ${documentId}] Error extracting ${dataType} (attempt ${attempt}):`, error);
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  console.warn(`[Document ${documentId}] Failed to extract ${dataType} after ${maxRetries} attempts`);
  return [];
}

// Get all documents
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM documents ORDER BY upload_date DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get document by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Delete document
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get document info
    const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = docResult.rows[0];

    // Delete from database (cascade will handle related records)
    await pool.query('DELETE FROM documents WHERE id = $1', [id]);

    // Delete physical file
    const uploadsDir = process.env.UPLOAD_DIR || 'uploads/';
    await FileProcessor.deleteFile(path.join(uploadsDir, document.filename));

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;

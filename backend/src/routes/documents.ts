import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { FileProcessor } from '../utils/fileProcessor';
import geminiService from '../services/geminiService';

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

// Process document and extract OGSM components
async function processDocumentAsync(documentId: string, filePath: string, fileType: string) {
  try {
    // Process the file
    const processed = await FileProcessor.processFile(filePath, fileType);

    // Extract OGSM components using Gemini AI
    const ogsmComponents = await geminiService.extractOGSMFromText(processed.text);

    // Extract KPIs
    const kpis = await geminiService.extractKPIsFromText(processed.text);

    // Save OGSM components to database
    for (const component of ogsmComponents) {
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

      // If this component has KPIs, link them
      const componentId = componentResult.rows[0].id;
      if (component.component_type === 'measure') {
        // Try to match and link KPIs
        for (const kpi of kpis) {
          await pool.query(
            `INSERT INTO kpis (ogsm_component_id, name, description, target_value, current_value, unit, frequency, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              componentId,
              kpi.name,
              kpi.description || '',
              kpi.target_value || null,
              kpi.current_value || null,
              kpi.unit || '',
              kpi.frequency || 'monthly',
              'on_track',
            ]
          );
        }
      }
    }

    // Update document as processed
    await pool.query(
      `UPDATE documents SET processed = true, metadata = $1 WHERE id = $2`,
      [JSON.stringify(processed.metadata), documentId]
    );

    console.log(`Document ${documentId} processed successfully`);
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);
    await pool.query(
      `UPDATE documents SET processed = false, metadata = $1 WHERE id = $2`,
      [JSON.stringify({ error: String(error) }), documentId]
    );
  }
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

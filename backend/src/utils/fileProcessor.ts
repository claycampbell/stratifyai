import mammoth from 'mammoth';
import * as XLSX from 'xlsx-js-style';
import fs from 'fs/promises';
import path from 'path';

export interface ProcessedDocument {
  text: string;
  tables?: any[];
  metadata?: Record<string, any>;
}

export class FileProcessor {
  static async processDocx(filePath: string): Promise<ProcessedDocument> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return {
        text: result.value,
        metadata: {
          messages: result.messages,
        },
      };
    } catch (error) {
      throw new Error(`Failed to process DOCX file: ${error}`);
    }
  }

  static async processXlsx(filePath: string): Promise<ProcessedDocument> {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheets: any[] = [];
      let combinedText = '';

      workbook.SheetNames.forEach((sheetName: string) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const textData = XLSX.utils.sheet_to_txt(worksheet);

        sheets.push({
          name: sheetName,
          data: jsonData,
        });

        combinedText += `\n\n--- Sheet: ${sheetName} ---\n${textData}`;
      });

      return {
        text: combinedText,
        tables: sheets,
        metadata: {
          sheetCount: workbook.SheetNames.length,
          sheetNames: workbook.SheetNames,
        },
      };
    } catch (error) {
      throw new Error(`Failed to process XLSX file: ${error}`);
    }
  }

  static async processFile(filePath: string, fileType: string): Promise<ProcessedDocument> {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.docx':
        return this.processDocx(filePath);
      case '.xlsx':
      case '.xls':
        return this.processXlsx(filePath);
      case '.txt':
      case '.md':
        const text = await fs.readFile(filePath, 'utf-8');
        return { text };
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
    }
  }
}

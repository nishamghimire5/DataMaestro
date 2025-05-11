$content = @"
'use server';
/**
 * @fileOverview Pandas-like Processing for CSV Data
 * 
 * Implements Python/Pandas-style data processing for CSV data.
 * This provides a more efficient and powerful alternative to regex-based processing.
 */

import Papa from 'papaparse';

// Add LLM client imports
import { GoogleGenerativeAI } from '@google/generative-ai';
// Create a simple interface for Ollama
type OllamaClient = {
  generateText: (prompt: string, model?: string) => Promise<string>;
};

// LLM model selection options
export enum LlmModel {
  DEFAULT = 'default',
  GEMINI = 'gemini',
  OLLAMA = 'ollama'
}

type CsvPandasProcessInput = {
  csvData: string;
  command: string;
  originalFilename?: string;
  model?: LlmModel; // Add model selection option
  modelOptions?: {
    geminiModel?: string; // e.g., 'gemini-pro'
    ollamaModel?: string; // e.g., 'llama3'
  };
};

type CsvPandasProcessOutput = {
  processedCsvData: string;
  summary: string;
  columnInfo: Array<{
    name: string;
    dataType: string;
    nonNullCount: number;
    uniqueValueCount: number;
  }>;
  pythonCode?: string;
  errorLog?: string[];
  sqlQuery?: string; // Added for SQL query output
};
"@

Set-Content -Path "n:\DataMaestro2\src\ai\flows\csv-pandas-processor.ts" -Value $content -Encoding utf8

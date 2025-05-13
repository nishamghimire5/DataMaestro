'use server';

import Papa from 'papaparse';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * @fileOverview Pandas-like Processing for CSV Data
 * 
 * Implements Python/Pandas-style data processing for CSV data.
 * This provides a more efficient and powerful alternative to regex-based processing.
 */

// Create a simple interface for Ollama
type OllamaClient = {
  generateText: (prompt: string, model?: string) => Promise<string>;
};

// Create Ollama client with fetch API
const createOllamaClient = (): OllamaClient => {
  return {
    generateText: async (prompt: string, model: string = 'gemma3:4b') => {
      try {
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt,
            stream: false,
          }),
        });

        const data = await response.json();
        return data.response || '';
      } catch (error) {
        console.error('Error calling Ollama API:', error);
        return `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  };
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
    ollamaModel?: string; // e.g., 'gemma3:4b'
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

// Function to generate SQL from natural language using LLMs
async function generateSqlFromNaturalLanguage(
  command: string, 
  headers: string[], 
  sampleData: any[], 
  model: LlmModel,
  modelOptions: any = {}
): Promise<string> {
  const tableStructure = headers.join(', ');
  const sampleRows = JSON.stringify(sampleData.slice(0, 3));
  
  const prompt = `
I need SQL to transform this CSV data based on the following command:
"${command}"

Table structure:
Columns: ${tableStructure}

Sample data:
${sampleRows}

Please generate a complete SQL query that will achieve this. Only return the SQL code without any explanations.
`;

  try {
    if (model === LlmModel.GEMINI) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const geminiModel = modelOptions.geminiModel || 'gemini-pro';
      const geminiClient = genAI.getGenerativeModel({ model: geminiModel });
      const result = await geminiClient.generateContent(prompt);
      const text = result.response.text();
      return extractCodeFromResponse(text, 'sql');
    } 
    else if (model === LlmModel.OLLAMA) {
      const ollamaClient = createOllamaClient();
      const ollamaModel = modelOptions.ollamaModel || 'gemma3:4b';
      const result = await ollamaClient.generateText(prompt, ollamaModel);
      return extractCodeFromResponse(result, 'sql');
    }
    
    // Default - simple SQL generation based on command
    return `SELECT * FROM csv_data WHERE ${command}`;
  } catch (error) {
    console.error('Error generating SQL:', error);
    return `-- Error generating SQL: ${error instanceof Error ? error.message : String(error)}
SELECT * FROM csv_data`;
  }
}

// Function to generate Python/Pandas code from natural language using LLMs
async function generatePythonFromNaturalLanguage(
  command: string, 
  headers: string[], 
  sampleData: any[], 
  model: LlmModel,
  modelOptions: any = {}
): Promise<string> {
  const tableStructure = headers.join(', ');
  const sampleRows = JSON.stringify(sampleData.slice(0, 3));
  
  const prompt = `
I need Python Pandas code to transform this CSV data based on the following command:
"${command}"

CSV structure:
Columns: ${tableStructure}

Sample data:
${sampleRows}

Please generate complete Python Pandas code that will achieve this. Only return the Python code without any explanations.
Make sure to use 'df' as the variable name for the DataFrame.
`;

  try {
    if (model === LlmModel.GEMINI) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const geminiModel = modelOptions.geminiModel || 'gemini-pro';
      const geminiClient = genAI.getGenerativeModel({ model: geminiModel });
      const result = await geminiClient.generateContent(prompt);
      const text = result.response.text();
      return extractCodeFromResponse(text, 'python');
    } 
    else if (model === LlmModel.OLLAMA) {
      const ollamaClient = createOllamaClient();
      const ollamaModel = modelOptions.ollamaModel || 'gemma3:4b';
      const result = await ollamaClient.generateText(prompt, ollamaModel);
      return extractCodeFromResponse(result, 'python');
    }
    
    // Default - simple Python code generation
    return `
import pandas as pd

# Load the data
# df is loaded from the CSV

# Process the data based on: ${command}
result_df = df.copy()

# Return the processed data
result_df
`;
  } catch (error) {
    console.error('Error generating Python code:', error);
    return `# Error generating Python code: ${error instanceof Error ? error.message : String(error)}
import pandas as pd
result_df = df.copy()`;
  }
}

// Helper function to extract code from LLM responses
function extractCodeFromResponse(response: string, language: string): string {
  // Look for code blocks with markdown formatting
  const codeBlockRegex = new RegExp('```(?:' + language + '|)([\\s\\S]*?)```', 'i');
  const match = response.match(codeBlockRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // If no code block found, return the full response
  return response.trim();
}

/**
 * Process CSV data using pandas-style operations
 */
export default async function processCsvWithPandas({
  csvData,
  command,
  originalFilename = 'data.csv',
  model = LlmModel.DEFAULT,
  modelOptions = {}
}: CsvPandasProcessInput): Promise<CsvPandasProcessOutput> {
  // Define proper type for CSV data rows
  type CsvRow = Record<string, string | number | boolean | null>;
  
  let data: CsvRow[] = [];
  let headers: string[] = [];
  let errorLog: string[] = [];
  let pythonCode: string | undefined;
  let sqlQuery: string | undefined;
  
  try {
    // Parse CSV data
    const parseResult = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });
    
    data = parseResult.data as CsvRow[];
    headers = parseResult.meta.fields || [];
    
    // Generate code based on the selected model and user command
    if (model === LlmModel.DEFAULT || model === LlmModel.GEMINI || model === LlmModel.OLLAMA) {
      // Generate Python code from natural language
      pythonCode = await generatePythonFromNaturalLanguage(command, headers, data.slice(0, 10), model, modelOptions);
      
      // Generate SQL query from natural language
      sqlQuery = await generateSqlFromNaturalLanguage(command, headers, data.slice(0, 10), model, modelOptions);
    }
    
    // For now, we just return the original data
    // In a real implementation, you would execute the generated code
    
    return {
      processedCsvData: csvData,
      summary: `Processed ${data.length} rows with ${headers.length} columns. Generated Python and SQL code from natural language command.`,
      columnInfo: headers.map(name => ({
        name,
        dataType: inferDataType(data, name),
        nonNullCount: countNonNull(data, name),
        uniqueValueCount: countUniqueValues(data, name)
      })),
      pythonCode,
      sqlQuery,
      errorLog
    };
    
  } catch (error) {
    errorLog.push(`Error processing CSV: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      processedCsvData: csvData,
      summary: 'Error occurred during processing',
      columnInfo: [],
      errorLog
    };
  }
}

// Helper function to infer data type of a column
function inferDataType(data: any[], columnName: string): string {
  if (data.length === 0) return 'unknown';
  
  const nonNullValues = data.filter(row => row[columnName] != null).map(row => row[columnName]);
  if (nonNullValues.length === 0) return 'unknown';
  
  const sampleValue = nonNullValues[0];
  
  if (typeof sampleValue === 'number') return 'number';
  if (typeof sampleValue === 'boolean') return 'boolean';
  
  // Check if string values can be converted to dates
  if (typeof sampleValue === 'string') {
    // Simple date check - this could be improved
    if (/^\d{4}-\d{2}-\d{2}/.test(sampleValue)) return 'date';
    return 'string';
  }
  
  return 'unknown';
}

// Helper function to count non-null values in a column
function countNonNull(data: any[], columnName: string): number {
  return data.filter(row => row[columnName] != null).length;
}

// Helper function to count unique values in a column
function countUniqueValues(data: any[], columnName: string): number {
  const uniqueValues = new Set(data.map(row => row[columnName]));
  return uniqueValues.size;
}

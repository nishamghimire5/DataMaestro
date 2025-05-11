import { GoogleGenerativeAI } from '@google/generative-ai';
import { LlmModel, type CsvRow } from './schemas/csv-processor-types';

// Helper function to extract code from LLM responses
export function extractCodeFromResponse(response: string): string {
  const codeBlockRegex = /```(?:\\w+)?\\s*([\\s\\S]*?)```/;
  const match = response.match(codeBlockRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return response.trim();
}

// Call Gemini API
export async function callGemini(prompt: string, model: string): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const geminiClient = genAI.getGenerativeModel({ model });
    const result = await geminiClient.generateContent(prompt);
    const text = result.response.text();
    return extractCodeFromResponse(text);
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    // It's often better to throw the error to be caught by the calling function's try-catch
    throw new Error(`Gemini API Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Call Ollama API
export async function callOllama(prompt: string, model: string): Promise<string> {
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

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Ollama API request failed with status ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Ollama API Error: ${data.error}`);
    }
    return extractCodeFromResponse(data.response || '');
  } catch (error) {
    console.error('Error calling Ollama API:', error);
    throw new Error(`Ollama API Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Generate Python code from natural language command
export async function generatePythonCode(
  command: string,
  headers: string[],
  sampleData: CsvRow[],
  model: LlmModel,
  modelOptions: { geminiModel?: string; ollamaModel?: string }
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

Please generate complete Python Pandas code that will achieve this. Only return the Python code.
Make sure to use 'df' as the variable name for the DataFrame.
`;

  try {
    if (model === LlmModel.GEMINI) {
      return await callGemini(prompt, modelOptions.geminiModel || 'gemini-pro');
    } 
    else if (model === LlmModel.OLLAMA) {
      return await callOllama(prompt, modelOptions.ollamaModel || 'deepseek:latest');
    }
    // Fallback for LlmModel.DEFAULT or if other models fail before this point in logic
    return `
import pandas as pd
# Default Python code for command: ${command}
# Assuming 'df' is the DataFrame
result_df = df.copy() 
# Add processing logic here
`;
  } catch (error) {
    console.error('Error generating Python code:', error);
    return `# Error generating Python code: ${error instanceof Error ? error.message : String(error)}\nimport pandas as pd\nresult_df = pd.DataFrame() # Or df.copy() if df is available`;
  }
}

// Generate SQL query from natural language command
export async function generateSqlQuery(
  command: string,
  headers: string[],
  sampleData: CsvRow[],
  model: LlmModel,
  modelOptions: { geminiModel?: string; ollamaModel?: string }
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

Please generate a complete SQL query that will achieve this. Only return the SQL code.
Assume the table name is 'csv_data'.
`;

  try {
    if (model === LlmModel.GEMINI) {
      return await callGemini(prompt, modelOptions.geminiModel || 'gemini-pro');
    } 
    else if (model === LlmModel.OLLAMA) {
      return await callOllama(prompt, modelOptions.ollamaModel || 'deepseek:latest');
    }
    // Fallback for LlmModel.DEFAULT
    return `SELECT * FROM csv_data WHERE ${command.replace(/'/g, "''")}`; // Basic escaping for SQL
  } catch (error) {
    console.error('Error generating SQL:', error);
    return `-- Error generating SQL: ${error instanceof Error ? error.message : String(error)}\nSELECT * FROM csv_data;`;
  }
}

// Helper function to infer data type of a column
export function inferDataType(data: CsvRow[], columnName: string): string {
  if (data.length === 0) return 'unknown';
  
  const nonNullValues = data.filter(row => row[columnName] != null).map(row => row[columnName]);
  if (nonNullValues.length === 0) return 'unknown';
  
  const sampleValue = nonNullValues[0];
  
  if (typeof sampleValue === 'number') return 'number';
  if (typeof sampleValue === 'boolean') return 'boolean';
  
  if (typeof sampleValue === 'string') {
    // Improved date check
    if (!isNaN(new Date(sampleValue).getTime()) && /\d{4}-\d{2}-\d{2}/.test(sampleValue)) {
        // Further check to avoid misinterpreting numbers as dates, e.g. "2023"
        if (sampleValue.length > 7) return 'date'; 
    }
    return 'string';
  }
  
  return 'unknown';
}

// Helper function to count non-null values in a column
export function countNonNull(data: CsvRow[], columnName: string): number {
  return data.filter(row => row[columnName] != null && row[columnName] !== '').length;
}

// Helper function to count unique values in a column
export function countUniqueValues(data: CsvRow[], columnName: string): number {
  const uniqueValues = new Set(data.map(row => row[columnName]));
  return uniqueValues.size;
}

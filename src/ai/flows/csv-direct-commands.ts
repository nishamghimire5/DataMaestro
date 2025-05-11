'use server';
/**
 * @fileOverview Direct Natural Language CSV Processing
 * 
 * Allows users to provide natural language commands to process CSV data
 * AI directly converts these commands into actionable data transformations
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import Papa from 'papaparse';

import { LlmModel } from './schemas/csv-processor-types';

// Define the input schema for direct CSV processing with natural language
const CsvDirectCommandInputSchema = z.object({
  csvData: z.string().describe('The CSV data to process'),
  commands: z.string().describe('Natural language commands describing what changes to make to the CSV data'),
  originalFilename: z.string().optional().describe('The original filename for reference'),
  model: z.nativeEnum(LlmModel).optional().describe('The LLM model to use for processing'),
  modelOptions: z.object({
    geminiModel: z.string().optional().describe('The Gemini model version to use'),
    ollamaModel: z.string().optional().describe('The Ollama model to use')
  }).optional().describe('Model-specific options'),
});
export type CsvDirectCommandInput = z.infer<typeof CsvDirectCommandInputSchema>;

// Define a simplified version of the action schema that works better with Gemini
const SimpleActionSchema = z.object({
  description: z.string().describe('Description of the action taken'),
  affectedRows: z.number().describe('Number of rows affected by this action'),
  affectedColumns: z.array(z.string()).describe('Columns affected by this action')
});

// Define the output schema for direct CSV processing with simpler structure
const CsvDirectCommandOutputSchema = z.object({
  processedCsvData: z.string().describe('The processed CSV data after applying the commands'),
  summary: z.string().describe('A summary of the changes made to the CSV data'),
  appliedActions: z.array(SimpleActionSchema).describe('Detailed list of actions applied to the CSV data'),
  errorMessages: z.array(z.string()).optional().describe('Any error messages encountered during processing')
});
export type CsvDirectCommandOutput = z.infer<typeof CsvDirectCommandOutputSchema>;

// Define the prompt for direct CSV processing with explicit instructions for generating summary
const csvDirectCommandPrompt = ai.definePrompt({
  name: 'csvDirectCommandPrompt',
  input: { schema: CsvDirectCommandInputSchema },
  output: { schema: CsvDirectCommandOutputSchema },
  prompt: `You are an expert CSV data processor. Your task is to process CSV data using natural language commands.

Input CSV Data:
\`\`\`csv
{{{csvData}}}
\`\`\`

User Commands:
{{{commands}}}

{{#if originalFilename}}
Original Filename: {{{originalFilename}}}
{{/if}}

Your task is to:
1. Parse the CSV data
2. Apply the requested changes to the CSV data based on the commands
3. Return the processed CSV data 
4. Include a summary of all changes made
5. List each action taken with details

ALWAYS include the following fields in your response:
- processedCsvData: The modified CSV content as a string
- summary: A detailed summary of all changes made
- appliedActions: An array of actions, each with:
  - description: What the action did
  - affectedRows: How many rows were affected (as a number)
  - affectedColumns: Array of column names that were modified

Examples of commands the user might provide:
- "Standardize the values in the 'Item_Fat_Content' column to 'Low Fat' and 'Regular'"
- "Fill missing values in the 'Item_Weight' column with the mean value"
- "Remove duplicate rows"
- "Convert all text in the 'Outlet_Size' column to uppercase"

IMPORTANT: 
- The 'summary' field is REQUIRED and should describe all changes made
- Each action in 'appliedActions' must have all three properties
- If no changes were made, include a default action with zeros
`,
});

// Define a much simpler flow for direct CSV processing
export async function processCsvWithCommands(input: CsvDirectCommandInput): Promise<CsvDirectCommandOutput> {
  // Determine which model to use for processing
  const model = input.model || LlmModel.DEFAULT;
  
  console.log(`[CSV Direct Commands] Using model: ${model}`);
  if (model !== LlmModel.DEFAULT) {
    const modelOptions = input.modelOptions || {};
    if (model === LlmModel.GEMINI) {
      console.log(`[CSV Direct Commands] Using Gemini model: ${modelOptions.geminiModel || 'gemini-pro'}`);
    } else if (model === LlmModel.OLLAMA) {
      console.log(`[CSV Direct Commands] Using Ollama model: ${modelOptions.ollamaModel || 'llama3'}`);
    }
  }
  try {
    // Validate CSV data
    if (!input.csvData?.trim()) {
      return {
        processedCsvData: '',
        summary: 'No CSV data provided.',
        appliedActions: [{
          description: "No processing performed - empty CSV data",
          affectedRows: 0,
          affectedColumns: []
        }],
        errorMessages: ['Missing or empty CSV data']
      };
    }
    
    if (!input.commands?.trim()) {
      return {
        processedCsvData: input.csvData,
        summary: 'No commands provided for processing.',
        appliedActions: [{
          description: "No processing performed - no commands specified",
          affectedRows: 0,
          affectedColumns: []
        }],
        errorMessages: ['No processing commands were specified']
      };
    }

    // Basic validation of CSV structure
    const parseResult = Papa.parse(input.csvData, { 
      header: true, 
      skipEmptyLines: true 
    });

    if (parseResult.errors.length > 0) {
      console.warn("CSV parsing warnings:", parseResult.errors);
    }
      
    if (!parseResult.data || parseResult.data.length === 0) {
      return {
        processedCsvData: input.csvData,
        summary: 'Could not process CSV - invalid format or empty data.',
        appliedActions: [{
          description: "No processing performed - invalid CSV structure",
          affectedRows: 0,
          affectedColumns: []
        }],
        errorMessages: ['Invalid CSV format or empty data']
      };
    }    // Make a direct API call to process the data
    try {
      // Log which model is being used
      const model = input.model || LlmModel.DEFAULT;
      console.log(`Processing CSV with commands: "${input.commands}" using model: ${model}`);
      
      // Configure AI settings based on model selection
      let aiSettings: Record<string, any> = {};
      
      if (input.model === LlmModel.GEMINI && input.modelOptions?.geminiModel) {
        // Configure for Gemini
        aiSettings = { 
          model: input.modelOptions.geminiModel,
          provider: 'google'
        };
      } else if (input.model === LlmModel.OLLAMA && input.modelOptions?.ollamaModel) {
        // Configure for Ollama
        aiSettings = {
          model: input.modelOptions.ollamaModel,
          provider: 'ollama'
        };
      }
      
      // Try to get output from the AI with model settings
      const { output } = await csvDirectCommandPrompt(input, aiSettings);
      
      // If no error was thrown and output exists, use it
      if (output) {
        // Ensure all required fields exist
        const ensuredOutput = {
          processedCsvData: output.processedCsvData || input.csvData,
          summary: output.summary || `Processed CSV based on command: ${input.commands}`,
          appliedActions: (output.appliedActions || []).length > 0 ? output.appliedActions : [{
            description: "Processing completed but no specific actions were reported",
            affectedRows: 0,
            affectedColumns: []
          }],
          errorMessages: output.errorMessages || []
        };
        
        return ensuredOutput;
      } else {
        throw new Error("API returned empty response");
      }
        } catch (error: any) {
      console.error("Error during CSV command processing:", error);
      
      // Fallback to basic processing without AI
      
      // Parse the original data for processing
      const csvRows = parseResult.data as Record<string, any>[];
      const csvColumns = parseResult.meta.fields || [];
      let processedCsvData = input.csvData;
      let fallbackSummary = `Failed to process with AI. Command: "${input.commands}"`;
      
      // Attempt very basic fallback processing
      const lowercaseCommand = input.commands.toLowerCase();
      
      if (lowercaseCommand.includes("uppercase") || lowercaseCommand.includes("lowercase")) {
        // Try to extract column name from command
        const columnMatch = /\b(?:in|column|field)\s+['"]*([^'"]+)['"]*\b/i.exec(input.commands);
        
        if (columnMatch && columnMatch[1]) {
          const targetColName = columnMatch[1].trim();
          
          // Find the actual column (case-insensitive)
          const actualColumn = csvColumns.find((col: string) => 
            col.toLowerCase() === targetColName.toLowerCase());
            if (actualColumn) {
            let transformed = 0;
            const newData = csvRows.map((row: Record<string, any>) => {
              const cellValue = row[actualColumn];
              if (cellValue && typeof cellValue === 'string') {
                const oldValue = cellValue;
                if (lowercaseCommand.includes("uppercase")) {
                  row[actualColumn] = cellValue.toUpperCase();
                } else if (lowercaseCommand.includes("lowercase")) {
                  row[actualColumn] = cellValue.toLowerCase();
                }
                
                if (oldValue !== row[actualColumn]) transformed++;
              }
              return row;
            });
            
            processedCsvData = Papa.unparse(newData);
            
            const actionDesc = lowercaseCommand.includes("uppercase") 
              ? `Converted text in '${actualColumn}' to uppercase` 
              : `Converted text in '${actualColumn}' to lowercase`;
              
            return {
              processedCsvData,
              summary: `${actionDesc} (fallback processing)`,
              appliedActions: [{
                description: actionDesc,
                affectedRows: transformed,
                affectedColumns: [actualColumn]
              }],
              errorMessages: [`Used fallback processing due to API error: ${error.message}`]
            };
          }
        }
      }
      
      // Default fallback if no processing was done
      return {
        processedCsvData: input.csvData,
        summary: fallbackSummary,
        appliedActions: [{
          description: "Fallback processing attempted but no changes were made",
          affectedRows: 0,
          affectedColumns: []
        }],
        errorMessages: [`Error during processing: ${error.message}`]
      };
    }  } catch (finalError: any) {
    // Last resort error handler
    console.error("Critical error in CSV command processing:", finalError);
    return {
      processedCsvData: input.csvData || '',
      summary: "Critical error occurred during CSV processing",
      appliedActions: [{
        description: "Failed to process due to system error",
        affectedRows: 0,
        affectedColumns: []
      }],
      errorMessages: [finalError?.message || "Unknown error"]
    };
  }
}
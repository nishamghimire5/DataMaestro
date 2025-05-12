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
  prompt: `You are an expert CSV data processor. Your task is to process CSV data using natural language commands and return a JSON object.

Input CSV Data:
\`\`\`csv
{{{csvData}}}
\`\`\`
The first line of the Input CSV Data contains the column headers. Please use these exact headers for any column operations.

User Commands:
{{{commands}}}

{{#if originalFilename}}
Original Filename: {{{originalFilename}}}
{{/if}}

Key Instructions for Processing Commands:
1.  **Parse CSV Data**: Carefully parse the "Input CSV Data". Identify the exact column headers from the first line of this data. These are the only valid column names you should operate on.
2.  **Understand User Commands**:
    * **Column Identification**: When a command refers to a column (e.g., "in 'ColumnName'", "the 'ColumnName' column", "process ColumnX"), you MUST precisely match 'ColumnName' (or 'ColumnX') to one of the actual column headers found in the "Input CSV Data".
        * Refer to the headers extracted from the "Input CSV Data" for all column-related operations.
        * If a column name in a command does not exactly match any header in the "Input CSV Data", you should report this in the 'errorMessages' field and the 'summary', and avoid performing the action on a non-existent or incorrectly assumed column. Do not guess if the match is not clear and exact.
    * **Value Extraction for Filling/Replacement**: THIS IS THE MOST CRITICAL RULE FOR ACCURACY. When a command is to fill missing values or replace data (e.g., "fill COLUMN with VALUE", "replace X with Y", "set FIELD to Z"), the **VALUE** (or Y, or Z) is the literal string or number to be used.
        * **How to Isolate the True Value:**
            1.  Identify the core action phrase (e.g., "fill missing values in 'ColumnA' with", "set 'ColumnB' to").
            2.  The **TRUE VALUE** is the specific text or number that comes *immediately after* this action phrase, especially after prepositions like "with" or "to".
            3.  If this TRUE VALUE is enclosed in single quotes (e.g., 'My Value') or double quotes (e.g., "My Value"), use only the content *inside* the quotes. Do not include the quotes themselves unless explicitly part of the value.
            4.  **ABSOLUTELY DO NOT** use any part of the command's instructional phrasing (like "fill missing values", "in the column", "with the text") as the value to be inserted. The value is *data*, not an instruction.
        * **Targeted Example - Pay Close Attention:**
            * Command: "fill the missing values in 'Outlet_Size' with 'Unknown'"
                * Action Phrase identified: "fill the missing values in 'Outlet_Size' with "
                * **Correct Literal Value to Use:** \`Unknown\` (This is the string that follows "with" and is inside quotes).
                * **Incorrect & Forbidden Interpretation:** Do NOT use "fill the missing", "Outlet_Size", or any other segment of the command's structure as the replacement value. Only 'Unknown' is correct here.
            * Command: "set 'Item_Visibility' to 0.05"
                * Action Phrase: "set 'Item_Visibility' to "
                * **Correct Literal Value to Use:** \`0.05\` (the number)
        * **Final Check for Value:** Before applying, ask: "Is the extracted value the actual data intended for insertion, or is it part of the instruction language?" Only proceed if it's data.
3.  **Apply Changes**: Modify the CSV data strictly according to the interpreted commands, using the identified columns and extracted literal values.
4.  **Generate Summary**: Create a concise summary of all transformations performed. If no changes were made (e.g., due to no matching data or invalid commands), state this clearly. If actions could not be performed due to issues like non-existent columns, detail this in the summary.
5.  **List Actions**: Detail each specific action taken. For each action, specify the actual column names (from CSV headers) that were affected. If an action was attempted but failed (e.g., column not found), reflect this appropriately, possibly as an action with 0 affected rows and a note in its description or an error message.

Your task is to:
1.  Parse the "Input CSV Data" to understand its structure and actual column headers.
2.  Interpret and apply the "User Commands" to this data. Pay meticulous attention to:
    * Correctly identifying target columns by matching command references to the **actual CSV headers**.
    * **Most importantly: When a command involves filling or replacing data, meticulously isolate the *literal data value* as specified in the 'Value Extraction for Filling/Replacement' section, ensuring it is not a piece of the command instruction itself.**
3.  Return the entire modified CSV data as a single string in the 'processedCsvData' field.
4.  Provide a comprehensive 'summary' of all changes and attempted operations.
5.  List each action in 'appliedActions' with precise details, using actual CSV column names.

Return your response strictly as a JSON object with the following structure:
{
  "processedCsvData": "The_entire_modified_CSV_content_as_a_single_string",
  "summary": "A detailed summary of all changes made. For example: 'Filled 5 missing values in ColumnX with Y. Standardized ColumnZ to uppercase. Command to process ColumnW failed as ColumnW was not found.' If no changes were made, state that clearly. If a column mentioned in a command was not found, explain this.",
  "appliedActions": [
    {
      "description": "Description of the specific action taken, e.g., 'Filled missing values in Outlet_Size with Unknown' or 'Attempted to fill missing values in NonExistent_Column with XYZ but column was not found.'",
      "affectedRows": 123, // or 0 if action failed or no rows matched
      "affectedColumns": ["Outlet_Size"] // Use actual column names from CSV; could be empty if column not found
    }
    // Add other actions here if multiple were performed
  ],
  "errorMessages": ["Optional error message if any (e.g., 'Column 'XYZ' mentioned in command 'fill XYZ with 123' was not found in the CSV headers.'). Omit or use empty array if no errors."]
}

IMPORTANT JSON OUTPUT REQUIREMENTS:
- The 'summary' field is MANDATORY.
- The 'processedCsvData' field MUST contain the complete CSV data as a string, reflecting applied changes. If no changes are made due to errors or command nature, return the original CSV data.
- The 'appliedActions' array MUST be present. If no actions were performed or if an action failed, this should be clearly indicated in the action's description and 'affectedRows' should be 0. Each action object MUST have 'description' (string), 'affectedRows' (number), and 'affectedColumns' (array of strings, using actual column names from CSV header).
- Ensure 'affectedColumns' in 'appliedActions' accurately reflects the column names as they appear in the input CSV header. If a command targets a column that doesn't exist, 'affectedColumns' for that action might be an empty array.
- If a user command cannot be fully executed (e.g., specified column not found), this failure should be noted in 'summary', 'errorMessages', and potentially in the 'description' of an 'appliedActions' entry (with 'affectedRows: 0').

Examples of user commands you might process:
- "Standardize the values in the 'Item_Fat_Content' column to 'Low Fat' and 'Regular'"
- "Fill missing values in the 'Item_Weight' column with the mean value of that column"
- "Fill the missing values in 'Outlet_Size' with 'Unknown'" // Correctly interpret 'Unknown' as the literal value to fill.
- "Remove duplicate rows based on all columns"
- "Convert all text in the 'Outlet_Identifier' column to uppercase"
- "Delete the column named 'Obsolete_Data'"
- "In column 'Notes', replace every instance of 'draft' with 'final'"
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
      console.log(`[CSV Direct Commands] Using Gemini model: gemini-2.0-flash`);
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
      
      if (input.model === LlmModel.GEMINI) {
        // Always use the supported Gemini model, fully qualified
        aiSettings = { 
          model: 'googleai/gemini-2.0-flash',
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
      
      // ===== Pattern matching for various data replacement commands =====
      
      // 1. Fill missing values pattern
      const fillMissingRegex = /fill\s+(?:the\s+|all\s+)?missing\s+(?:values\s+)?(?:in\s+)?(?:(?:column|field|the\s+column)\s+)?['"]*([^'"]+)['"]*\s+(?:with|to)\s+['"]*([^'"]*)['"]*(?:\s|$)/i;
      const fillMissingMatch = fillMissingRegex.exec(input.commands);
      
      // 2. Fill nulls pattern (variations like "fill the nulls", "fill null values")
      const fillNullsRegex = /fill\s+(?:the\s+|all\s+)?(?:null|nulls|null\s+values|empty\s+values?)(?:\s+in\s+|\s+of\s+|\s+for\s+|\s+from\s+)?(?:(?:column|field|the\s+column)\s+)?['"]*([^'"]+)['"]*\s+(?:with|to)\s+['"]*([^'"]*)['"]*(?:\s|$)/i;
      const fillNullsMatch = fillNullsRegex.exec(input.commands);
      
      // 3. Change null/empty values pattern
      const changeNullRegex = /change\s+(?:the\s+|all\s+)?(?:null|nulls|null\s+values|empty|empty\s+values?)(?:\s+in\s+|\s+of\s+|\s+for\s+|\s+from\s+)?(?:(?:column|field|the\s+column)\s+)?['"]*([^'"]+)['"]*\s+(?:with|to)\s+['"]*([^'"]*)['"]*(?:\s|$)/i;
      const changeNullMatch = changeNullRegex.exec(input.commands);
      
      // 4. Replace nulls pattern
      const replaceNullRegex = /replace\s+(?:the\s+|all\s+)?(?:null|nulls|null\s+values|empty|empty\s+values?)(?:\s+in\s+|\s+of\s+|\s+for\s+|\s+from\s+)?(?:(?:column|field|the\s+column)\s+)?['"]*([^'"]+)['"]*\s+(?:with|by|to)\s+['"]*([^'"]*)['"]*(?:\s|$)/i;
      const replaceNullMatch = replaceNullRegex.exec(input.commands);
      
      // 5. Generic replace values pattern (e.g., "replace X with Y in column Z")
      const replaceValueRegex = /replace\s+(?:the\s+value\s+|values\s+|all\s+values\s+)?['"]*([^'"]+)['"]*\s+(?:with|by|to)\s+['"]*([^'"]*)['"]*\s+(?:in|of|for|from)\s+(?:(?:column|field|the\s+column)\s+)?['"]*([^'"]+)['"]*(?:\s|$)/i;
      const replaceValueMatch = replaceValueRegex.exec(input.commands);
      
      // 6. Set empty/missing values pattern
      const setEmptyRegex = /set\s+(?:the\s+|all\s+)?(?:empty|missing|null|nulls)(?:\s+values?\s+)?(?:in|of|for|from)?\s+(?:(?:column|field|the\s+column)\s+)?['"]*([^'"]+)['"]*\s+(?:with|to|as)\s+['"]*([^'"]*)['"]*(?:\s|$)/i;
      const setEmptyMatch = setEmptyRegex.exec(input.commands);
      
      // Function to process the matches and fill/replace values
      const processReplacement = (columnName: string, replacementValue: string, onlyReplaceEmpty: boolean = true, oldValue?: string) => {
        console.log(`[Command Processing] Detected command: Column='${columnName}', NewValue='${replacementValue}', OnlyReplaceEmpty=${onlyReplaceEmpty}${oldValue ? `, OldValue='${oldValue}'` : ''}`);
        console.log(`[Command Processing] Original API error (internal): ${error.message}`);
        
        // Find the actual column (case-insensitive)
        const actualColumn = csvColumns.find((col: string) => 
          col.toLowerCase() === columnName.toLowerCase());
          
        if (actualColumn) {
          let modifiedCount = 0;
          const newData = csvRows.map((row: Record<string, any>) => {
            const cellValue = row[actualColumn];
            
            if (onlyReplaceEmpty) {
              // Only replace empty/null values
              if (cellValue === undefined || cellValue === null || cellValue === '') {
                row[actualColumn] = replacementValue;
                modifiedCount++;
              }
            } else if (oldValue !== undefined) {
              // Replace specific value with new value
              if (String(cellValue) === String(oldValue)) {
                row[actualColumn] = replacementValue;
                modifiedCount++;
              }
            } else {
              // Replace all values (rarely used, but included for completeness)
              row[actualColumn] = replacementValue;
              modifiedCount++;
            }
            
            return row;
          });
          
          processedCsvData = Papa.unparse(newData);
          
          let actionDesc = '';
          if (onlyReplaceEmpty) {
            actionDesc = `Filled ${modifiedCount} missing/empty values in '${actualColumn}' with '${replacementValue}'`;
          } else if (oldValue !== undefined) {
            actionDesc = `Replaced ${modifiedCount} instances of '${oldValue}' with '${replacementValue}' in column '${actualColumn}'`;
          } else {
            actionDesc = `Changed all values in column '${actualColumn}' to '${replacementValue}' (${modifiedCount} rows affected)`;
          }
            
          return {
            processedCsvData,
            summary: actionDesc,
            appliedActions: [{
              description: actionDesc,
              affectedRows: modifiedCount,
              affectedColumns: [actualColumn]
            }],
            // Don't include internal API errors in the user-facing output
            errorMessages: []
          };
        } else {
          return {
            processedCsvData: input.csvData,
            summary: `Column '${columnName}' not found in CSV data.`,
            appliedActions: [{
              description: `Attempted to modify values in '${columnName}', but column was not found.`,
              affectedRows: 0,
              affectedColumns: []
            }],
            errorMessages: [`Column '${columnName}' not found in CSV data.`]
          };
        }
      };
      
      // Process matches in order of specificity
      if (fillMissingMatch && fillMissingMatch.length >= 3) {
        return processReplacement(fillMissingMatch[1].trim(), fillMissingMatch[2].trim(), true);
      }
      else if (fillNullsMatch && fillNullsMatch.length >= 3) {
        return processReplacement(fillNullsMatch[1].trim(), fillNullsMatch[2].trim(), true);
      }
      else if (changeNullMatch && changeNullMatch.length >= 3) {
        return processReplacement(changeNullMatch[1].trim(), changeNullMatch[2].trim(), true);
      }
      else if (replaceNullMatch && replaceNullMatch.length >= 3) {
        return processReplacement(replaceNullMatch[1].trim(), replaceNullMatch[2].trim(), true);
      }
      else if (setEmptyMatch && setEmptyMatch.length >= 3) {
        return processReplacement(setEmptyMatch[1].trim(), setEmptyMatch[2].trim(), true);
      }
      else if (replaceValueMatch && replaceValueMatch.length >= 4) {
        // Note: For replaceValueMatch, the column is in position 3, and old/new values in 1/2
        return processReplacement(replaceValueMatch[3].trim(), replaceValueMatch[2].trim(), false, replaceValueMatch[1].trim());
      }
      // ===== END pattern matching for data replacement commands =====
      
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
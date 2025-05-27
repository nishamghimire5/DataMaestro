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
  prompt: `You are an experienced senior data scientist with extensive expertise in data manipulation, statistical analysis, and machine learning. With years of professional experience working with diverse datasets across industries, you have mastered techniques for data cleaning, transformation, analysis, and visualization. You understand common data problems and effective solutions for them. You're proficient with statistical methods, data modeling approaches, and best practices for data processing workflows. Your task is to process CSV data using natural language commands and return a JSON object.

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
        * **Final Check for Value:** Before applying, ask: "Is the extracted value the actual data intended for insertion, or is it part of the instruction language?" Only proceed if it's data.    * **Interpreting "Standardize" Commands**:
        * When a command is to "standardize" a column (e.g., "standardize ColumnA to 'X' and 'Y'"), the goal is to map existing values in that column to the specified target values ('X', 'Y').
        * If the command is like "standardize ColumnA to 'X' and 'Y' **only**", this implies that all unique values in ColumnA should be converted to *either* 'X' *or* 'Y'.
        * You will need to infer the mapping based on the distinct values present in the column from the provided "Input CSV Data" sample. For example, if ColumnA contains "Apple", "Ant", "Banana", "Bear" and the command is "standardize ColumnA to 'Fruit' and 'Animal' only", you should map "Apple" to 'Fruit', "Ant" to 'Animal', "Banana" to 'Fruit', and "Bear" to 'Animal'.
        * If the command provides explicit mappings (e.g., "standardize ColumnA by changing 'old_value_1' to 'X', 'old_value_2' to 'Y'"), prioritize those explicit mappings.
        * List the specific mappings made in the action's 'description' and 'summary'. If the mapping is too ambiguous to perform confidently with the provided data and command, state this clearly in 'summary' and 'errorMessages', and do not alter the data for that specific standardization task.    * **Handling Conditional Value Operations**:
        * When a command involves conditional operations like "change all values less than X to Y" or "replace values greater than X with Y", first identify:
            1. The target column that contains numeric or date values.
            2. The condition type (less than, greater than, equal to, not equal to, etc.).
            3. The threshold/comparison value.
            4. The replacement value to apply when the condition is met.
        * For numeric comparison commands:
            * Support phrases like "less than", "lesser than", "smaller than", "lower than", "<", "≤", "<=", "greater than", "bigger than", "larger than", ">", "≥", ">=", "equal to", "equals", "=", "not equal to", "!=", etc. 
            * Example: For "change all values less than 100 to 1000 in column 'Price'", you should:
                * Identify 'Price' as the target column 
                * Recognize the condition "less than 100"
                * Apply the replacement value "1000" to all cells where the current value < 100        
        * For pattern matching commands:
            * Support phrases like "contains", "starts with", "ends with", "matches", "has pattern", etc.
            * Support SQL-like wildcard patterns: 
                * "%" represents any sequence of characters (like SQL's % wildcard)
                * E.g., "big %" means "starts with big"
                * E.g., "% big" means "ends with big"
                * E.g., "% big %" means "contains big"
            * Example: "set all values that contain 'big' to 'large' in 'Size' column"
                * Identify 'Size' as the target column
                * Apply replacement value 'large' to all cells containing the substring 'big'
            * Example: "change all values matching 'big %' to 'large items' in 'Product' column"
                * Identify 'Product' as the target column
                * Apply replacement value 'large items' to all cells starting with 'big '
            * Example: "standardize all the column values in 'car' to 'big' and 'small' only"
                * This combines standardization with pattern matching
        * For percentage-based commands:
            * Support phrases like "top 10%", "bottom 5%", "highest 20%", "lowest 15%", etc.
            * Example: "replace the top 5% values in 'Score' with 100"
                * Identify 'Score' as the target column
                * Calculate the 95th percentile threshold
                * Replace values above that threshold with 100
        * Include the comparison logic details in the action's 'description' and 'summary'.
    * **Date and Time Operations**:
        * Support date formatting and transformation commands, such as:
            * "Convert dates in 'Order_Date' to YYYY-MM-DD format"
            * "Extract month from 'Transaction_Date' to a new column 'Transaction_Month'"
            * "Convert 'Date_Created' from MM/DD/YYYY to DD/MM/YYYY"
        * Support date-based filtering and comparison:
            * "Flag all records with 'Date' older than 2023-01-01"
            * "Remove rows where 'Delivery_Date' is before 'Order_Date'"
            * "Replace values in 'Status' with 'Late' where 'Actual_Date' is after 'Deadline_Date'"
    * **Statistical Transformations**:
        * Support statistical calculations and replacements:
            * "Replace missing values in 'Revenue' with the median of that column"
            * "Add a new column 'Z_Score' with the z-score of 'Performance'"
            * "Create a column 'Deviation' showing the difference from mean for 'Sales'"
            * "Normalize the values in 'Data' column to range between 0 and 1"
            * "Calculate moving average of 'Daily_Sales' with window size 7"
        * Outlier detection and handling:
            * "Replace outliers in 'Price' (>3 std dev) with the column's median"
            * "Flag rows where 'Value' is an outlier based on IQR"    * **Text Processing and Extraction**:
        * Support text manipulation commands:
            * "Extract the first 5 characters from 'Product_Code' into a new column 'Category_Code'"
            * "Split 'Full_Name' into 'First_Name' and 'Last_Name'"
            * "Concatenate 'City', 'State', and 'Zip' into a new column 'Location' separated by commas"
            * "Remove all special characters from 'Description'"
            * "Replace multiple spaces with a single space in 'Notes'"
        * Pattern extraction and validation:
            * "Extract email domains from 'Email' column to 'Domain' column"
            * "Validate 'Phone_Number' column and flag invalid formats"
            * "Extract the numeric part from 'Product_ID' to 'Product_Number'"
    * **Data Classification and Binning**:
        * Support binning numeric data into categories:
            * "Bin 'Age' column into categories: '<18', '18-35', '36-65', '>65'"
            * "Create 'Price_Range' column with 'Low' for <50, 'Medium' for 50-100, 'High' for >100"
            * "Group 'Score' into quartiles labeled 'Q1', 'Q2', 'Q3', 'Q4'"
        * Support classification based on conditions:
            * "Classify 'Transaction_Size' as 'Small' if <1000, 'Medium' if 1000-5000, else 'Large'"
            * "Create 'Risk_Category' based on combined values of 'Credit_Score' and 'Income'"
    * **Missing Value Handling**:
        * Support advanced missing value strategies:
            * "Fill missing values in 'Temperature' using linear interpolation"
            * "Impute missing values in 'Income' based on 'Education' and 'Occupation'"
            * "Fill forward missing values in 'Stock_Price'"
            * "Replace missing values in numeric columns with column means"
            * "Drop rows with more than 50% missing values"
    * **Dataset and Column Operations**:
        * Support structural changes:
            * "Pivot data from 'Month' column creating columns for each month with 'Sales' values"
            * "Melt columns 'Q1_Sales', 'Q2_Sales', 'Q3_Sales', 'Q4_Sales' into 'Quarter' and 'Sales' columns"
            * "Transpose the dataset using the first column as header"
        * Support sampling and splitting:
            * "Sample 10% of rows randomly"
            * "Extract every 5th row starting from the first"
            * "Split dataset into 80% training and 20% testing sets"
3.  **Apply Changes**: Modify the CSV data strictly according to the interpreted commands, using the identified columns and extracted literal values.

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
- "Change all values less than 100 to 1000 in the 'Price' column"
- "Replace all values greater than or equal to 50 with 'High' in 'Score' column"
- "Set all values not equal to 'Approved' to 'Pending' in 'Status' column"
- "In 'Product_Size' column, change all values containing 'big' to 'large'"
- "Replace the top 10% of values in 'Revenue' with their mean"
- "Standardize all column values in 'car' to 'big' and 'small' only, where values with 'truck' are 'big'"
- "Change all values between 10 and 20 to 15 in column 'Rating'"
- "Set all values that start with 'temp' to 'temporary' in the 'Category' column"
- "Replace the bottom 5% of values in 'Performance' with 0"
- "Update all values matching 'big %' to 'large product' in 'Item_Description'"
- "Set values matching '% small' to 'compact' in 'Product_Type'"
- "Change all values matching '% medium %' to 'standard size' in 'Size_Description'"
- "Convert dates in 'Order_Date' to YYYY-MM-DD format"
- "Replace missing values in 'Revenue' with the median of that column"
- "Extract the first 5 characters from 'Product_Code' into a new column 'Category_Code'"
- "Flag rows where 'Amount' is an outlier (beyond 1.5 IQR)"
- "Calculate the z-score of 'Performance' values in a new column 'Performance_Z'"
- "Split 'Full_Name' column into separate 'First_Name' and 'Last_Name' columns"
- "Flag all records where 'Transaction_Date' is older than 2023-01-01"
- "Create a column 'Price_Category' with 'Low' for values <50, 'Medium' for 50-100, 'High' for >100"
- "Standardize all phone numbers in 'Contact' column to format XXX-XXX-XXXX"
- "Calculate moving average of 'Daily_Sales' with window size 7"
- "Extract email domains from 'Email' column to a new column 'Domain'"
- "Replace outliers in 'Value' (beyond 3 standard deviations) with the median"
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
      console.log(`[CSV Direct Commands] Using Gemini model: gemini-2.5-flash-preview-05-20`);
    } else if (model === LlmModel.OLLAMA) {
      console.log(`[CSV Direct Commands] Using Ollama model: ${modelOptions.ollamaModel || 'gemma3:4b'}`);
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
      let aiSettings: Record<string, any> = {
        
      };
      
      if (input.model === LlmModel.GEMINI) {
        // Always use the supported Gemini model, fully qualified
        aiSettings = { 
          model: 'googleai/gemini-2.5-flash-preview-05-20'
          // provider: 'google' // This is likely not needed as 'googleai/gemini-2.5-flash-preview-05-20' implies the provider
        };
      } else if (input.model === LlmModel.OLLAMA) {
        // Configure for Ollama - use the ollamaModel from options or the actual model name from 'ollama list'
        const ollamaModel = input.modelOptions?.ollamaModel || 'gemma3:4b';
        
        // Use the globally configured Ollama plugin by specifying the fully qualified model name
        // This ensures Genkit uses the 'ollama' plugin defined in 'ai-instance.ts' which knows about 'gemma3:4b'
        aiSettings = {
          model: `ollama/${ollamaModel}` // e.g., "ollama/gemma3:4b"
        };
      }
      
      // Try to get output from the AI with model settings
      const { output } = await csvDirectCommandPrompt(input, aiSettings);
      // If no error was thrown and output exists, use it
      if (output) {
        // CRITICAL FIX: Always ensure the summary property exists to avoid schema validation errors
        if (!output.summary) {
          console.warn("Missing 'summary' field in AI output - adding default summary to prevent schema validation errors");
        }
        // Ensure all required fields exist with strict checking for summary
        const ensuredOutput = {
          processedCsvData: output.processedCsvData || input.csvData,
          summary: output.summary || `CSV processed with command: "${input.commands}"`, // Always provide a fallback summary
          appliedActions: (output.appliedActions || []).length > 0 ? output.appliedActions : [{
            description: "Processing completed but no specific actions were reported",
            affectedRows: 0,
            affectedColumns: []
          }],
          errorMessages: output.errorMessages || []
        };
        
        return ensuredOutput;
      } else {
        // Even when the response is empty, provide a valid output with required fields
        return {
          processedCsvData: input.csvData,
          summary: `Processing attempt with "${input.commands}" returned no output - using original data`,
          appliedActions: [{
            description: "No actions performed due to empty AI response",
            affectedRows: 0,
            affectedColumns: []
          }],
          errorMessages: ["API returned empty response"]
        };
      }
    } catch (error: any) {
      console.error("Error during CSV command processing:", error);
      
      // Check if the error is related to missing 'summary' field 
      const isSummaryError = error?.message?.includes("must have required property 'summary'") || 
                             error?.originalMessage?.includes("must have required property 'summary'");
      
      if (isSummaryError) {
        console.warn(`[CSV Direct Commands] AI output for command "${input.commands}" was missing the 'summary' field. Attempting to recover using AI's partial data if available, otherwise using original data with a fallback summary.`);

        const attemptedAiOutput = (typeof error.detail === 'object' && error.detail !== null && !Array.isArray(error.detail)) 
                                  ? error.detail as Partial<CsvDirectCommandOutput> 
                                  : undefined;

        // Use AI's processed data if available and non-empty, otherwise fall back to original input data.
        const recoveredProcessedCsvData = (attemptedAiOutput?.processedCsvData && attemptedAiOutput.processedCsvData.trim() !== '') 
                                          ? attemptedAiOutput.processedCsvData 
                                          : input.csvData;
        
        let recoveredAppliedActions;
        if (attemptedAiOutput?.appliedActions && Array.isArray(attemptedAiOutput.appliedActions) && attemptedAiOutput.appliedActions.length > 0) {
          recoveredAppliedActions = attemptedAiOutput.appliedActions;
        } else {
          recoveredAppliedActions = [{
            description: `Processing of command "${input.commands}" attempted, but AI response was incomplete (missing 'summary'). Actual actions performed by AI are unknown or partially reported.`,
            affectedRows: 0,
            affectedColumns: []
          }];
        }

        const recoveredErrorMessages: string[] = [`AI response for command "${input.commands}" was missing the required 'summary' field.`];
        if (attemptedAiOutput?.errorMessages && Array.isArray(attemptedAiOutput.errorMessages)) {
          recoveredErrorMessages.push(...attemptedAiOutput.errorMessages);
        }
        
        let processingMessage = "";
        if (recoveredProcessedCsvData !== input.csvData) {
          processingMessage = "used AI's processed data";
          recoveredErrorMessages.push("Successfully recovered and used processed data from AI's partial response.");
        } else if (attemptedAiOutput?.processedCsvData) { // AI data was present but falsy (e.g. empty string) or error.detail was not structured as expected
          processingMessage = "original data returned (AI data was present but unusable/empty or not found in error details)";
          recoveredErrorMessages.push("AI might have provided processed data, but it was empty, unusable, or not found in the expected error structure; original data is being returned.");
        } else { // No processedCsvData found in attemptedAiOutput
           processingMessage = "original data returned (no AI data found in error details)";
           recoveredErrorMessages.push("No processed data was recoverable from AI's partial response; original data is being returned.");
        }
        
        if (error.message && error.message !== recoveredErrorMessages[0]) { // Avoid duplicating the main known issue
            recoveredErrorMessages.push(`Underlying error context: ${error.message}`);
        }

        let finalSummary: string;

        if (recoveredProcessedCsvData !== input.csvData) { // AI's processed data was successfully recovered and used
            // Check if recoveredAppliedActions are the actual actions from AI, not our fallback
            const aiActions = (attemptedAiOutput?.appliedActions && 
                             Array.isArray(attemptedAiOutput.appliedActions) && 
                             attemptedAiOutput.appliedActions.length > 0 && 
                             recoveredAppliedActions === attemptedAiOutput.appliedActions) 
                            ? recoveredAppliedActions 
                            : null;
            
            const firstActionDescription = aiActions?.[0]?.description;

            if (firstActionDescription) {
                finalSummary = `Recovered: ${firstActionDescription} (AI response was initially missing 'summary'). Data source: AI's processed data.`;
                if (aiActions!.length > 1) { // aiActions is confirmed not null here
                    finalSummary += ` And ${aiActions!.length - 1} other action(s).`;
                }
                // Append any AI-provided error messages to the summary if they exist and AI data was used.
                if (attemptedAiOutput?.errorMessages && attemptedAiOutput.errorMessages.length > 0) {
                    finalSummary += ` AI also reported: ${attemptedAiOutput.errorMessages.join('; ')}`;
                }
            } else {
                // AI data used, but no usable description from AI's appliedActions, or aiActions were our fallback
                finalSummary = `Successfully processed command "${input.commands}" using recovered AI data. (AI response was initially missing 'summary' or its action descriptions were empty/missing).`;
                if (attemptedAiOutput?.errorMessages && attemptedAiOutput.errorMessages.length > 0) {
                    finalSummary += ` AI also reported: ${attemptedAiOutput.errorMessages.join('; ')}`;
                }
            }
        } else { // Original data is being returned (AI data not used or not available)
            // processingMessage already explains why original data is returned.
            finalSummary = `AI response for command "${input.commands}" was incomplete (missing 'summary'). ${processingMessage}.`;
            // Note: If there was a different underlying error.message, it's already added to recoveredErrorMessages.
        }

        return {
          processedCsvData: recoveredProcessedCsvData,
          summary: finalSummary,
          appliedActions: recoveredAppliedActions,
          errorMessages: recoveredErrorMessages.filter((msg, index, self) => self.indexOf(msg) === index) // Deduplicate messages
        };
      }
      
      // Fallback to basic processing without AI for other errors
      
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
        return processReplacement(replaceValueMatch[3].trim(), replaceValueMatch[2].trim(), false, replaceValueMatch[1].trim());
      }
      // ===== END pattern matching =====

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
              const cellValue = row[actualColumn!];
              if (cellValue && typeof cellValue === 'string') {
                row[actualColumn!] = lowercaseCommand.includes("uppercase") ? cellValue.toUpperCase() : cellValue.toLowerCase();
                transformed++;
              }
              return row;
            });

            processedCsvData = Papa.unparse(newData);
            const caseType = lowercaseCommand.includes("uppercase") ? "uppercase" : "lowercase";
            const actionDesc = `Converted ${transformed} values in column '${actualColumn}' to ${caseType}.`;
            
            return {
              processedCsvData,
              summary: actionDesc,
              appliedActions: [{
                description: actionDesc,
                affectedRows: transformed,
                affectedColumns: [actualColumn!]
              }],
              errorMessages: []
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
    
    // Always ensure we have a valid summary that includes the user's command
    const finalSummary = input.commands ? 
      `Critical error occurred while processing command: "${input.commands}"` :
      "Critical error occurred during CSV processing";
      
    return {
      processedCsvData: input.csvData || '',
      summary: finalSummary, // Make sure summary is detailed and never empty
      appliedActions: [{
        description: "Failed to process due to system error",
        affectedRows: 0,
        affectedColumns: []
      }],
      errorMessages: [finalError?.message || "Unknown error"]
    };
  }
}
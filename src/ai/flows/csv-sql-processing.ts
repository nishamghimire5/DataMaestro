'use server';
/**
 * @fileOverview SQL-like CSV Data Processing
 *
 * Provides SQL-like processing capabilities for CSV data to offer a more
 * direct approach to data manipulation as an alternative to step-by-step suggestions.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import Papa from 'papaparse';

// Define the input schema for CSV SQL processing
const CsvSqlProcessInputSchema = z.object({
  csvData: z.string().describe('The CSV data to process'),
  sqlQuery: z.string().describe('A SQL-like query to process the CSV data'),
  originalFilename: z.string().optional().describe('The original filename for reference'),
});
export type CsvSqlProcessInput = z.infer<typeof CsvSqlProcessInputSchema>;

// Define the output schema for CSV SQL processing
const CsvSqlProcessOutputSchema = z.object({
  processedCsvData: z.string().describe('The processed CSV data after SQL operations'),
  summary: z.string().describe('A summary of the operations performed'),
  columnInfo: z.array(
    z.object({
      name: z.string().describe('Column name'),
      dataType: z.string().describe('Inferred data type'),
      nonNullCount: z.number().describe('Number of non-null values'),
      uniqueValueCount: z.number().describe('Number of unique values')
    })
  ).describe('Information about columns in the processed data'),
  errorLog: z.array(z.string()).optional().describe('Any errors encountered during processing'),
  isSelectQuery: z.boolean().optional().describe('Whether this is a SELECT query that should only display results without changing data'),
  originalCsvData: z.string().optional().describe('The original CSV data, preserved for SELECT queries')
});
export type CsvSqlProcessOutput = z.infer<typeof CsvSqlProcessOutputSchema>;

// Define the prompt for SQL-like CSV processing
const csvSqlProcessPrompt = ai.definePrompt({
  name: 'csvSqlProcessPrompt',
  input: { schema: CsvSqlProcessInputSchema },
  output: { schema: CsvSqlProcessOutputSchema },
  prompt: `You are an expert CSV data processor with SQL capabilities. Your task is to process CSV data using a SQL-like query provided by the user.

Input CSV Data:
\`\`\`csv
{{{csvData}}}
\`\`\`

SQL-like Query to Execute:
\`\`\`sql
{{{sqlQuery}}}
\`\`\`

{{#if originalFilename}}
Original Filename: {{{originalFilename}}}
{{/if}}

Your task is to:

1. Parse the CSV data and understand its structure (columns, data types)
2. Interpret and execute the SQL-like query on the CSV data
3. Return the processed data in CSV format
4. Provide a summary of what operations were performed
5. Include information about the columns in the output (name, data type, non-null count, unique value count)

Supported SQL operations:
- SELECT columns (including * for all columns)
- WHERE conditions (filtering rows)
- UPDATE statements (modifying values)
- CASE statements for conditional updates
- Basic functions: TRIM(), UPPER(), LOWER(), SUBSTR()
- Aggregation functions: COUNT(), AVG(), SUM(), MIN(), MAX()
- GROUP BY for aggregation
- ORDER BY for sorting
- LIMIT for limiting results
- DELETE for removing rows
- JOIN operations on multiple CSV data sources (not applicable in this context)

Handle errors gracefully by:
- Providing clear error messages for syntax issues
- Noting which rows may have been affected by errors
- Continuing processing when possible

Your output should be:
1. The processed CSV data after executing the SQL operations
2. A summary of what was done
3. Information about the columns in the final data
4. A log of any errors encountered during processing (if any)`,
});

// Define the flow for SQL-like CSV processing
const csvSqlProcessFlow = ai.defineFlow(
  {
    name: 'csvSqlProcessFlow',
    inputSchema: CsvSqlProcessInputSchema,
    outputSchema: CsvSqlProcessOutputSchema,
  },
  async (input) => {
    try {
      // Make sure we have valid CSV data
      if (!input.csvData.trim()) {
        return {
          processedCsvData: '',
          summary: 'No CSV data provided.',
          columnInfo: [],
          errorLog: ['Missing or empty CSV data']
        };
      }
      
      // Parse the original CSV data to validate it
      const parseResult = Papa.parse(input.csvData, { 
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false
      });
      
      if (parseResult.errors.length > 0) {
        console.warn("CSV parsing warnings:", parseResult.errors);
      }
      
      if (!parseResult.data || parseResult.data.length === 0) {
        return {
          processedCsvData: input.csvData,
          summary: 'Failed to parse CSV data or data is empty.',
          columnInfo: [],
          errorLog: ['Invalid CSV format or empty data']
        };
      }
      
      // Process the data using the AI model
      const { output } = await csvSqlProcessPrompt(input);
      
      if (!output) {
        throw new Error('AI model did not return an output for CSV SQL processing.');
      }
      
      // Return the processed data
      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        processedCsvData: input.csvData || '',
        summary: `Error during SQL processing: ${errorMessage}`,
        columnInfo: [],
        errorLog: [`Processing failed: ${errorMessage}`]
      };
    }
  }
);

// Export the function for use in the application
export async function processCsvWithSql(input: CsvSqlProcessInput): Promise<CsvSqlProcessOutput> {
  return csvSqlProcessFlow(input);
}
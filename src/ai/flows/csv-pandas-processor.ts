'use server';

import Papa from 'papaparse';
import {
  LlmModel,
  type CsvPandasProcessInput,
  type CsvPandasProcessOutput,
  type CsvRow
} from './schemas/csv-processor-types';
import {
  generatePythonCode,
  generateSqlQuery,
  inferDataType,
  countNonNull,
  countUniqueValues
} from './csv-processor-helpers';

/**
 * Process CSV data using pandas-style operations. This is a Next.js Server Action.
 */
export default async function processCsvWithPandas({
  csvData,
  command,
  // originalFilename = 'data.csv', // originalFilename is not used in the current logic
  model = LlmModel.DEFAULT,
  modelOptions = {}
}: CsvPandasProcessInput): Promise<CsvPandasProcessOutput> {
  let data: CsvRow[] = [];
  let headers: string[] = [];
  const errorLog: string[] = [];
  let pythonCode: string | undefined;
  let sqlQuery: string | undefined;

  try {
    // Synchronously attempt to parse CSV data
    // PapaParse's synchronous parsing happens if no callback is provided to `parse`
    // However, to be robust, especially with error handling and header detection, 
    // using the `complete` and `error` callbacks is safer, but makes the flow async.
    // For Server Actions, keeping it straightforward:
    const parseResult = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (parseResult.errors && parseResult.errors.length > 0) {
      parseResult.errors.forEach((err: any) => {
        errorLog.push(`CSV Parsing Error: ${err.message} (Row: ${err.row})`);
      });
      // If there are parsing errors, decide if it's critical
      // For now, we'll log and attempt to continue if data was partially parsed
    }

    data = parseResult.data as CsvRow[];
    headers = parseResult.meta.fields || (data.length > 0 ? Object.keys(data[0]) : []);

    if (data.length === 0 && errorLog.length === 0) {
        errorLog.push('CSV Parsing resulted in no data. Please check the CSV format.');
    }
    
    if (errorLog.length > 0 && data.length === 0) { // Critical parsing error, no data
      return {
        processedCsvData: csvData,
        summary: 'Error during CSV parsing, no data processed.',
        columnInfo: [],
        errorLog,
      };
    }

    // Generate code based on the selected model and user command
    if (model !== LlmModel.DEFAULT) {
      try {
        [pythonCode, sqlQuery] = await Promise.all([
          generatePythonCode(command, headers, data.slice(0, 10), model, modelOptions),
          generateSqlQuery(command, headers, data.slice(0, 10), model, modelOptions)
        ]);
      } catch (generationError) {
        const genErrorMessage = generationError instanceof Error ? generationError.message : String(generationError);
        errorLog.push(`Code generation error: ${genErrorMessage}`);
        pythonCode = `# Error during code generation: ${genErrorMessage}`;
        sqlQuery = `-- Error during code generation: ${genErrorMessage}`;
      }
    } else {
      pythonCode = `
import pandas as pd
# Default processing for command: ${command}
# Assuming 'df' is the DataFrame loaded from CSV
# df = pd.read_csv(your_csv_file_path) # Example of loading data
result_df = df.copy() # Placeholder for actual operations
      `;
      sqlQuery = `SELECT * FROM csv_data WHERE ${command.replace(/'/g, "''")};`; // Basic escaping
    }
    
    const columnInfo = headers.length > 0 ? headers.map(name => ({
      name,
      dataType: inferDataType(data, name),
      nonNullCount: countNonNull(data, name),
      uniqueValueCount: countUniqueValues(data, name)
    })) : [];
    
    return {
      processedCsvData: csvData, // Placeholder
      summary: `Processed ${data.length} rows with ${headers.length} columns. Check generated code.`, 
      columnInfo,
      pythonCode,
      sqlQuery,
      errorLog
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errorLog.push(`Overall processing error: ${errorMessage}`);
    
    return {
      processedCsvData: csvData,
      summary: 'Error occurred during processing',
      columnInfo: [],
      errorLog,
      pythonCode, 
      sqlQuery    
    };
  }
}

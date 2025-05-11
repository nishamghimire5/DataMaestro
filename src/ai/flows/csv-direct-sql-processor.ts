'use server';
/**
 * @fileOverview Direct SQL Processing for CSV Data
 * 
 * A direct implementation of SQL-like processing for CSV data that
 * doesn't rely on AI model response schemas, avoiding validation errors.
 */

import Papa from 'papaparse';

// Define a type for a CSV row when header: true and dynamicTyping: true
// Values can be string, number, boolean, or null/undefined from PapaParse
type CsvRow = Record<string, string | number | boolean | null | undefined>;

type CsvSqlProcessInput = {
  csvData: string;
  sqlQuery: string;
  originalFilename?: string;
};

type CsvSqlProcessOutput = {
  processedCsvData: string;
  summary: string;
  columnInfo: Array<{
    name: string;
    dataType: string;
    nonNullCount: number;
    uniqueValueCount: number;
  }>;
  errorLog?: string[];
};

/**
 * Process CSV data using SQL-like queries without relying on AI models
 */
export async function processDirectSql(input: CsvSqlProcessInput): Promise<CsvSqlProcessOutput> {
  try {
    // Input validation
    if (!input.csvData?.trim()) {
      return {
        processedCsvData: '',
        summary: 'No CSV data provided.',
        columnInfo: [],
        errorLog: ['Missing or empty CSV data']
      };
    }
    
    if (!input.sqlQuery?.trim()) {
      return {
        processedCsvData: input.csvData,
        summary: 'No SQL query provided for processing.',
        columnInfo: [],
        errorLog: ['No SQL query was specified']
      };
    }

    // Parse the CSV data
    const parseResult = Papa.parse(input.csvData, { 
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });
    
    if (parseResult.errors.length > 0) {
      console.warn("CSV parsing warnings:", parseResult.errors);
    }
    
    if (!parseResult.data || parseResult.data.length === 0) {
      return {
        processedCsvData: input.csvData,
        summary: 'Invalid CSV data structure.',
        columnInfo: [],
        errorLog: ['Failed to parse CSV or data is empty']
      };
    }

    // Copy the data for processing, now with explicit typing
    let data: CsvRow[] = [...parseResult.data] as CsvRow[];
    const headers = (parseResult.meta.fields || []) as string[];
    const sqlQuery = input.sqlQuery.trim();
    const errors: string[] = [];

    // Track changes
    let rowsAffected = 0;
    let operation = 'UNKNOWN';
    let columnsAffected: string[] = [];

    // Simple SQL parser for basic operations
    // UPDATE operation
    if (sqlQuery.toUpperCase().startsWith('UPDATE')) {
      operation = 'UPDATE';
      try {
        // Parse the UPDATE statement
        // Example: UPDATE data SET column1 = 'value' WHERE column2 = 'condition'
        const updateRegex = /UPDATE\s+(?:data|table|\w+)\s+SET\s+([^=\s]+)\s*=\s*['"](.*?)['"](?:\s+WHERE\s+(.+))?/i;
        const match = sqlQuery.match(updateRegex);
        
        if (!match) {
          throw new Error('Invalid UPDATE syntax. Expected: UPDATE data SET column = \'value\' WHERE condition');
        }
        
        let columnToUpdate = match[1]?.trim();
        const newValue = match[2];
        const whereClause = match[3];
        
        // Validate column name
        if (!columnToUpdate || !headers.includes(columnToUpdate)) {
          const similarColumn = headers.find(h => h.toLowerCase() === columnToUpdate.toLowerCase());
          if (similarColumn) {
            errors.push(`Column name case mismatch. Did you mean '${similarColumn}'?`);
            columnToUpdate = similarColumn;
          } else {
            throw new Error(`Column '${columnToUpdate}' not found in data. Available columns: ${headers.join(', ')}`);
          }
        }
        
        columnsAffected.push(columnToUpdate);
        
        // Process the WHERE clause
        if (whereClause) {
          // Handle basic IN condition: WHERE column IN ('value1', 'value2', ...)
          const inRegex = /([^=\s]+)\s+IN\s+\(\s*((?:['"][^'"]*['"](?:\s*,\s*['"][^'"]*['"])*)?)\s*\)/i;
          const inMatch = whereClause.match(inRegex);
          
          if (inMatch) {
            let whereColumn = inMatch[1]?.trim();
            
            // Validate where column name
            if (!whereColumn || !headers.includes(whereColumn)) {
              const similarWhereColumn = headers.find(h => h.toLowerCase() === whereColumn.toLowerCase());
              if (similarWhereColumn) {
                errors.push(`WHERE clause column name case mismatch. Did you mean '${similarWhereColumn}'?`);
                whereColumn = similarWhereColumn;
              } else {
                throw new Error(`Column '${whereColumn}' in WHERE clause not found in data.`);
              }
            }
            
            // Parse the values in the IN clause
            const valuesString = inMatch[2];
            const valueRegex = /['"]([^'"]*)['"]/g;
            const values: string[] = [];
            
            let valueMatch;
            while ((valueMatch = valueRegex.exec(valuesString)) !== null) {
              values.push(valueMatch[1]);
            }
            
            if (values.length === 0) {
              throw new Error('No values found in IN clause.');
            }
            
            // Apply the update with IN condition
            data.forEach((row, index) => {
              const currentValue = String(row[whereColumn!]); // Added non-null assertion for whereColumn as it's validated
              if (values.some(v => String(v).toLowerCase() === currentValue.toLowerCase())) {
                if (data[index]) {
                  (data[index] as CsvRow)[columnToUpdate!] = newValue; // Added non-null assertion
                }
                rowsAffected++;
              }
            });
          } 
          // Handle basic equality condition: WHERE column = 'value'
          else {
            const equalityRegex = /([^=\s]+)\s*=\s*['"]([^'"]*)['"]/i;
            const equalityMatch = whereClause.match(equalityRegex);
            
            if (!equalityMatch) {
              throw new Error('Unsupported WHERE clause format. Use column = \'value\' or column IN (\'value1\', \'value2\', ...)');
            }
            
            let whereColumn = equalityMatch[1]?.trim();
            const whereValue = equalityMatch[2];
            
            // Validate where column name
            if (!whereColumn || !headers.includes(whereColumn)) {
              const similarWhereColumn = headers.find(h => h.toLowerCase() === whereColumn.toLowerCase());
              if (similarWhereColumn) {
                errors.push(`WHERE clause column name case mismatch. Did you mean '${similarWhereColumn}'?`);
                whereColumn = similarWhereColumn;
              } else {
                throw new Error(`Column '${whereColumn}' in WHERE clause not found in data.`);
              }
            }
            
            // Apply the update with equality condition
            data.forEach((row, index) => {
              if (String(row[whereColumn!]).toLowerCase() === String(whereValue).toLowerCase()) { // Added non-null assertion
                if (data[index]) {
                  (data[index] as CsvRow)[columnToUpdate!] = newValue; // Added non-null assertion
                }
                rowsAffected++;
              }
            });
          }
        } 
        // Without WHERE clause, update all rows
        else {
          data.forEach((row, index) => {
            if (data[index]) {
              (data[index] as CsvRow)[columnToUpdate!] = newValue; // Added non-null assertion
            }
            rowsAffected++;
          });
        }
      } catch (err: any) { // Typed err
        errors.push(`SQL UPDATE error: ${err.message}`);
      }
    }
    // DELETE operation
    else if (sqlQuery.toUpperCase().startsWith('DELETE')) {
      operation = 'DELETE';
      try {
        // Parse the DELETE statement
        // Example: DELETE FROM data WHERE column = 'condition'
        const deleteRegex = /DELETE\s+(?:FROM\s+)?(?:data|table|\w+)(?:\s+WHERE\s+(.+))?/i;
        const match = sqlQuery.match(deleteRegex);
        
        if (!match) {
          throw new Error('Invalid DELETE syntax. Expected: DELETE FROM data WHERE condition');
        }
        
        const whereClause = match[1];
        
        // Process the WHERE clause
        if (whereClause) {
          // Handle basic equality condition: WHERE column = 'value'
          const equalityRegex = /([^=\s]+)\s*=\s*['"]([^'"]*)['"]/i;
          const equalityMatch = whereClause.match(equalityRegex);
          
          if (equalityMatch) {
            let whereColumn = equalityMatch[1]?.trim();
            const whereValue = equalityMatch[2];
            
            // Validate where column name
            if (!whereColumn || !headers.includes(whereColumn)) {
              const similarWhereColumn = headers.find(h => h.toLowerCase() === whereColumn.toLowerCase());
              if (similarWhereColumn) {
                errors.push(`WHERE clause column name case mismatch. Did you mean '${similarWhereColumn}'?`);
                whereColumn = similarWhereColumn;
              } else {
                throw new Error(`Column '${whereColumn}' in WHERE clause not found in data.`);
              }
            }
            
            columnsAffected.push(whereColumn);
            
            // Apply the delete with equality condition
            const originalLength = data.length;
            data = data.filter(row => String(row[whereColumn!]).toLowerCase() !== String(whereValue).toLowerCase()); // Added non-null assertion
            rowsAffected = originalLength - data.length;
          }
          // Handle basic comparison: WHERE column > value
          else {
            const comparisonRegex = /([^<>=\s]+)\s*([<>=]+)\s*([0-9.]+)/i;
            const comparisonMatch = whereClause.match(comparisonRegex);
            
            if (!comparisonMatch) {
              throw new Error('Unsupported WHERE clause format. Use column = \'value\' or column > number');
            }
            
            let whereColumn = comparisonMatch[1]?.trim();
            const operator = comparisonMatch[2];
            const compareValue = parseFloat(comparisonMatch[3]);
            
            if (isNaN(compareValue)) {
              throw new Error('Comparison value must be a number');
            }
            
            // Validate where column name
            if (!whereColumn || !headers.includes(whereColumn)) {
              const similarWhereColumn = headers.find(h => h.toLowerCase() === whereColumn.toLowerCase());
              if (similarWhereColumn) {
                errors.push(`WHERE clause column name case mismatch. Did you mean '${similarWhereColumn}'?`);
                whereColumn = similarWhereColumn;
              } else {
                throw new Error(`Column '${whereColumn}' in WHERE clause not found in data.`);
              }
            }
            
            columnsAffected.push(whereColumn);
            
            // Apply the delete with comparison condition
            const originalLength = data.length;
            data = data.filter(row => {
              const cellValue = parseFloat(String(row[whereColumn!])); // Added non-null assertion
              if (isNaN(cellValue)) return true; // Skip non-numeric values
              
              switch (operator) {
                case '>': return cellValue <= compareValue;
                case '<': return cellValue >= compareValue;
                case '>=': return cellValue < compareValue;
                case '<=': return cellValue > compareValue;
                case '=': return cellValue !== compareValue;
                default: return true;
              }
            });
            
            rowsAffected = originalLength - data.length;
          }
        } 
        // Without WHERE clause, we won't delete all data (too dangerous)
        else {
          errors.push('DELETE without WHERE clause is not supported. Specify filtering criteria.');
        }
      } catch (err: any) { // Typed err
        errors.push(`SQL DELETE error: ${err.message}`);
      }
    }
    // SELECT operation - not modifying data, but we can still process it
    else if (sqlQuery.toUpperCase().startsWith('SELECT')) {
      operation = 'SELECT';
      errors.push('SELECT operation is read-only and does not modify data.');
    }
    // Unsupported operation
    else {
      errors.push(`Unsupported SQL operation. Currently supported: UPDATE, DELETE`);
    }

    // Generate processed CSV data
    const processedCsvData = rowsAffected > 0 ? Papa.unparse(data) : input.csvData;
    
    // Calculate column info for the result
    const columnInfo = headers.map(colName => {
      const values = data.map(row => (row as CsvRow)[colName]);
      const nonNullValues = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
      const uniqueValues = new Set(nonNullValues.map(String));
      
      // Determine data type
      let dataType = 'string';
      if (nonNullValues.length > 0) {
        const sample = nonNullValues[0];
        if (typeof sample === 'number') {
          dataType = 'number';
        } else if (typeof sample === 'boolean') {
          dataType = 'boolean';
        } else if (!isNaN(Date.parse(String(sample)))) {
          dataType = 'date';
        }
      }
      
      return {
        name: colName,
        dataType,
        nonNullCount: nonNullValues.length,
        uniqueValueCount: uniqueValues.size
      };
    });

    // Generate operation summary
    let summary = '';
    if (rowsAffected > 0) {
      summary = `${operation} operation completed successfully. ${rowsAffected} row(s) ${operation === 'UPDATE' ? 'updated' : 'deleted'}.`;
      if (columnsAffected.length > 0) {
        summary += ` Affected column(s): ${columnsAffected.join(', ')}.`;
      }
    } else {
      summary = `${operation} operation did not modify any rows. Check your query conditions.`;
    }

    return {
      processedCsvData,
      summary,
      columnInfo,
      errorLog: errors.length > 0 ? errors : undefined
    };
    
  } catch (error: any) { // Typed error
    console.error("Error in direct SQL processing:", error);
    return {
      processedCsvData: input.csvData || '',
      summary: `Error during SQL processing: ${error.message || 'Unknown error'}`,
      columnInfo: [],
      errorLog: [error.message || 'Unknown error occurred during processing']
    };
  }
}
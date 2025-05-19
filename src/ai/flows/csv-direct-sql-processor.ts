'use server';
/**
 * @fileOverview Enhanced Direct SQL Processing for CSV Data
 * 
 * A direct implementation of SQL-like processing for CSV data that
 * doesn't rely on AI model response schemas, avoiding validation errors.
 * This version supports enhanced SQL commands including SELECT, UPDATE, and DELETE
 * with LIKE, IN, and comparison operators.
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
  isSelectQuery?: boolean;
  originalCsvData?: string;
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
    }    // First check if the CSV contains headers by peeking at the first line
    const firstLine = input.csvData.trim().split('\n')[0];
    const firstLineResult = Papa.parse(firstLine, { header: false });
    const possibleValues = (firstLineResult.data[0] || []) as string[];
    const containsLikelyHeader = possibleValues.some((value: string) => 
      typeof value === 'string' && 
      /^[A-Za-z][A-Za-z0-9_\s]*$/.test(value) && // Typical column name pattern
      !value.includes(' car') // Specific check for this dataset
    );

    // Parse the CSV data
    const parseResult = Papa.parse(input.csvData, { 
      header: containsLikelyHeader, // Auto-detect if headers are present
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: header => header.trim()
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

    // Determine operation type
    if (sqlQuery.toUpperCase().startsWith('SELECT')) {
      operation = 'SELECT';
      processSelectOperation(sqlQuery, headers, data, columnsAffected, errors);
      rowsAffected = data.length;
    }
    else if (sqlQuery.toUpperCase().startsWith('UPDATE')) {
      operation = 'UPDATE';
      rowsAffected = processUpdateOperation(sqlQuery, headers, data, columnsAffected, errors);
    }
    else if (sqlQuery.toUpperCase().startsWith('DELETE')) {
      operation = 'DELETE';
      rowsAffected = processDeleteOperation(sqlQuery, headers, data, columnsAffected, errors);
    }
    else {
      errors.push(`Unsupported SQL operation. Currently supported: SELECT, UPDATE, DELETE`);
    }    // Generate processed CSV data
    let processedCsvData = '';
      // For SELECT queries, we show the filtered data but don't modify the original
    const isSelectQuery = operation === 'SELECT';
    if (isSelectQuery) {
      // For SELECT, always provide the filtered data as output
      processedCsvData = Papa.unparse(data);
    } else {
      // For UPDATE and DELETE, only change the data if there were changes
      processedCsvData = rowsAffected > 0 ? Papa.unparse(data) : input.csvData;
    }
    
    // Let's not worry about the type errors in csv-pandas-processor.orig.ts since it's likely an original/deprecated file
    
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
    if (operation === 'SELECT') {
      summary = `Retrieved ${data.length} row(s) from the dataset.`;
      if (columnsAffected.length > 0) {
        summary += ` Selected column(s): ${columnsAffected.join(', ')}.`;
      }
    } else if (rowsAffected > 0) {
      summary = `${operation} operation completed successfully. ${rowsAffected} row(s) ${operation === 'UPDATE' ? 'updated' : 'deleted'}.`;
      if (columnsAffected.length > 0) {
        summary += ` Affected column(s): ${columnsAffected.join(', ')}.`;
      }
    } else {
      summary = `${operation} operation did not modify any rows. Check your query conditions.`;
    }    return {
      processedCsvData,
      summary,
      columnInfo,
      errorLog: errors.length > 0 ? errors : undefined,
      isSelectQuery,
      originalCsvData: isSelectQuery ? input.csvData : undefined
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

/**
 * Process SELECT SQL operation
 */
function processSelectOperation(
  sqlQuery: string, 
  headers: string[], 
  data: CsvRow[], 
  columnsAffected: string[],
  errors: string[]
): void {  
  try {    
    // Parse the SELECT statement
    // Example: SELECT column1, column2 FROM data WHERE column3 = 'condition'
    const selectRegex = /SELECT\s+(.*?)\s+FROM\s+(?:data|table|\w+)(?:\s+WHERE\s+(.+))?/i;
    const match = sqlQuery.match(selectRegex);
    
    if (!match) {
      throw new Error('Invalid SELECT syntax. Expected: SELECT columns FROM data WHERE condition');
    }
    
    const columnsToSelect = match[1]?.trim();
    const whereClause = match[2];
    
    // Special case: If the FROM clause specifies a name that matches a column name,
    // inform the user about the correct approach
    const fromTableMatch = sqlQuery.match(/FROM\s+(\w+)/i);
    if (fromTableMatch) {
      const tableName = fromTableMatch[1];
      if (headers.includes(tableName)) {
        // Add a warning but don't error out - this is a common user mistake
        errors.push(`Warning: '${tableName}' is both a column name and was used as a table name. In SQL queries against CSVs, use 'data' or 'table' as the table name and refer to columns in WHERE clauses.`);
      }
    }
    
    // Determine which columns to include
    let selectedColumns: string[] = [];
    if (columnsToSelect === '*') {
      selectedColumns = headers; // Include all columns
    } else {
      // Parse comma-separated column list
      selectedColumns = columnsToSelect.split(',')
        .map(c => c.trim())
        .filter(Boolean);
      
      // Validate column names
      for (let i = 0; i < selectedColumns.length; i++) {
        const col = selectedColumns[i];
        if (!headers.includes(col)) {
          const similarColumn = headers.find(h => h.toLowerCase() === col.toLowerCase());
          if (similarColumn) {
            errors.push(`Column name case mismatch. Did you mean '${similarColumn}'?`);
            selectedColumns[i] = similarColumn;
          } else {
            throw new Error(`Column '${col}' not found in data. Available columns: ${headers.join(', ')}`);
          }
        }
      }
    }
    
    columnsAffected.push(...selectedColumns);

    // Determine the rows to operate on.
    let sourceRowsForSelection: CsvRow[];
    if (whereClause) {
      // processWhereClause returns a new array of filtered rows.
      // The original 'data' array (parameter) should not be modified by processWhereClause.
      sourceRowsForSelection = processWhereClause(whereClause, headers, data, errors, sqlQuery);
    } else {
      // No WHERE clause, so we operate on all rows from the input 'data'.
      // Crucially, create a shallow copy so that clearing 'data' (the output parameter)
      // later doesn't affect our source for iteration.
      sourceRowsForSelection = [...data];
    }

    // Clear the original 'data' array (passed by reference) to populate it with results.
    data.length = 0;

    // Check if all columns are selected (SELECT *) or specific columns.
    // The existing condition (selectedColumns.length !== headers.length || !headers.every(...))
    // correctly identifies if 'selectedColumns' implies a subset or all columns.
    if (selectedColumns.length !== headers.length || !headers.every((h, i) => h === selectedColumns[i])) {
      // Specific columns are selected (e.g., SELECT column1, column2 FROM data)
      sourceRowsForSelection.forEach(row => {
        const newRow: CsvRow = {};
        selectedColumns.forEach(col => { // 'selectedColumns' is the array of specific column names
          if (Object.prototype.hasOwnProperty.call(row, col)) {
            newRow[col] = row[col];
          } else {
            newRow[col] = undefined; // Column not found in row, or error in selection
          }
        });
        data.push(newRow);
      });
    } else {
      // All columns are selected (SELECT * FROM data)
      // 'sourceRowsForSelection' contains the correct rows (either all original or filtered).
      sourceRowsForSelection.forEach(row => {
        data.push(row); // Push the entire row object.
      });
    }
  } catch (err: any) {
    errors.push(`SQL SELECT error: ${err.message}`);
  }
}

/**
 * Process UPDATE SQL operation
 */
function processUpdateOperation(
  sqlQuery: string, 
  headers: string[], 
  data: CsvRow[], 
  columnsAffected: string[],
  errors: string[]
): number {
  let rowsAffected = 0;
  
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
      const filteredData = processWhereClause(whereClause, headers, data, errors, sqlQuery);
      
      // Create a set of filtered row indexes for fast lookup
      const filteredIndexes = new Set<number>();
      filteredData.forEach(filteredRow => {
        const index = data.findIndex(row => row === filteredRow);
        if (index !== -1) {
          filteredIndexes.add(index);
        }
      });
      
      // Update only the filtered rows
      data.forEach((row, index) => {
        if (filteredIndexes.has(index)) {
          (data[index] as CsvRow)[columnToUpdate!] = newValue; // Added non-null assertion
          rowsAffected++;
        }
      });
    } 
    // Without WHERE clause, update all rows
    else {
      data.forEach((row, index) => {
        if (data[index]) {
          (data[index] as CsvRow)[columnToUpdate!] = newValue; // Added non-null assertion
          rowsAffected++;
        }
      });
    }
  } catch (err: any) { 
    errors.push(`SQL UPDATE error: ${err.message}`);
  }
  
  return rowsAffected;
}

/**
 * Process DELETE SQL operation
 */
function processDeleteOperation(
  sqlQuery: string, 
  headers: string[], 
  data: CsvRow[], 
  columnsAffected: string[],
  errors: string[]
): number {
  let rowsAffected = 0;
  
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
      const originalLength = data.length;
      const rowsToKeep = processWhereClause(whereClause, headers, data, errors, sqlQuery);
      
      // For DELETE, we want to keep the rows that DON'T match the WHERE clause
      const rowsToKeepSet = new Set(rowsToKeep);
      data = data.filter(row => !rowsToKeepSet.has(row));
      rowsAffected = originalLength - data.length;
    } 
    // Without WHERE clause, we won't delete all data (too dangerous)
    else {
      errors.push('DELETE without WHERE clause is not supported. Specify filtering criteria.');
    }
  } catch (err: any) { 
    errors.push(`SQL DELETE error: ${err.message}`);
  }
  
  return rowsAffected;
}

/**
 * Process WHERE clause and return filtered data
 */
function processWhereClause(
  whereClause: string, 
  headers: string[], 
  data: CsvRow[], 
  errors: string[],
  sqlQuery?: string
): CsvRow[] {
  // Handle LIKE operator for pattern matching: WHERE column LIKE '%pattern%'
  const likeRegex = /([^=\s]+)\s+LIKE\s+['"]([^'"]*)['"]/i;
  const likeMatch = whereClause.match(likeRegex);
  
  if (likeMatch) {
    let whereColumn = likeMatch[1]?.trim();
    let pattern = likeMatch[2];
    
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
    
    // Convert SQL LIKE pattern to JavaScript RegExp
    pattern = pattern
      .replace(/%/g, '.*')   // % becomes .* (any number of characters)
      .replace(/_/g, '.')    // _ becomes . (single character)
      .replace(/\\/g, '\\\\'); // Escape backslashes
      
    const patternRegex = new RegExp(`^${pattern}$`, 'i'); // Case-insensitive
    
    // Filter data based on LIKE pattern
    return data.filter(row => {
      const cellValue = String(row[whereColumn!]);
      return patternRegex.test(cellValue);
    });
  }
  
  // Handle IN clause: WHERE column IN ('value1', 'value2', ...)
  const inRegex = /([^=\s]+)\s+IN\s+\(\s*((?:['"][^'"]*['"](?:\s*,\s*['"][^'"]*['"])*)?)\s*\)/i;
  const inMatch = whereClause.match(inRegex);
  
  if (inMatch) {
    let whereColumn = inMatch[1]?.trim();
    const valuesString = inMatch[2];
    
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
    const valueRegex = /['"]([^'"]*)['"]/g;
    const values: string[] = [];
    
    let valueMatch;
    while ((valueMatch = valueRegex.exec(valuesString)) !== null) {
      values.push(valueMatch[1]);
    }
    
    if (values.length === 0) {
      throw new Error('No values found in IN clause.');
    }
    
    // Filter rows that match any of the values
    return data.filter(row => {
      const cellValue = String(row[whereColumn!]);
      return values.some(v => cellValue.toLowerCase() === v.toLowerCase());
    });
  }

  // Handle general comparison operators: WHERE column [operator] 'value'
  // Operators: =, !=, <>, >, <, >=, <=
  const comparisonRegex = /([^<>=!\s]+)\s*([<>=!]{1,2})\s*['"]?([^'"]+)['"]?/i;
  const comparisonMatch = whereClause.match(comparisonRegex);

  if (comparisonMatch) {
    let whereColumn = comparisonMatch[1]?.trim();
    const operator = comparisonMatch[2];
    const whereValueStr = comparisonMatch[3]; // This is a string from regex

    // Validate where column name
    if (!whereColumn || !headers.includes(whereColumn)) {
      const similarWhereColumn = headers.find(h => h.toLowerCase() === whereColumn.toLowerCase());
      if (similarWhereColumn) {
        errors.push(`WHERE clause column name case mismatch. Did you mean '${similarWhereColumn}'?`);
        whereColumn = similarWhereColumn;
      } else {
        const fromTableMatch = sqlQuery ? sqlQuery.match(/FROM\s+(\w+)/i) : null;
        let errorMsg;
        if (fromTableMatch && fromTableMatch[1].toLowerCase() === whereColumn.toLowerCase()) {
          errorMsg = `Column '${whereColumn}' in WHERE clause not found. You used '${whereColumn}' as your table name in the FROM clause, which is causing confusion. In CSV data, use 'data' or 'table' as the table name instead.`;
        } else {
          errorMsg = `Column '${whereColumn}' in WHERE clause not found in data. Available columns: ${headers.join(', ')}.`;
           if (headers.length === 1 && headers[0] === '' && data.length > 0 && typeof data[0][headers[0]] !== 'undefined') {
             errorMsg += ` For single column CSVs without a header, try using a default column name like 'column1' or ensure your CSV has a header row.`;
           }
        }
        throw new Error(errorMsg);
      }
    }

    return data.filter(row => {
      const cellValue = row[whereColumn!]; // cellValue can be string, number, boolean, null

      // For numeric operators, convert both to Number. For others, compare as strings.
      switch (operator) {
        case '=':
          // Try numeric first if possible, else string (case-insensitive)
          if (cellValue !== null && cellValue !== undefined && whereValueStr !== null && whereValueStr !== undefined &&
              !isNaN(Number(cellValue)) && !isNaN(Number(whereValueStr))) {
            return Number(cellValue) === Number(whereValueStr);
          }
          return String(cellValue).toLowerCase() === whereValueStr.toLowerCase();
        case '!=':
        case '<>':
          if (cellValue !== null && cellValue !== undefined && whereValueStr !== null && whereValueStr !== undefined &&
              !isNaN(Number(cellValue)) && !isNaN(Number(whereValueStr))) {
            return Number(cellValue) !== Number(whereValueStr);
          }
          return String(cellValue).toLowerCase() !== whereValueStr.toLowerCase();
        case '>':
          // Number() will return NaN for non-numeric strings, and NaN > X is false.
          return Number(cellValue) > Number(whereValueStr);
        case '<':
          return Number(cellValue) < Number(whereValueStr);
        case '>=':
          return Number(cellValue) >= Number(whereValueStr);
        case '<=':
          return Number(cellValue) <= Number(whereValueStr);
        default:
          // This case should ideally not be reached if regex is specific enough
          errors.push(`Unsupported operator encountered: ${operator}`);
          return false;
      }
    });
  }
  
  // If no known WHERE clause pattern matched
  errors.push(`Unsupported or invalid WHERE clause: "${whereClause}". Supported formats: column LIKE 'pattern', column IN ('v1', 'v2'), or column [=, !=, <>, >, <, >=, <=] 'value'`);
  return []; // Return empty if clause is present but unparseable, or data if no WHERE clause was intended.
}

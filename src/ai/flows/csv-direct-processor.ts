'use server';
/**
 * @fileOverview Direct CSV Processing without schema validation
 * 
 * A simpler approach to CSV processing that doesn't rely on schema validation,
 * which causes issues with the Google Gemini API.
 */

import { ai } from '@/ai/ai-instance';
import Papa from 'papaparse';

// Define interfaces for our CSV data and related types
export type CsvRow = Record<string, string | number | null | undefined>;
export type ValueMapping = Record<string, string>;
export type ComparisonType = 'equals' | 'contains' | 'greater' | 'less' | 'greaterEqual' | 'lessEqual';

export interface CsvProcessingResult {
  processedCsvData: string;
  summary: string;
  appliedActions: {
    description: string;
    affectedRows: number;
    affectedColumns: string[];
  }[];
  errorMessages?: string[];
}

export interface CsvProcessingInput {
  csvData: string;
  commands: string;
}

export async function processDirectCsv(input: CsvProcessingInput): Promise<CsvProcessingResult> {
  try {
    // Input validation
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

    // Parse the CSV data
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
        summary: 'Invalid CSV data structure.',
        appliedActions: [{
          description: "Could not parse CSV data properly",
          affectedRows: 0,
          affectedColumns: []
        }],
        errorMessages: ['Failed to parse CSV or data is empty']
      };
    }

    const data: CsvRow[] = [...parseResult.data as CsvRow[]];
    const headers = parseResult.meta.fields || [];
    const command = input.commands.toLowerCase();
    const appliedActions = [];
    let actionsApplied = 0;
    let rowsModified = 0;
    
    // Process find and replace commands
    if (command.includes('change') || command.includes('replace') || 
        (command.includes('set') && command.includes('to'))) {
      
      // Much more flexible regex that handles various command formats
      // This will capture the find value, replace value, and column name in many different phrasings
      const replaceRegex = /(?:(?:change|replace|set)(?:\s+(?:all(?:\s+instances|\s+occurrences)?|\s+entries)?(?:\s+of)?)?)\s+['"]?([^'"]+?)['"]?\s+(?:to|with)\s+['"]?([^'"]+?)['"]?(?:\s+(?:in|for|on)(?:\s+(?:the|column|field))?)?[\s'"]*([a-z0-9_\s]+?)(?:[\s'"]*(?:column|field))?['"]?\s*$/i;
      
      // Also try a simpler pattern that just looks for the three key components in order
      const simpleReplaceRegex = /['"]?([^'"]+?)['"]?\s+(?:to|with)\s+['"]?([^'"]+?)['"]?\s+(?:in|for|on)\s+['"]?([^'"]+?)['"]?/i;
      
      // Try both regex patterns
      let replaceMatch = replaceRegex.exec(input.commands) || simpleReplaceRegex.exec(input.commands);
      
      if (replaceMatch) {
        const findValue = replaceMatch[1].trim();
        const replaceValue = replaceMatch[2].trim();
        let columnName = replaceMatch[3].trim();
        
        // Extra cleanup - remove trailing "column" if it exists
        if (columnName.toLowerCase().endsWith(" column")) {
          columnName = columnName.substring(0, columnName.toLowerCase().lastIndexOf(" column")).trim();
        }
        
        // Find the actual column name (case-insensitive)
        const targetColumn = headers.find(h => h.toLowerCase() === columnName.toLowerCase());
        
        if (targetColumn) {
          let rowsAffected = 0;
          
          // Apply replacement to all matching values
          data.forEach((row, index) => {
            const cellValue = row[targetColumn];
            if (cellValue !== undefined && cellValue !== null) {
              const originalValue = String(cellValue);
              
              // First try exact match (case-insensitive)
              if (originalValue.toLowerCase() === findValue.toLowerCase()) {
                data[index][targetColumn] = replaceValue;
                rowsAffected++;
              }
              // Also check for partial matches in the same pass
              else if (originalValue.toLowerCase().includes(findValue.toLowerCase())) {
                // For partial matches, replace only the matching part
                const regex = new RegExp(findValue, "gi"); // Add 'g' flag for global replacement
                const newValue = originalValue.replace(regex, replaceValue);
                
                // Only count as affected if it actually changed
                if (newValue !== originalValue) {
                  data[index][targetColumn] = newValue;
                  rowsAffected++;
                }
              }
            }
          });
          
          if (rowsAffected > 0) {
            appliedActions.push({
              description: `Changed '${findValue}' to '${replaceValue}' in '${targetColumn}' column`,
              affectedRows: rowsAffected,
              affectedColumns: [targetColumn]
            });
            actionsApplied++;
            rowsModified += rowsAffected;
          } else {
            // Provide feedback if no matches were found
            appliedActions.push({
              description: `No matching values found for '${findValue}' in '${targetColumn}' column`,
              affectedRows: 0,
              affectedColumns: [targetColumn]
            });
          }
        } else {
          // Try to be more flexible with column names
          const possibleColumns = headers.filter(h => 
            h.toLowerCase().includes(columnName.toLowerCase()) || 
            columnName.toLowerCase().includes(h.toLowerCase()));
          
          if (possibleColumns.length > 0) {
            const bestMatch = possibleColumns[0];
            let rowsAffected = 0;
            
            // Apply replacement using the best match column
            data.forEach((row, index) => {
              const cellValue = row[bestMatch];
              if (cellValue !== undefined && cellValue !== null) {
                const originalValue = String(cellValue);
                
                if (originalValue.toLowerCase() === findValue.toLowerCase() || 
                    originalValue.toLowerCase().includes(findValue.toLowerCase())) {
                  const regex = new RegExp(findValue, "gi");
                  const newValue = originalValue.replace(regex, replaceValue);
                  
                  if (newValue !== originalValue) {
                    data[index][bestMatch] = newValue;
                    rowsAffected++;
                  }
                }
              }
            });
            
            if (rowsAffected > 0) {
              appliedActions.push({
                description: `Changed '${findValue}' to '${replaceValue}' in '${bestMatch}' column (best match for '${columnName}')`,
                affectedRows: rowsAffected,
                affectedColumns: [bestMatch]
              });
              actionsApplied++;
              rowsModified += rowsAffected;
            }
          } else {
            // Provide feedback if column wasn't found
            appliedActions.push({
              description: `Column '${columnName}' not found in the dataset`,
              affectedRows: 0,
              affectedColumns: []
            });
          }
        }
      } else {
        // Last resort - try to extract the components with a very simple regex
        const simpleFind = /replace\s+['"]?([^'"]+?)['"]?\s+with/i;
        const simpleReplace = /with\s+['"]?([^'"]+?)['"]?\s+in/i;
        const simpleColumn = /in\s+['"]?([^'"]+?)['"]?/i;
        
        const findMatch = simpleFind.exec(input.commands);
        const replaceMatch = simpleReplace.exec(input.commands);
        const columnMatch = simpleColumn.exec(input.commands);
        
        if (findMatch && replaceMatch && columnMatch) {
          const findValue = findMatch[1].trim();
          const replaceValue = replaceMatch[1].trim();
          let columnName = columnMatch[1].trim();
          
          // Find the actual column name (case-insensitive)
          const targetColumn = headers.find(h => h.toLowerCase() === columnName.toLowerCase());
          
          if (targetColumn) {
            // Apply replacement logic (same as above)
            let rowsAffected = 0;
            
            data.forEach((row, index) => {
              const cellValue = row[targetColumn];
              if (cellValue !== undefined && cellValue !== null) {
                const originalValue = String(cellValue);
                
                if (originalValue.toLowerCase().includes(findValue.toLowerCase())) {
                  const regex = new RegExp(findValue, "gi");
                  const newValue = originalValue.replace(regex, replaceValue);
                  
                  if (newValue !== originalValue) {
                    data[index][targetColumn] = newValue;
                    rowsAffected++;
                  }
                }
              }
            });
            
            if (rowsAffected > 0) {
              appliedActions.push({
                description: `Changed '${findValue}' to '${replaceValue}' in '${targetColumn}' column`,
                affectedRows: rowsAffected,
                affectedColumns: [targetColumn]
              });
              actionsApplied++;
              rowsModified += rowsAffected;
            }
          }
        }
      }
    }

    // Process standardization commands
    if (command.includes('standardize') || 
        command.includes('normalize') || 
        command.includes('replace')) {
      
      // Extract column name
      const columnRegex = /(?:in|column|field)\s+['"]*([^'"]+)['"]*|['"]*([^'"]+)['"]*\s+(?:column|field)/i;
      const columnMatch = columnRegex.exec(input.commands);
      let targetColumn = null;
      
      if (columnMatch) {
        const extractedName = columnMatch[1] || columnMatch[2];
        targetColumn = headers.find(h => h.toLowerCase() === extractedName.toLowerCase().trim());
      }
      
      if (!targetColumn && headers.length > 0) {
        // Try some common column names
        const possibleColumns = headers.filter(h => 
          /fat|content|type|category|class|status|state/i.test(h));
        if (possibleColumns.length > 0) targetColumn = possibleColumns[0];
      }
      
      if (targetColumn) {
        // Extract target values
        const valueRegex = /(?:to|as|with)\s+['"]*([^'"]+)['"]*\s+(?:and|or)\s+['"]*([^'"]+)['"]*|['"]*([^'"]+)['"]*\s+(?:and|or)\s+['"]*([^'"]+)['"]*\s+(?:values|value)/i;
        const valuesMatch = valueRegex.exec(input.commands);
        let targetValues: string[] = [];
        
        if (valuesMatch) {
          if (valuesMatch[1] && valuesMatch[2]) {
            targetValues = [valuesMatch[1], valuesMatch[2]];
          } else if (valuesMatch[3] && valuesMatch[4]) {
            targetValues = [valuesMatch[3], valuesMatch[4]];
          }
        }
        
        // Fallback to common values if none are specified
        if (targetValues.length === 0 && command.includes('fat')) {
          targetValues = ['Low Fat', 'Regular'];
        }
        
        if (targetValues.length > 0) {
          // Create a mapping of current values to standardized values
          const valueMapping: ValueMapping = {};
          let rowsAffected = 0;
          
          // First pass - collect all unique values in the column
          const uniqueValues = new Set<string>();
          data.forEach(row => {
            const cellValue = row[targetColumn];
            if (cellValue !== undefined && cellValue !== null) {
              uniqueValues.add(String(cellValue).toLowerCase());
            }
          });
          
          // Create a best-effort mapping based on similarity
          const uniqueValuesList = Array.from(uniqueValues);
          for (const uniqueValue of uniqueValuesList) {
            if (targetValues.length === 1) {
              // If only one target value, map everything to it
              valueMapping[uniqueValue] = targetValues[0];
            } else {
              // For two values, try to determine the best match
              // Typically for binary values (like "Low Fat" vs "Regular")
              const lowerValue = uniqueValue.toLowerCase();
              
              // Simple heuristic matching
              if (lowerValue.includes('low') || lowerValue.includes('lf') || lowerValue.includes('light')) {
                valueMapping[uniqueValue] = targetValues[0]; // Likely "Low Fat"
              } else {
                valueMapping[uniqueValue] = targetValues[1]; // Likely "Regular" or alternative
              }
            }
          }
          
          // Second pass - apply the mapping
          data.forEach((row, index) => {
            const cellValue = row[targetColumn];
            if (cellValue !== undefined && cellValue !== null) {
              const originalValue = String(cellValue);
              const lowerOriginal = originalValue.toLowerCase();
              
              const standardizedValue = valueMapping[lowerOriginal];
              if (standardizedValue && originalValue !== standardizedValue) {
                data[index][targetColumn] = standardizedValue;
                rowsAffected++;
              }
            }
          });
          
          if (rowsAffected > 0) {
            appliedActions.push({
              description: `Standardized values in '${targetColumn}' column to: ${targetValues.join(', ')}`,
              affectedRows: rowsAffected,
              affectedColumns: [targetColumn]
            });
            actionsApplied++;
            rowsModified += rowsAffected;
          }
        }
      }
    }
    
    // Process case conversion commands
    if (command.includes('uppercase') || command.includes('lowercase')) {
      // Extract column name
      const columnRegex = /(?:in|column|field)\s+['"]*([^'"]+)['"]*|['"]*([^'"]+)['"]*\s+(?:column|field)/i;
      const columnMatch = columnRegex.exec(input.commands);
      let targetColumn = null;
      
      if (columnMatch) {
        const extractedName = columnMatch[1] || columnMatch[2];
        targetColumn = headers.find(h => h.toLowerCase() === extractedName.toLowerCase().trim());
      }
      
      if (targetColumn) {
        const convertToUpper = command.includes('uppercase');
        let rowsAffected = 0;
        
        data.forEach((row, index) => {
          const cellValue = row[targetColumn];
          if (cellValue !== undefined && cellValue !== null) {
            // Convert to string first to ensure we can use string methods
            const originalValue = String(cellValue);
            const newValue = convertToUpper ? originalValue.toUpperCase() : originalValue.toLowerCase();
            
            if (originalValue !== newValue) {
              data[index][targetColumn] = newValue;
              rowsAffected++;
            }
          }
        });
        
        if (rowsAffected > 0) {
          appliedActions.push({
            description: `Converted text in '${targetColumn}' column to ${convertToUpper ? 'uppercase' : 'lowercase'}`,
            affectedRows: rowsAffected,
            affectedColumns: [targetColumn]
          });
          actionsApplied++;
          rowsModified += rowsAffected;
        }
      }
    }
    
    // Process fill missing values commands
    if (command.includes('fill') && command.includes('missing')) {
      // Extract column name
      const columnRegex = /(?:in|column|field)\s+['"]*([^'"]+)['"]*|['"]*([^'"]+)['"]*\s+(?:column|field)/i;
      const columnMatch = columnRegex.exec(input.commands);
      let targetColumn = null;
      
      if (columnMatch) {
        const extractedName = columnMatch[1] || columnMatch[2];
        targetColumn = headers.find(h => h.toLowerCase() === extractedName.toLowerCase().trim());
      }
      
      if (targetColumn) {
        let fillValue: string | number = '';
        let rowsAffected = 0;
        
        // Determine fill method/value
        if (command.includes('mean') || command.includes('average')) {
          // Calculate mean of numeric values
          const numValues = data
            .map(row => {
              const val = row[targetColumn];
              return val !== undefined && val !== null ? parseFloat(String(val)) : NaN;
            })
            .filter(v => !isNaN(v));
          
          if (numValues.length > 0) {
            const sum = numValues.reduce((acc, val) => acc + val, 0);
            fillValue = parseFloat((sum / numValues.length).toFixed(2));
          }
        } else if (command.includes('median')) {
          // Calculate median of numeric values
          const numValues = data
            .map(row => {
              const val = row[targetColumn];
              return val !== undefined && val !== null ? parseFloat(String(val)) : NaN;
            })
            .filter(v => !isNaN(v))
            .sort((a, b) => a - b);
          
          if (numValues.length > 0) {
            const mid = Math.floor(numValues.length / 2);
            fillValue = numValues.length % 2 === 0
              ? parseFloat(((numValues[mid - 1] + numValues[mid]) / 2).toFixed(2))
              : parseFloat(numValues[mid].toFixed(2));
          }
        } else if (command.includes('mode')) {
          // Find most common value
          const valueCounts: Record<string, number> = {};
          data.forEach(row => {
            const val = row[targetColumn];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              const strVal = String(val);
              valueCounts[strVal] = (valueCounts[strVal] || 0) + 1;
            }
          });
          
          let maxCount = 0;
          let modeValue = '';
          for (const [val, count] of Object.entries(valueCounts)) {
            if (count > maxCount) {
              maxCount = count;
              modeValue = val;
            }
          }
          
          fillValue = modeValue;
        } else {
          // Extract explicit fill value
          const valueRegex = /(?:with|using|to)\s+['"]*([^'"]+)['"]*|['"]*([^'"]+)['"]*\s+(?:value|values)/i;
          const valueMatch = valueRegex.exec(input.commands);
          
          if (valueMatch) {
            fillValue = valueMatch[1] || valueMatch[2];
            
            // Convert to number if appropriate
            const asNum = parseFloat(String(fillValue));
            if (!isNaN(asNum) && String(asNum) === String(fillValue)) {
              fillValue = asNum;
            }
          } else {
            fillValue = "N/A"; // Default
          }
        }
        
        // Apply the fill
        if (fillValue !== '') {
          data.forEach((row, index) => {
            const cellValue = row[targetColumn];
            
            if (cellValue === undefined || 
                cellValue === null || 
                String(cellValue).trim() === '') {
              data[index][targetColumn] = fillValue;
              rowsAffected++;
            }
          });
          
          if (rowsAffected > 0) {
            appliedActions.push({
              description: `Filled ${rowsAffected} missing values in '${targetColumn}' column with: ${fillValue}`,
              affectedRows: rowsAffected,
              affectedColumns: [targetColumn]
            });
            actionsApplied++;
            rowsModified += rowsAffected;
          }
        }
      }
    }
    
    // Process sorting commands
    if (command.includes('sort') || command.includes('order')) {
      // Extract column name
      const columnRegex = /(?:by|on|using|in|column|field)\s+['"]*([^'"]+)['"]*|['"]*([^'"]+)['"]*\s+(?:column|field)/i;
      const columnMatch = columnRegex.exec(input.commands);
      let targetColumn = null;
      
      if (columnMatch) {
        const extractedName = columnMatch[1] || columnMatch[2];
        targetColumn = headers.find(h => h.toLowerCase() === extractedName.toLowerCase().trim());
      }
      
      if (targetColumn) {
        // Determine sort direction
        const isDescending = command.includes('descend') || 
                            command.includes('desc') || 
                            command.includes('high to low') ||
                            command.includes('largest') ||
                            command.includes('highest');

        // Check if column appears to be numeric
        const hasNumbers = data.some(row => {
          const val = row[targetColumn];
          return val !== undefined && 
                val !== null && 
                !isNaN(parseFloat(String(val))) &&
                isFinite(Number(val));
        });

        // Sort the data
        const originalOrder = [...data];
        
        if (hasNumbers) {
          // Numeric sort
          data.sort((a, b) => {
            const valA = parseFloat(String(a[targetColumn] || 'NaN'));
            const valB = parseFloat(String(b[targetColumn] || 'NaN'));
            
            const aIsNum = !isNaN(valA);
            const bIsNum = !isNaN(valB);
            
            if (!aIsNum && bIsNum) return isDescending ? -1 : 1;
            if (aIsNum && !bIsNum) return isDescending ? 1 : -1;
            if (!aIsNum && !bIsNum) return 0;
            
            return isDescending ? valB - valA : valA - valB;
          });
        } else {
          // String sort
          data.sort((a, b) => {
            const valA = String(a[targetColumn] || '').toLowerCase();
            const valB = String(b[targetColumn] || '').toLowerCase();
            
            return isDescending 
              ? valB.localeCompare(valA)
              : valA.localeCompare(valB);
          });
        }
        
        // Check if sort made any difference
        let orderChanged = false;
        for (let i = 0; i < data.length; i++) {
          if (data[i] !== originalOrder[i]) {
            orderChanged = true;
            break;
          }
        }
        
        if (orderChanged) {
          appliedActions.push({
            description: `Sorted data ${isDescending ? 'descending' : 'ascending'} by '${targetColumn}' column`,
            affectedRows: data.length,
            affectedColumns: [targetColumn]
          });
          actionsApplied++;
          rowsModified += data.length;
        }
      }
    }
    
    // Process filtering commands
    if (command.includes('filter') || 
        command.includes('where') || 
        command.includes('only') ||
        command.includes('show') ||
        (command.includes('keep') && (command.includes('rows') || command.includes('records')))) {
      
      // Extract column name and condition
      let targetColumn = null;
      let conditionType: ComparisonType = 'equals';
      let conditionValue = '';
      
      // Extract column name
      const columnRegex = /(?:in|on|where|column|field)\s+['"]*([^'"]+)['"]*|['"]*([^'"]+)['"]*\s+(?:column|field)/i;
      const columnMatch = columnRegex.exec(input.commands);
      
      if (columnMatch) {
        const extractedName = columnMatch[1] || columnMatch[2];
        targetColumn = headers.find(h => h.toLowerCase() === extractedName.toLowerCase().trim());
      }
      
      // Handle both simple and complex filtering
      if (targetColumn) {
        // Look for comparison operators
        const operatorRegex = /(?:is|=|==|equals|>|<|>=|<=|contains|includes|like|matches)\s+['"]*([^'"]+)['"]*|['"]*([^'"]+)['"]*$/i;
        const operatorMatch = operatorRegex.exec(input.commands);
        
        if (operatorMatch) {
          conditionValue = (operatorMatch[1] || operatorMatch[2] || '').trim();
          
          if (command.includes('contains') || command.includes('includes') || command.includes('like')) {
            conditionType = 'contains';
          } else if (command.includes('>') || command.includes('greater')) {
            conditionType = 'greater';
          } else if (command.includes('<') || command.includes('less')) {
            conditionType = 'less';
          } else if (command.includes('>=') || command.includes('greater than or equal')) {
            conditionType = 'greaterEqual';
          } else if (command.includes('<=') || command.includes('less than or equal')) {
            conditionType = 'lessEqual';
          } else {
            conditionType = 'equals';
          }
          
          // Apply the filter
          const originalLength = data.length;
          let filteredData: CsvRow[] = [...data];
          
          if (conditionType === 'contains') {
            filteredData = data.filter(row => {
              const cellValue = row[targetColumn];
              if (cellValue === undefined || cellValue === null) return false;
              return String(cellValue)
                .toLowerCase()
                .includes(conditionValue.toLowerCase());
            });
          } else if (conditionType === 'equals') {
            filteredData = data.filter(row => {
              const cellValue = row[targetColumn];
              if (cellValue === undefined || cellValue === null) return false;
              
              // Try both string and numeric comparison
              const rowValue = String(cellValue).toLowerCase();
              const compareValue = conditionValue.toLowerCase();
              
              const numRowValue = parseFloat(String(cellValue));
              const numCompareValue = parseFloat(conditionValue);
              
              const isNumMatch = !isNaN(numRowValue) && !isNaN(numCompareValue) && numRowValue === numCompareValue;
              
              return rowValue === compareValue || isNumMatch;
            });
          } else if (['greater', 'less', 'greaterEqual', 'lessEqual'].includes(conditionType)) {
            filteredData = data.filter(row => {
              const cellValue = row[targetColumn];
              if (cellValue === undefined || cellValue === null) return false;
              
              const numRowValue = parseFloat(String(cellValue));
              const numCompareValue = parseFloat(conditionValue);
              
              if (isNaN(numRowValue) || isNaN(numCompareValue)) return false;
              
              if (conditionType === 'greater') return numRowValue > numCompareValue;
              if (conditionType === 'less') return numRowValue < numCompareValue;
              if (conditionType === 'greaterEqual') return numRowValue >= numCompareValue;
              if (conditionType === 'lessEqual') return numRowValue <= numCompareValue;
              return false;
            });
          }
          
          if (filteredData.length !== originalLength) {
            const rowsFiltered = originalLength - filteredData.length;
            
            // Replace the data with filtered set
            data.splice(0, data.length, ...filteredData);
            
            appliedActions.push({
              description: `Filtered data to keep rows where '${targetColumn}' ${conditionType} '${conditionValue}', removed ${rowsFiltered} rows`,
              affectedRows: rowsFiltered,
              affectedColumns: [targetColumn]
            });
            actionsApplied++;
            rowsModified += rowsFiltered;
          }
        }
      }
    }
    
    // Generate summary and processed data
    const processedCsvData = actionsApplied > 0 ? Papa.unparse(data) : input.csvData;
    
    let summary = '';
    if (actionsApplied === 0) {
      summary = `No changes were made to the data. Command: "${input.commands}"`;
      appliedActions.push({
        description: "No matching actions were found for this command",
        affectedRows: 0,
        affectedColumns: []
      });
    } else {
      summary = `Applied ${actionsApplied} action(s), modifying ${rowsModified} cell(s) based on: "${input.commands}"`;
    }
    
    return {
      processedCsvData,
      summary,
      appliedActions
    };
    
  } catch (error: any) {
    console.error("Error in direct CSV processing:", error);
    return {
      processedCsvData: input.csvData || '',
      summary: `Error during processing: ${error.message || 'Unknown error'}`,
      appliedActions: [{
        description: "Processing failed due to an error",
        affectedRows: 0,
        affectedColumns: []
      }],
      errorMessages: [error.message || 'Unknown error occurred during processing']
    };
  }
}
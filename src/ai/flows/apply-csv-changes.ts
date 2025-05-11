'use server';
/**
 * @fileOverview Apply CSV Changes based on approved suggestions
 *
 * - applyCsvApprovedChanges - A function that applies approved suggestions to CSV data
 * - ApplyCsvApprovedChangesInput - The input type for the applyCsvApprovedChanges function
 * - ApplyCsvApprovedChangesOutput - The return type for the applyCsvApprovedChanges function
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import Papa from 'papaparse';
import { CleaningSuggestionSchema } from './schemas/csv-schemas';
// Import the type directly for use
import type { CleaningSuggestion } from './schemas/csv-schemas';

// Make sure the type is exported
export type { CleaningSuggestion };

const ApplyCsvApprovedChangesInputSchema = z.object({
  csvData: z.string().describe('The current CSV data as a string'),
  approvedSuggestions: z.array(CleaningSuggestionSchema).describe('The array of approved cleaning suggestions to apply'),
});
export type ApplyCsvApprovedChangesInput = z.infer<typeof ApplyCsvApprovedChangesInputSchema>;

const ApplyCsvApprovedChangesOutputSchema = z.object({
  cleanedCsvData: z.string().describe('The CSV data after applying the approved suggestions'),
  summary: z.string().describe('A summary of the changes made'),
  errors: z.array(z.string()).optional().describe('Any errors that occurred during processing'),
  actionsAppliedCount: z.number().describe('Number of actions successfully applied'),
  actionsFailedCount: z.number().describe('Number of actions that failed to apply'),
  cellsModifiedCount: z.number().describe('Number of cells that were modified'),
  rowsRemovedCount: z.number().describe('Number of rows that were removed')
});
export type ApplyCsvApprovedChangesOutput = z.infer<typeof ApplyCsvApprovedChangesOutputSchema>;

/**
 * Calculate numeric statistics for a column
 */
function calculateNumericStats(data: any[], columnName: string): { mean: number; median: number; mode: number } | null {
  try {
    // Extract values as numbers, ignoring non-numeric or empty values
    const values = data
      .map(row => row[columnName])
      .filter(val => val !== null && val !== undefined && String(val).trim() !== '')
      .map(val => parseFloat(String(val)))
      .filter(num => !isNaN(num));

    if (values.length === 0) return null;

    // Calculate mean
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;

    // Calculate median
    values.sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;

    // Calculate mode
    const frequency: { [key: number]: number } = {};
    let maxFreq = 0;
    let modes: number[] = [];
    
    values.forEach(val => {
      frequency[val] = (frequency[val] || 0) + 1;
      if (frequency[val] > maxFreq) {
        maxFreq = frequency[val];
      }
    });
    
    for (const valKey in frequency) {
      if (frequency[Number(valKey)] === maxFreq) {
        modes.push(parseFloat(valKey));
      }
    }
    
    // If multiple modes or all unique values, use the first mode or fall back to mean
    const mode = modes.length > 0 && maxFreq > 1 ? modes[0] : mean;

    return { mean, median, mode };
  } catch (e) {
    console.error(`Error calculating stats for column '${columnName}':`, e);
    return null;
  }
}

/**
 * Apply suggested column-level changes to CSV data
 * Handles applying changes to all affected rows in a column
 */
export async function applyColumnChanges(parsedData: any[], suggestion: CleaningSuggestion): Promise<any[]> {
  const { columnName, actionType, originalFragment, suggestedFragment, imputationMethod } = suggestion;
  
  if (!columnName) {
    console.warn('Cannot apply column changes without a columnName', suggestion);
    return parsedData;
  }

  // Create a new copy of the data to apply changes to
  const newData = JSON.parse(JSON.stringify(parsedData));

  // Track changes for the final result
  let changesApplied = 0;

  // Check if this column exists in the data
  if (!newData.length || !Object.hasOwnProperty.call(newData[0], columnName)) {
    console.warn(`Column "${columnName}" not found in data`);
    return newData;
  }

  const isEmptyValue = (val: any): boolean => {
    if (val === null || val === undefined) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    // Handle string representations of null
    if (typeof val === 'string' && ['null', 'na', 'n/a', '-', 'nan', 'none', 'undefined'].includes(val.trim().toLowerCase())) return true;
    return false;
  };

  // Function to handle numeric imputation
  const getNumericImputationValue = (data: any[], column: string, method = 'mean'): number | null => {
    const stats = calculateNumericStats(data, column);
    if (!stats) return null;
    
    switch (method.toLowerCase()) {
      case 'mean':
        return stats.mean;
      case 'median':
        return stats.median;
      case 'mode':
        return stats.mode;
      default:
        return stats.mean; // Default to mean if invalid method specified
    }
  };

  if (actionType === 'FILL_MISSING' || actionType === 'FILL_MISSING_NUMERIC') {
    const method = imputationMethod || 'mean';
    let replacementValue: any;

    // Pre-calculate the imputation value for numeric columns
    if (actionType === 'FILL_MISSING_NUMERIC') {
      replacementValue = getNumericImputationValue(newData, columnName, method);
      if (replacementValue === null) {
        console.warn(`Failed to calculate ${method} for column "${columnName}"`);
        return newData; // Return unchanged if calculation fails
      }
    } else {
      // For non-numeric columns, use the suggested fragment directly
      replacementValue = suggestedFragment === 'N/A' ? 'N/A' : suggestedFragment;
    }

    // Apply the replacement to all empty values in the column
    newData.forEach((row: any, index: number) => {
      if (isEmptyValue(row[columnName])) {
        row[columnName] = replacementValue;
        changesApplied++;
      }
    });
  }
  // Handle other column-wide actions like standardization
  else if (actionType === 'STANDARDIZE_FORMAT') {
    // For standardizing dates, numbers, casing, etc.
    // The implementation depends on the specific standardization needed
    // This is a simplified example for text standardization
    newData.forEach((row: any, index: number) => {
      const currentValue = row[columnName];
      if (currentValue !== null && currentValue !== undefined) {
        if (typeof currentValue === 'string') {
          // Examples of standardization:
          // - Convert to uppercase/lowercase/title case
          if (suggestedFragment.toLowerCase() === 'uppercase') {
            row[columnName] = currentValue.toUpperCase();
            changesApplied++;
          } else if (suggestedFragment.toLowerCase() === 'lowercase') {
            row[columnName] = currentValue.toLowerCase();
            changesApplied++;
          } else if (suggestedFragment.toLowerCase() === 'title case') {
            row[columnName] = currentValue
              .toLowerCase()
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            changesApplied++;
          }
          // Add more standardization formats as needed
          // e.g., date formats, numeric formats, etc.
        }
      }
    });
  }
  // Handle other column-wide operations...

  console.log(`Applied ${changesApplied} changes to column "${columnName}"`);
  return newData;
}

export async function applyCsvApprovedChanges(input: ApplyCsvApprovedChangesInput): Promise<ApplyCsvApprovedChangesOutput> {
  try {
    const { csvData, approvedSuggestions } = input;
    
    // Early validation
    if (!csvData?.trim()) {
      return {
        cleanedCsvData: csvData || '',
        summary: 'No CSV data provided.',
        errors: ['Missing or empty CSV data'],
        actionsAppliedCount: 0,
        actionsFailedCount: approvedSuggestions.length,
        cellsModifiedCount: 0,
        rowsRemovedCount: 0
      };
    }
    
    if (!approvedSuggestions || approvedSuggestions.length === 0) {
      return {
        cleanedCsvData: csvData,
        summary: 'No suggestions to apply.',
        errors: [],
        actionsAppliedCount: 0,
        actionsFailedCount: 0,
        cellsModifiedCount: 0,
        rowsRemovedCount: 0
      };
    }

    console.log(`Applying ${approvedSuggestions.length} approved suggestions to CSV data`);
    
    // Parse CSV data
    const parseResult = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as strings to avoid PapaParse's assumptions
    });
    
    if (parseResult.errors.length > 0) {
      console.warn("CSV parsing warnings:", parseResult.errors);
    }
    
    if (!parseResult.data || parseResult.data.length === 0) {
      return {
        cleanedCsvData: csvData,
        summary: 'Failed to parse CSV data or data is empty.',
        errors: ['Invalid CSV format or empty data'],
        actionsAppliedCount: 0,
        actionsFailedCount: approvedSuggestions.length,
        cellsModifiedCount: 0,
        rowsRemovedCount: 0
      };
    }

    // Define a type for our CSV row based on the parsed data
    type CsvRow = {[key: string]: string};
    
    let data = [...parseResult.data] as CsvRow[];
    const headers = parseResult.meta.fields || [];
    const actionErrors: string[] = [];
    let actionsAppliedCount = 0;
    let cellsModifiedCount = 0;
    let rowsRemovedCount = 0;
    
    // Cache numeric stats for columns that need imputation
    const statsCache = new Map<string, { mean: number; median: number; mode: number } | null>();
    for (const action of approvedSuggestions) {
      if (action.actionType === 'FILL_MISSING_NUMERIC' && action.columnName && action.imputationMethod && !statsCache.has(action.columnName)) {
        statsCache.set(action.columnName, calculateNumericStats(data, action.columnName));
      }
    }

    // First, handle row removals (from highest row number to lowest to avoid index shifting)
    const rowsToRemove = approvedSuggestions
      .filter(a => a.actionType === 'REMOVE_ROW' && a.rowNumber !== undefined)
      .sort((a, b) => (b.rowNumber || 0) - (a.rowNumber || 0));
    
    const rowsToRemoveIndices = new Set<number>();
    for (const action of rowsToRemove) {
      const rowIndex = (action.rowNumber || 0) - 1; // Convert to 0-indexed
      if (rowIndex >= 0 && rowIndex < data.length) {
        rowsToRemoveIndices.add(rowIndex);
        console.log(`Marked row ${action.rowNumber} for removal`);
      } else {
        actionErrors.push(`Action ID ${action.id}: Invalid row number ${action.rowNumber} for REMOVE_ROW`);
      }
    }

    if (rowsToRemoveIndices.size > 0) {
      const initialLength = data.length;
      data = data.filter((_, index) => !rowsToRemoveIndices.has(index));
      rowsRemovedCount = initialLength - data.length;
      actionsAppliedCount += rowsToRemoveIndices.size;
      console.log(`Removed ${rowsRemovedCount} rows`);
    }

    // Then handle other actions
    for (const action of approvedSuggestions) {
      if (action.actionType === 'REMOVE_ROW') continue; // Already handled above
      
      // Find the actual column name in the headers (case-insensitive)
      const colName = action.columnName;
      if (!colName) {
        actionErrors.push(`Action ID ${action.id} (${action.actionType}): Missing required columnName`);
        continue;
      }
      
      const actualHeader = headers.find(h => h.toLowerCase() === colName.toLowerCase());
      if (!actualHeader) {
        actionErrors.push(`Action ID ${action.id} (${action.actionType}): Column '${colName}' not found in headers: ${headers.join(', ')}`);
        continue;
      }
      
      const currentHeaderName = actualHeader;
      const suggested = String(action.suggestedFragment);
      let actionSucceeded = false;
      let cellsChangedInThisAction = 0;

      try {
        // Row-specific action
        if (action.rowNumber !== undefined) {
          const rowIndex = action.rowNumber - 1; // Convert to 0-indexed
          if (rowIndex >= 0 && rowIndex < data.length) {
            const originalValue = String(data[rowIndex][currentHeaderName as keyof typeof data[0]]);
            let newValue = originalValue;
            
            if (action.actionType === 'MODIFY_CELL') {
              // For row-specific MODIFY_CELL, replace the value directly
              if (originalValue === action.originalFragment || 
                  action.originalFragment === "Cell value to be modified") {
                newValue = suggested;
              } else {
                // If originalFragment doesn't match but rowNumber is specified, still apply
                newValue = suggested;
                console.warn(`OriginalFragment '${action.originalFragment}' didn't match '${originalValue}'. Applying suggested value based on row-specific instruction.`);
              }
            } else if (action.actionType === 'STANDARDIZE_FORMAT') {
              // Basic standardization
              if (suggested.toLowerCase().includes('uppercase')) newValue = originalValue.toUpperCase();
              else if (suggested.toLowerCase().includes('lowercase')) newValue = originalValue.toLowerCase();
              else if (suggested.toLowerCase().includes('trim')) newValue = originalValue.trim();
              else newValue = suggested; // Fallback
            } else if (action.actionType === 'FILL_MISSING') {
              const isMissing = originalValue === null || originalValue === undefined || originalValue.trim() === '';
              if (isMissing) newValue = suggested;
            } else if (action.actionType === 'FILL_MISSING_NUMERIC') {
              const isMissing = originalValue === null || originalValue === undefined || originalValue.trim() === '' || isNaN(parseFloat(originalValue));
              if (isMissing && action.imputationMethod) {
                const stats = statsCache.get(currentHeaderName);
                if (stats && (action.imputationMethod === 'mean' || action.imputationMethod === 'median' || action.imputationMethod === 'mode')) {
                  newValue = String(stats[action.imputationMethod]);
                }
                else actionErrors.push(`Action ID ${action.id}: No stats available for numeric imputation in column ${currentHeaderName}`);
              }
            } else if (action.actionType === 'REVIEW_CONSISTENCY') {
              newValue = action.userProvidedReplacement || suggested;
            }
            
            if (newValue !== originalValue) {
              data[rowIndex][currentHeaderName as keyof typeof data[0]] = newValue;
              cellsChangedInThisAction++;
              console.log(`Modified: Row ${action.rowNumber}, Col ${currentHeaderName} from '${originalValue}' to '${newValue}'`);
            }
            
            actionSucceeded = true;
          } else {
            actionErrors.push(`Action ID ${action.id}: Row number ${action.rowNumber} out of bounds after potential row removals`);
          }
        } else {
          // Column-wide action
          for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
            const originalValue = String(data[rowIndex][currentHeaderName as keyof typeof data[0]]);
            let newValue = originalValue;
            let shouldModify = false;
            
            if (action.actionType === 'MODIFY_CELL') {
              // Column-wide MODIFY_CELL should match the originalFragment pattern
              if (originalValue === action.originalFragment) {
                newValue = suggested;
                shouldModify = true;
              }
            } else if (action.actionType === 'STANDARDIZE_FORMAT') {
              let standardized = originalValue;
              if (suggested.toLowerCase().includes('uppercase')) standardized = originalValue.toUpperCase();
              else if (suggested.toLowerCase().includes('lowercase')) standardized = originalValue.toLowerCase();
              else if (suggested.toLowerCase().includes('trim')) standardized = originalValue.trim();
              else if (suggested.toLowerCase().includes('yyyy-mm-dd')) {
                // Try to standardize dates to YYYY-MM-DD
                try {
                  const date = new Date(originalValue);
                  if (!isNaN(date.getTime())) {
                    standardized = date.toISOString().split('T')[0]; // YYYY-MM-DD
                  }
                } catch (e) { 
                  // If date parsing fails, leave as is
                }
              }
              
              if (standardized !== originalValue) {
                newValue = standardized;
                shouldModify = true;
              }
            } else if (action.actionType === 'FILL_MISSING') {
              const isMissing = originalValue === null || originalValue === undefined || String(originalValue).trim() === '';
              if (isMissing) {
                newValue = suggested;
                shouldModify = true;
              }
            } else if (action.actionType === 'FILL_MISSING_NUMERIC') {
              const isMissingOrInvalid = originalValue === null || originalValue === undefined || 
                                        String(originalValue).trim() === '' || isNaN(parseFloat(String(originalValue)));
              if (isMissingOrInvalid && action.imputationMethod) {
                const stats = statsCache.get(currentHeaderName);
                if (stats && (action.imputationMethod === 'mean' || action.imputationMethod === 'median' || action.imputationMethod === 'mode')) {
                  newValue = String(stats[action.imputationMethod]);
                  shouldModify = true;
                } else {
                  if (!actionErrors.some(e => e.includes(`No stats for ${currentHeaderName}`))) {
                    actionErrors.push(`Action ID ${action.id}: No stats for ${currentHeaderName}, cannot impute for column-wide fill`);
                  }
                }
              }
            } else if (action.actionType === 'REVIEW_CONSISTENCY') {
              // For column-wide REVIEW, apply if originalFragment matches
              if (originalValue === action.originalFragment) {
                newValue = action.userProvidedReplacement || suggested;
                shouldModify = true;
              }
            }
            
            if (shouldModify && newValue !== originalValue) {
              data[rowIndex][currentHeaderName as keyof typeof data[0]] = newValue;
              cellsChangedInThisAction++;
            }
          }
          
          actionSucceeded = true;
        }
        
        if (actionSucceeded) {
          actionsAppliedCount++;
          cellsModifiedCount += cellsChangedInThisAction;
        }
      } catch (e: any) {
        actionErrors.push(`Action ID ${action.id}: Error during application - ${e.message}`);
        console.error(`Error processing action ${action.id}:`, e);
      }
    }
    
    // Convert data back to CSV
    const cleanedCsvData = Papa.unparse(data, { header: true });
    
    // Create summary
    let summary = `Applied changes based on ${actionsAppliedCount} approved suggestion(s). ${cellsModifiedCount} cell(s) modified, ${rowsRemovedCount} row(s) removed.`;
    if (actionErrors.length > 0) {
      summary += ` Encountered ${actionErrors.length} error(s) during application.`;
    }
    
    return {
      cleanedCsvData,
      summary,
      errors: actionErrors.length > 0 ? actionErrors : undefined,
      actionsAppliedCount,
      actionsFailedCount: approvedSuggestions.length - actionsAppliedCount,
      cellsModifiedCount,
      rowsRemovedCount
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      cleanedCsvData: input.csvData || '',
      summary: `Critical error: ${errorMessage}`,
      errors: [`Critical application error: ${errorMessage}`],
      actionsAppliedCount: 0,
      actionsFailedCount: input.approvedSuggestions.length,
      cellsModifiedCount: 0,
      rowsRemovedCount: 0
    };
  }
}
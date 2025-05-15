// src/components/csv-processing.tsx
'use client';

import React, { useState, useRef, type ChangeEvent, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import {
  suggestCsvCleaningActions,
  type SuggestCsvCleaningActionsOutput,
} from '@/ai/flows/csv-cleaning-suggestions';
import { type CleaningSuggestion } from '@/ai/flows/schemas/csv-schemas';

import {
  applyCsvApprovedChanges,
  type ApplyCsvApprovedChangesInput,
  type ApplyCsvApprovedChangesOutput
} from '@/ai/flows/apply-csv-changes';

import { profileData, type ProfileDataOutput } from '@/ai/flows/data-profiling';
import { processCsvWithSql, type CsvSqlProcessOutput } from '@/ai/flows/csv-sql-processing';
import { processCsvWithCommands, type CsvDirectCommandOutput } from '@/ai/flows/csv-direct-commands';
import { processDirectCsv } from '@/ai/flows/csv-direct-processor';
import { processDirectSql } from '@/ai/flows/csv-direct-sql-processor';
import { LlmModel } from '@/ai/flows/schemas/csv-processor-types'; // Import the LlmModel enum
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, Download, FileText, CheckCircle, BarChartHorizontalBig, Table, Sparkles, ListChecks, UserCog, Bot, RotateCcw, Settings2, Lightbulb, Info, Database, MessageSquare, Wand2, Search, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import SuggestionItem from './suggestion-item';
import { ScrollArea } from './ui/scroll-area'; 
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface FilePreview {
  name: string;
  size: number;
  type: string;
  rowCount: number;
}

export interface SuggestionWithStatus extends CleaningSuggestion {
  status: 'pending' | 'approved' | 'rejected';
  selectedImputationMethod?: 'mean' | 'median' | 'mode';
  userProvidedReplacement?: string; 
}

export function calculateFrontendNumericStats(csvData: string, columnName: string): { mean: number; median: number; mode: number } | null {
    try {
        const parseResult = Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false, // Keep as string to avoid PapaParse's typing assumptions
        });

        if (parseResult.errors.length > 0) {
            console.warn("calculateFrontendNumericStats: CSV parsing errors:", parseResult.errors);
        }

        const data = parseResult.data || [];
        if (!data || data.length === 0) return null;

        const headerRow = parseResult.meta.fields || [];
        let actualColumnName = columnName;
        if (!headerRow.includes(columnName)) {
            const matchingHeader = headerRow.find(h => h.toLowerCase() === columnName.toLowerCase());
            if (matchingHeader) {
                actualColumnName = matchingHeader;
            } else {
                console.warn(`calculateFrontendNumericStats: Column '${columnName}' not found. Available: ${headerRow.join(', ')}`);
                return null;
            }
        }
        
        interface DataRow {
            [key: string]: any;
        }
        
        const values = data
            .map(row => {
                const typedRow = row as DataRow;
                return typedRow[actualColumnName];
            })
            .filter((val: any) => val !== null && val !== undefined && String(val).trim() !== '')
            .map((val: any) => parseFloat(String(val))) // Convert to number for calculation
            .filter((num: number) => !isNaN(num));

        if (values.length === 0) return null;

        const sum = values.reduce((acc: number, val: number) => acc + val, 0);
        const mean = sum / values.length;

        values.sort((a: number, b: number) => a - b);
        const mid = Math.floor(values.length / 2);
        const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;

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
            if (Object.prototype.hasOwnProperty.call(frequency, valKey)) {
              if (frequency[Number(valKey)] === maxFreq) {
                modes.push(parseFloat(valKey));
            }
            }
        }
        // If all values are unique, mode is less meaningful; might return mean or first value.
        // Here, if multiple modes, picks first. If no mode (all unique or maxFreq=1), fallback to mean.
        const mode = modes.length > 0 && maxFreq > 1 ? modes[0] : mean; 

        return { mean, median, mode };
    } catch (e) {
        console.error(`Error calculating frontend numeric stats for column '${columnName}':`, e);
        return null;
    }
}


export default function CsvProcessing() {
  const [currentCsvData, setCurrentCsvData] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [cleaningInstructions, setCleaningInstructions] = useState('');

  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsResult, setSuggestionsResult] = useState<SuggestCsvCleaningActionsOutput | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const [userInstructionSuggestions, setUserInstructionSuggestions] = useState<SuggestionWithStatus[]>([]);
  const [generalSuggestions, setGeneralSuggestions] = useState<SuggestionWithStatus[]>([]);

  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [finalCleanedResult, setFinalCleanedResult] = useState<ApplyCsvApprovedChangesOutput | null>(null);
  const [applyChangesError, setApplyChangesError] = useState<string | null>(null);
  const [applySummary, setApplySummary] = useState<string | null>(null);

  const [isProfiling, setIsProfiling] = useState(false);
  const [profileResult, setProfileResult] = useState<ProfileDataOutput | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [isIterativeProcessing, setIsIterativeProcessing] = useState(false);
  const [originalDataForFlow, setOriginalDataForFlow] = useState<string | null>(null);
  const [appliedSuggestionIds, setAppliedSuggestionIds] = useState<Set<string>>(new Set());

  const [isSqlMode, setIsSqlMode] = useState<boolean>(false);
  const [isCommandMode, setIsCommandMode] = useState<boolean>(false);
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [directCommands, setDirectCommands] = useState<string>('');
  const [isProcessingSql, setIsProcessingSql] = useState<boolean>(false);
  const [isProcessingCommands, setIsProcessingCommands] = useState<boolean>(false);
  const [sqlResult, setSqlResult] = useState<CsvSqlProcessOutput | null>(null);
  const [commandResult, setCommandResult] = useState<CsvDirectCommandOutput | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  
  // Add state for LLM model selection
  const [selectedModel, setSelectedModel] = useState<LlmModel>(LlmModel.DEFAULT);
  const [geminiModel, setGeminiModel] = useState<string>('gemini-2.0-flash');
  const [ollamaModel, setOllamaModel] = useState<string>('gemma3:4b');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (suggestionsResult && suggestionsResult.suggestions) {
      const allSuggestionsWithStatus = suggestionsResult.suggestions.map(s => ({
        ...s,
        status: 'pending' as const,
        source: s.source || (cleaningInstructions.trim() ? 'user_instruction' : 'general_suggestion'),
        userProvidedReplacement: s.userProvidedReplacement || '', // Ensure this field exists
      }));

      setUserInstructionSuggestions(allSuggestionsWithStatus.filter(s => s.source === 'user_instruction'));
      setGeneralSuggestions(allSuggestionsWithStatus.filter(s => s.source === 'general_suggestion'));
    } else {
      setUserInstructionSuggestions([]);
      setGeneralSuggestions([]);
    }
  }, [suggestionsResult, cleaningInstructions]);

  useEffect(() => {
    if (currentCsvData && !isIterativeProcessing) {
        setOriginalDataForFlow(currentCsvData);
    }
  }, [currentCsvData, isIterativeProcessing]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setOriginalFileName(selectedFile.name);
        const fileContent = await selectedFile.text();
        setCurrentCsvData(fileContent);
        setOriginalDataForFlow(fileContent); // Set original data for flow on new file upload

        const parsedForPreview = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
        setFilePreview({
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
          rowCount: parsedForPreview.data.length,
        });
        
        setSuggestionsError(null);
        setProfileError(null);
        setApplyChangesError(null);
        setApplySummary(null);
        setSuggestionsResult(null);
        setFinalCleanedResult(null);
        setProfileResult(null);
        setIsIterativeProcessing(false); 
        setCleaningInstructions('');
      } else {
        setSuggestionsError('Please select a valid CSV file.');
        setOriginalFileName(null);
        setCurrentCsvData(null);
        setFilePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        toast({ title: "Invalid File", description: "Please select a CSV file.", variant: "destructive" });
      }
    }
  };

  const handleSuggestCleaning = async () => {
    const dataToSuggestOn = originalDataForFlow || currentCsvData;
    if (!dataToSuggestOn) {
      setSuggestionsError('Please load CSV data first.');
      toast({ title: "No Data", description: "Please upload CSV data.", variant: "destructive" });
      return;
    }

    setIsLoadingSuggestions(true);
    setSuggestionsError(null);
    setApplyChangesError(null);
    setApplySummary(null);
    setSuggestionsResult(null);
    setFinalCleanedResult(null);

    try {
      const output = await suggestCsvCleaningActions({
        csvData: dataToSuggestOn, // Use original data for new suggestions
        cleaningInstructions: cleaningInstructions.trim() || undefined,
      });
      setSuggestionsResult(output);

       toast({
         title: "Cleaning Suggestions Ready",
         description: output.overallSummary || `Found ${output.suggestions?.length ?? 0} suggestions. Review below.`,
       });
    } catch (e) {
      console.error('Error suggesting CSV cleaning actions:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred while generating suggestions.';
      setSuggestionsError(errorMessage);
      toast({
        title: "Suggestion Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

   const handleSuggestionToggle = (id: string, category: 'user' | 'general', userReplacement?: string) => {
    const updater = (prev: SuggestionWithStatus[]): SuggestionWithStatus[] => prev.map(s => {
      if (s.id === id) {
        let nextStatus: 'pending' | 'approved' | 'rejected' = 'pending';
        if (s.status === 'pending') nextStatus = 'approved';
        else if (s.status === 'approved') nextStatus = 'rejected';

        const requiresImputation = s.actionType === 'FILL_MISSING_NUMERIC' && s.suggestedFragment === 'CALCULATE';
        const selectedImputationMethod = (nextStatus !== 'approved' && requiresImputation) ? undefined : s.selectedImputationMethod;
        
        const newUserProvidedReplacement = userReplacement !== undefined ? userReplacement : s.userProvidedReplacement;
        const finalUserReplacement = (nextStatus === 'approved' && s.actionType === 'REVIEW_CONSISTENCY') ? newUserProvidedReplacement :
                                      (nextStatus === 'rejected' || nextStatus === 'pending') ? '' : 
                                      s.userProvidedReplacement; 
        
        // Return with explicit type to ensure it's a SuggestionWithStatus
        const result: SuggestionWithStatus = { 
            ...s, 
            status: nextStatus,
            selectedImputationMethod,
            userProvidedReplacement: finalUserReplacement 
        };
        return result;
      }
      return s;
    });

    if (category === 'user') {
      setUserInstructionSuggestions(updater);
    } else {
      setGeneralSuggestions(updater);
    }
  };


  const handleImputationMethodChange = (id: string, category: 'user' | 'general', method: 'mean' | 'median' | 'mode') => {
    const updater = (prev: SuggestionWithStatus[]): SuggestionWithStatus[] => prev.map(s => {
      if (s.id === id && s.actionType === 'FILL_MISSING_NUMERIC') {
        // Explicitly typing the return value to ensure it's a SuggestionWithStatus
        const updated: SuggestionWithStatus = { 
          ...s, 
          selectedImputationMethod: method, 
          status: 'approved' as const // Auto-approve on method selection
        };
        return updated;
      }
      return s;
    });
     if (category === 'user') {
      setUserInstructionSuggestions(updater);
    } else {
      setGeneralSuggestions(updater);
    }
  };
  
  const handleApplyApprovedChanges = async () => {
    const dataToApplyOn = currentCsvData;
    if (!dataToApplyOn) {
        setApplyChangesError('No CSV data available to apply changes to.');
        toast({ title: "Error", description: "No CSV data loaded.", variant: "destructive" });
        return;
    }

    const approvedUserActions = userInstructionSuggestions.filter(s => s.status === 'approved');
    const approvedGeneralActions = generalSuggestions.filter(s => s.status === 'approved');
    const allApprovedActions = [...approvedUserActions, ...approvedGeneralActions];

    if (allApprovedActions.length === 0) {
        toast({
            title: "No Changes to Apply",
            description: "Please approve some suggestions first or select imputation/replacement methods.",
        });
        return;
    }

    setIsApplyingChanges(true);
    setApplyChangesError(null);
    setApplySummary(null);
    setFinalCleanedResult(null);

    try {
        // Log the approved suggestions for debugging
        console.log(`[CSV Processing] Applying ${allApprovedActions.length} actions to CSV data`);
        console.log('Approved Actions:', JSON.stringify(allApprovedActions, null, 2));
        
        // Create a clean copy of the approved actions for processing
        // This fixes issues with circular references or unserialized properties
        const cleanedApprovedActions = allApprovedActions.map(action => ({
            ...action,
            // Ensure these fields are properly set
            id: action.id,
            description: action.description,
            columnName: action.columnName,
            rowNumber: action.rowNumber,
            originalFragment: action.originalFragment,
            suggestedFragment: action.suggestedFragment,
            actionType: action.actionType,
            selectedImputationMethod: action.selectedImputationMethod,
            userProvidedReplacement: action.userProvidedReplacement || '',
            source: action.source || 'general_suggestion',
            // Additional fields that might be needed
            confidence: action.confidence || 0.75,
            priority: action.priority || 'medium',
        }));
        
        // Use the server-side function to apply changes
        const output = await applyCsvApprovedChanges({
            csvData: dataToApplyOn,
            approvedSuggestions: cleanedApprovedActions,
        });
        
        console.log('[CSV Processing] Server returned result:', output);
        
        // Verify the data actually changed
        if (output.cleanedCsvData === dataToApplyOn) {
            console.warn('[CSV Processing] Warning: Output CSV is identical to input CSV');
        } else {
            console.log('[CSV Processing] CSV data was modified successfully');
        }
        
        // Update the current CSV data with the cleaned version
        setCurrentCsvData(output.cleanedCsvData);
        setIsIterativeProcessing(true);
        
        // Set the result for display
        setFinalCleanedResult(output);
        setApplySummary(output.summary);
        
        // Show appropriate toast based on results
        if (output.errors && output.errors.length > 0) {
            toast({
                title: "Changes Applied with Errors",
                description: `${output.summary.split('.')[0]}.`,
                variant: "destructive", 
                duration: 10000,
            });
        } else if (output.actionsAppliedCount > 0 && output.cellsModifiedCount === 0 && output.rowsRemovedCount === 0) {
            toast({
                title: "Actions Processed, No Data Changed",
                description: "The suggestions were processed but no data needed to be modified. This can happen if the data already matches the suggested changes.",
                variant: "default",
                className: "bg-blue-50 border-blue-200",
                action: <Info className="h-5 w-5 text-blue-600" />,
            });
        } else if (output.actionsAppliedCount === 0 && allApprovedActions.length > 0) {
            toast({
                title: "No Changes Applied",
                description: output.summary,
                variant: "destructive",
            });
        } else if (output.actionsAppliedCount > 0 && output.actionsFailedCount === 0) {
            toast({
                title: "Changes Applied Successfully",
                description: output.summary,
                variant: "default",
                action: <CheckCircle className="h-5 w-5 text-green-500" />,
            });
        } else {
            toast({
                title: "Some Changes Applied",
                description: output.summary,
                variant: "default",
                className: "bg-blue-50 border-blue-200",
                action: <Info className="h-5 w-5 text-blue-600" />,
            });
        }
        
        // Reset suggestion state
        setSuggestionsResult(null);
        setUserInstructionSuggestions([]);
        setGeneralSuggestions([]);

    } catch (e) {
        console.error('[CSV Processing] Critical error applying changes:', e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown critical error occurred during applying changes.';
        setApplyChangesError(errorMessage);
        toast({
            title: "Critical Application Error",
            description: errorMessage,
            variant: "destructive",
        });
    } finally {
        setIsApplyingChanges(false);
    }
  };

  const handleProfileCsv = async () => {
    const dataToProfile = currentCsvData; // Profile the current (potentially cleaned) data
    if (!dataToProfile) {
      setProfileError('Please load CSV data first.');
      toast({ title: "No Data", description: "Please upload CSV data.", variant: "destructive" });
      return;
    }

    setIsProfiling(true);
    setProfileError(null);
    setProfileResult(null);

    try {
      const parseResult = Papa.parse(dataToProfile, { header: true, skipEmptyLines: true });
      if (parseResult.errors.length > 0) {
         console.warn("CSV parsing issues detected before sending to profile:", parseResult.errors);
         toast({
           title: "CSV Parsing Warning",
           description: "Potential issues found in CSV data. Profiling will attempt to proceed.",
           variant: "default"
         });
      }
      if (!parseResult.data || parseResult.data.length === 0) {
        throw new Error("CSV data appears to be empty or invalid for profiling.");
      }

      const output = await profileData({
        data: dataToProfile, 
        format: 'csv',
      });
      setProfileResult(output);
      toast({
        title: "Profiling Complete",
        description: `CSV data profile generated successfully (${isIterativeProcessing ? 'cleaned data' : 'original data'}).`,
      });
    } catch (e) {
      console.error('Error profiling CSV:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during CSV profiling.';
      setProfileError(errorMessage);
      toast({
        title: "Profiling Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProfiling(false);
    }
  };

  const handleProcessWithSql = async () => {
    if (!currentCsvData) {
      setSqlError('No CSV data available to process.');
      toast({ title: "Error", description: "No CSV data loaded.", variant: "destructive" });
      return;
    }

    if (!sqlQuery?.trim()) {
      setSqlError('Please enter a SQL query to process the CSV data.');
      toast({ title: "Error", description: "SQL query cannot be empty.", variant: "destructive" });
      return;
    }

    setIsProcessingSql(true);
    setSqlError(null);
    setSqlResult(null);    try {
      console.log(`[SQL Processing] Processing CSV data with SQL query: ${sqlQuery}`);      // Parse the CSV headers to check for common SQL query mistakes
      const firstLine = currentCsvData.trim().split('\n')[0];
      const firstLineResult = Papa.parse(firstLine, { header: false });
      const possibleHeaders = (firstLineResult.data[0] || []) as string[];
      
      // Look for possible table/column name confusion in the FROM clause
      const fromTableMatch = sqlQuery.match(/FROM\s+(\w+)/i);
      if (fromTableMatch) {
        const tableName = fromTableMatch[1];
        
        // Check if the table name is also a column name, which can cause confusion
        if (possibleHeaders.includes(tableName) || possibleHeaders.some(h => h.toLowerCase() === tableName.toLowerCase())) {
          console.log(`[SQL Warning] Table name '${tableName}' is also a column name in the CSV`);
          toast({
            title: "Column/Table Name Conflict",
            description: `'${tableName}' appears to be both a column name and is used as a table name. In SQL queries against CSVs, use 'FROM data' and refer to columns in WHERE clauses.`,
            variant: "warning",
            duration: 10000
          });
          
          // If they're also using the same name in a WHERE clause, show a more specific hint
          if (sqlQuery.toLowerCase().includes(`where ${tableName.toLowerCase()} =`)) {
            toast({
              title: "SQL Query Fix Suggestion",
              description: `Try using 'SELECT * FROM data WHERE ${tableName} =' instead of 'SELECT * FROM ${tableName} WHERE ${tableName} ='.`,
              variant: "warning",
              duration: 12000
            });
          }
        }
      }

      // First try the direct SQL processor which doesn't rely on AI
      const result = await processDirectSql({
        csvData: currentCsvData,
        sqlQuery: sqlQuery,
        originalFilename: originalFileName || undefined
      });

      console.log('[SQL Processing] Result:', result);      // Set the result
      setSqlResult(result);

      // Check for warnings in the error log and show them
      const warnings = result.errorLog?.filter(err => err.startsWith('Warning:')) || [];
      if (warnings.length > 0) {
        // Find any warnings about table/column name conflicts
        const tableColumnWarnings = warnings.filter(warning => 
          warning.includes('both a column name and was used as a table name')
        );
        
        if (tableColumnWarnings.length > 0) {
          // Show most important warning as toast
          toast({
            title: "SQL Table/Column Name Ambiguity",
            description: tableColumnWarnings[0].replace('Warning:', '').trim(),
            variant: "warning",
            duration: 10000
          });
          
          console.log("[SQL Processing] Column/table name ambiguity detected:", tableColumnWarnings);
        }
      }

      // For SELECT queries, we don't want to permanently modify the current CSV data
      // Instead, we'll just display the results
      if (result.isSelectQuery) {
        toast({
          title: "Query Results Ready",
          description: result.summary,
          variant: "default",
          action: <CheckCircle className="h-5 w-5 text-green-500" />,
        });
        setIsProcessingSql(false);
        return;
      }

      // For non-SELECT queries, check if any changes were made by comparing original and processed data
      const hasChanges = result.processedCsvData !== currentCsvData;
        // If direct processor couldn't handle it, or had errors, fall back to AI-based processor
      if (!hasChanges && (result.errorLog?.length || 0) > 0) {
        console.log('Direct SQL processor had errors, trying AI processor as fallback');
        try {
          const aiOutput = await processCsvWithSql({
            csvData: currentCsvData,
            sqlQuery: sqlQuery,
            originalFilename: originalFileName || undefined
          });
          
          // Add the SELECT query flag to the AI output based on the query
          const isAiSelectQuery = sqlQuery.trim().toUpperCase().startsWith('SELECT');
          const aiOutputWithFlag = {
            ...aiOutput,
            isSelectQuery: isAiSelectQuery,
            originalCsvData: isAiSelectQuery ? currentCsvData : undefined
          };
          
          // If AI was able to process it successfully, use that result instead
          const aiHasChanges = aiOutputWithFlag.processedCsvData !== currentCsvData;
          
          // For SELECT queries from AI processor, handle the same way as direct processor
          if (isAiSelectQuery) {
            setSqlResult(aiOutputWithFlag);
            toast({
              title: "Query Results Ready",
              description: aiOutputWithFlag.summary,
              variant: "default",
              action: <CheckCircle className="h-5 w-5 text-green-500" />,
            });
            setIsProcessingSql(false);
            return;
          }
          
          // For non-SELECT queries, update the data if there were changes
          if (aiHasChanges) {
            console.log('AI SQL processor made changes, using its result');
            setSqlResult(aiOutputWithFlag);
            setCurrentCsvData(aiOutputWithFlag.processedCsvData);
            setIsIterativeProcessing(true);
            
            toast({
              title: "SQL Processing Complete",
              description: aiOutputWithFlag.summary,
              variant: "default",
              action: <CheckCircle className="h-5 w-5 text-green-500" />,
            });
            setIsProcessingSql(false);
            return;
          }
        } catch (aiError) {
          console.error('AI SQL processor also failed:', aiError);
          // Continue with the direct processor result
        }
      }
      
      // Update CSV data if processing was successful and produced changes
      if (hasChanges) {
        setCurrentCsvData(result.processedCsvData);
        setIsIterativeProcessing(true);
        
        toast({
          title: "SQL Processing Complete",
          description: result.summary,
          variant: "default",
          action: <CheckCircle className="h-5 w-5 text-green-500" />,
        });      } else if ((result.errorLog?.length || 0) > 0) {
        // Separate warnings and errors for better user feedback
        const warnings = result.errorLog?.filter(log => log.startsWith('Warning:')) || [];
        const errors = result.errorLog?.filter(log => !log.startsWith('Warning:')) || [];
        
        if (errors.length > 0) {
          // If there's a column not found error that might be related to table/column confusion
          const columnNotFoundError = errors.find(err => err.includes('Column') && err.includes('not found'));
          
          if (columnNotFoundError && fromTableMatch) {
            // This might be a case where they're confused about table vs. column names
            toast({
              title: "SQL Column Not Found",
              description: `${columnNotFoundError}. If '${fromTableMatch[1]}' is your data, try using 'FROM data' instead.`,
              variant: "destructive",
            });
          } else {
            // General error case
            toast({
              title: "SQL Processing Completed with Errors",
              description: `${errors[0]} ${errors.length > 1 ? ` and ${errors.length - 1} more errors` : ''}`,
              variant: "destructive",
            });
          }
        } else if (warnings.length > 0) {
          // Only warnings, no errors
          toast({
            title: "SQL Processing Completed with Warnings",
            description: warnings[0].replace('Warning:', ''),
            variant: "warning",
          });
        }
      } else {
        toast({
          title: "No Changes Applied",
          description: "The SQL query didn't result in any data changes. Check your query conditions.",
          variant: "default",
          className: "bg-blue-50 border-blue-200",
          action: <Info className="h-5 w-5 text-blue-600" />,
        });
      }

    } catch (e) {
      console.error('[SQL Processing] Error processing CSV with SQL:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during SQL processing.';
      setSqlError(errorMessage);
      toast({
        title: "SQL Processing Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessingSql(false);
    }
  };

  const handleProcessWithCommands = async () => {
    if (!currentCsvData) {
      setCommandError('No CSV data available to process.');
      toast({ title: "Error", description: "No CSV data loaded.", variant: "destructive" });
      return;
    }

    if (!directCommands?.trim()) {
      setCommandError('Please enter commands to process the CSV data.');
      toast({ title: "Error", description: "Commands cannot be empty.", variant: "destructive" });
      return;
    }

    setIsProcessingCommands(true);
    setCommandError(null);
    setCommandResult(null);

    try {
      console.log(`[Command Processing] Processing CSV data with commands: ${directCommands} using model: ${selectedModel}`);

      // First try the direct processor which doesn't rely on AI
      const result = await processDirectCsv({
        csvData: currentCsvData,
        commands: directCommands
      });

      console.log('[Command Processing] Result:', result);

      // Check if any changes were made
      const hasChanges = result.appliedActions.some(a => a.affectedRows > 0);

      // If direct processor couldn't handle it, fall back to AI-based processor
      if (!hasChanges) {
        console.log('Direct processor made no changes, trying AI processor as fallback');
        try {
          const aiOutput = await processCsvWithCommands({
            csvData: currentCsvData,
            commands: directCommands,
            originalFilename: originalFileName || undefined,
            model: selectedModel,
            modelOptions: {
              geminiModel: selectedModel === LlmModel.GEMINI ? geminiModel : undefined,
              ollamaModel: selectedModel === LlmModel.OLLAMA ? ollamaModel : undefined
            }
          });
          
          // If AI was able to process it successfully, use that result instead
          const aiHasChanges = aiOutput.processedCsvData !== currentCsvData;
          if (aiHasChanges) {
            console.log('AI processor made changes, using its result');
            setCommandResult(aiOutput);
            setCurrentCsvData(aiOutput.processedCsvData);
            setIsIterativeProcessing(true);
            
            toast({
              title: "Processing Complete",
              description: aiOutput.summary,
              variant: "default",
              action: <CheckCircle className="h-5 w-5 text-green-500" />,
            });
            setIsProcessingCommands(false);
            return;
          }
        } catch (aiError) {
          console.error('AI processor also failed:', aiError);
          // Continue with the direct processor result
        }
      }

      // Set the result from direct processor
      setCommandResult(result);
      
      // Update CSV data if processing was successful
      if (hasChanges) {
        setCurrentCsvData(result.processedCsvData);
        setIsIterativeProcessing(true);
        
        toast({
          title: "Processing Complete",
          description: result.summary,
          variant: "default",
          action: <CheckCircle className="h-5 w-5 text-green-500" />,
        });
      } else {
        toast({
          title: "No Changes Applied",
          description: "The processor understood your commands but no changes were needed or applicable.",
          variant: "default",
          className: "bg-blue-50 border-blue-200",
          action: <Info className="h-5 w-5 text-blue-600" />,
        });
      }

    } catch (e) {
      console.error('[Command Processing] Error processing CSV with commands:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during command processing.';
      setCommandError(errorMessage);
      toast({
        title: "Command Processing Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessingCommands(false);
    }
  };

  const handleDownload = () => {
    if (!currentCsvData) {
        toast({ title: "Nothing to Download", description: "Please upload or process some data first.", variant: "destructive"});
        return;
    }

    const blob = new Blob([currentCsvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);

    const originalNameBase = originalFileName ? originalFileName.replace(/\.csv$/i, '') : 'data';
    const downloadName = `${originalNameBase}${isIterativeProcessing ? '_processed' : ''}.csv`;
    link.setAttribute('download', downloadName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
     toast({
       title: "Download Started",
       description: `Your ${isIterativeProcessing ? 'processed' : 'current'} CSV file is downloading.`,
     });
  };

  const toggleSelectAll = (category: 'user' | 'general', targetStatus: 'approved' | 'rejected' | 'pending') => {
    const updater = (prev: SuggestionWithStatus[]): SuggestionWithStatus[] => prev.map(s => {
        if (s.actionType === 'FILL_MISSING_NUMERIC' && s.suggestedFragment === 'CALCULATE' && targetStatus === 'approved' && !s.selectedImputationMethod) {
            console.log(`Skipping auto-approval for ${s.id}: requires imputation selection.`);
            return s; 
        }
        if (s.actionType === 'REVIEW_CONSISTENCY' && targetStatus === 'approved' && !s.userProvidedReplacement && s.suggestedFragment?.toUpperCase().includes('MANUAL REVIEW')) {
             console.log(`Skipping auto-approval for ${s.id}: requires manual replacement.`);
            return s; 
        }
        
        const selectedImputationMethod = targetStatus === 'approved' ? s.selectedImputationMethod : undefined;
        const userProvidedReplacement = targetStatus === 'approved' ? s.userProvidedReplacement : '';

        return {
            ...s, 
            status: targetStatus as SuggestionWithStatus['status'], 
            selectedImputationMethod, 
            userProvidedReplacement
        };
    });

    if (category === 'user') {
      setUserInstructionSuggestions(updater);
    } else {
      setGeneralSuggestions(updater);
    }
  };

  const handleProcessingModeChange = (mode: 'suggestion' | 'sql' | 'command') => {
    if (mode === 'suggestion') {
      setIsSqlMode(false);
      setIsCommandMode(false);
    } else if (mode === 'sql') {
      setIsSqlMode(true);
      setIsCommandMode(false);
    } else if (mode === 'command') {
      setIsSqlMode(false);
      setIsCommandMode(true);
    }
  };

   const renderSuggestions = useCallback((suggestions: SuggestionWithStatus[], category: 'user' | 'general', title: string, icon: React.ReactNode) => {
     if (!suggestionsResult || suggestions.length === 0) {
         if (category === 'user' && cleaningInstructions.trim()) { // Only show for user if instructions were given
             return <p className="text-sm text-muted-foreground mt-4">No specific suggestions based on your instructions. The AI might address them under general suggestions if applicable, or your instructions were already met by the data.</p>;
         }
         return null;
     }


     return (
       <div className="mt-6">
         <h4 className="text-md font-semibold mb-3 flex items-center gap-2 border-b pb-2">{icon}{title} ({suggestions.length})</h4>
         {suggestions.length > 0 && (
           <div className="flex items-center flex-wrap gap-2 mb-4 text-sm">
             <Button variant="outline" size="sm" onClick={() => toggleSelectAll(category, 'approved')}>
               Approve All ({category})
             </Button>
             <Button variant="outline" size="sm" onClick={() => toggleSelectAll(category, 'rejected')}>
                Reject All ({category})
             </Button>
              <Button variant="outline" size="sm" onClick={() => toggleSelectAll(category, 'pending')}>
                Reset All ({category})
             </Button>
             <span className="text-xs text-muted-foreground">(Note: Actions requiring input won't be auto-approved)</span>
           </div>
         )}
         <Accordion type="multiple" className="w-full space-y-2">
           {suggestions.map((suggestion) => {
             return (
               <SuggestionItem
                 key={suggestion.id}
                 suggestion={suggestion}
                 category={category}
                 currentCsvData={currentCsvData}
                 onToggleStatus={handleSuggestionToggle}
                 onImputationChange={handleImputationMethodChange}
               />
             );
           })}
         </Accordion>
       </div>
     );
   }, [currentCsvData, suggestionsResult, cleaningInstructions, handleImputationMethodChange, handleSuggestionToggle, toggleSelectAll]);


  const totalApprovedCount = useMemo(() => {
      return [...userInstructionSuggestions, ...generalSuggestions].filter(s => s.status === 'approved').length;
  }, [userInstructionSuggestions, generalSuggestions]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Upload or Paste CSV Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           {isIterativeProcessing && (
                <Alert variant="default" className="bg-primary/10 border-primary/30">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  <AlertTitle>Iterative Mode Active</AlertTitle>
                  <AlertDescription>
                    You are now working with the previously cleaned data. Suggestions and profiling will be based on this version.
                    Upload a new file or clear the text area to start over with original data.
                  </AlertDescription>
                </Alert>
            )}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Label htmlFor="csvFile" className="sr-only">Upload CSV</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv, text/csv"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 flex-grow"
              disabled={isLoadingSuggestions || isProfiling || isApplyingChanges}
            />
              {currentCsvData && (
                 <Button onClick={handleDownload} variant="outline" size="sm" className="mt-2 sm:mt-0 flex-shrink-0">
                     <Download className="mr-2 h-4 w-4" />
                     Download Current CSV
                 </Button>
            )}
           </div>
           {filePreview && (
            <div className="text-sm text-muted-foreground flex items-center gap-2 p-2 border rounded-md bg-secondary/50 mt-2">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>{filePreview.name} ({filePreview.rowCount} rows, {(filePreview.size / 1024).toFixed(2)} KB)</span>
               {isIterativeProcessing && <Badge variant="secondary" className="ml-auto">Processed</Badge>}
               {filePreview.size > 5 * 1024 * 1024 && ( 
                   <Badge variant="destructive" className="ml-2">Large File</Badge>
               )}
            </div>
          )}
            <div className="relative">
               <Textarea
                 placeholder="Or paste CSV data here..."
                 value={currentCsvData ?? ''}
                 onChange={(e) => {
                    setCurrentCsvData(e.target.value);
                    // If pasting, assume it's new "original" data for this session
                    setOriginalDataForFlow(e.target.value); 
                    setFilePreview(null);
                    if(fileInputRef.current) fileInputRef.current.value = ''; // Clear file input
                    setIsIterativeProcessing(false); 
                 }}
                 rows={8}
                 disabled={isLoadingSuggestions || isProfiling || isApplyingChanges}
                 className="text-sm font-mono"
               />
               {currentCsvData && currentCsvData.length > 10 * 1024 * 1024 && ( 
                   <Badge variant="destructive" className="absolute bottom-2 right-2">Large Text</Badge>
                )}
           </div>
             { (filePreview && filePreview.size > 5 * 1024 * 1024) || (currentCsvData && currentCsvData.length > 10 * 1024 * 1024) ? (
                 <Alert variant="default" className="bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700">
                     <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                     <AlertTitle className="text-yellow-700 dark:text-yellow-300">Performance Note</AlertTitle>
                     <AlertDescription className="text-yellow-600 dark:text-yellow-400">
                         Processing large files directly in the browser might be slow or unresponsive. Consider using smaller samples for AI suggestions or server-side processing for optimal performance with very large datasets.
                     </AlertDescription>
                 </Alert>
             ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap">
            <CardTitle className="text-lg">2. CSV Actions</CardTitle>
            <div className="flex items-center space-x-2">
              <Tabs defaultValue="suggestion" className="w-[400px]" onValueChange={(value) => handleProcessingModeChange(value as 'suggestion' | 'sql' | 'command')}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="suggestion">Suggestion Mode</TabsTrigger>
                  <TabsTrigger value="command">Command Mode</TabsTrigger>
                  <TabsTrigger value="sql">SQL Mode</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <CardDescription>
            {isCommandMode ? "Process CSV data using simple natural language commands - the fastest and easiest way to clean your data." : 
             isSqlMode ? "Process CSV data directly using SQL-like queries for more flexible data manipulation." : 
             "Get cleaning suggestions or profile the current data. Suggestions are based on the initially uploaded/pasted data unless iterative mode is active."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isCommandMode ? (
            <div className="space-y-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent" /> Natural Language Commands
              </h3>
              
              {/* Add LLM model selection */}
              <div className="flex flex-wrap gap-4 items-end mb-4 p-3 border rounded-md bg-secondary/20">
                <div>
                  <Label htmlFor="llmModel" className="text-sm font-medium mb-1 block">LLM Model</Label>
                  <Select 
                    value={selectedModel} 
                    onValueChange={(value) => setSelectedModel(value as LlmModel)}
                  >
                    <SelectTrigger className="w-[180px]" id="llmModel">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LlmModel.DEFAULT}>Default</SelectItem>
                      <SelectItem value={LlmModel.GEMINI}>Gemini</SelectItem>
                      <SelectItem value={LlmModel.OLLAMA}>Ollama</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedModel === LlmModel.GEMINI && (
                  <div>
                    <Label htmlFor="geminiModel" className="text-sm font-medium mb-1 block">Gemini Model</Label>
                    <Select 
                      value={geminiModel} 
                      onValueChange={setGeminiModel}
                    >
                      <SelectTrigger className="w-[180px]" id="geminiModel">
                        <SelectValue placeholder="Select Gemini model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {selectedModel === LlmModel.OLLAMA && (
                  <div>
                    <Label htmlFor="ollamaModel" className="text-sm font-medium mb-1 block">Ollama Model</Label>
                    <Select 
                      value={ollamaModel} 
                      onValueChange={setOllamaModel}
                    >
                      <SelectTrigger className="w-[180px]" id="ollamaModel">
                        <SelectValue placeholder="Select Ollama model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemma3:4b">Gemma3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="w-full">
                  <p className="text-xs text-muted-foreground">
                    {selectedModel === LlmModel.DEFAULT ? 
                      "Using pattern matching for basic command processing." : 
                      selectedModel === LlmModel.GEMINI ? 
                      "Using Google's Gemini for advanced natural language processing." : 
                      "Using local Ollama models for processing without sending data externally."}
                  </p>
                </div>
              </div>
              
              <Textarea
                placeholder="Enter natural language commands. For example: 'Standardize all values in Item_Fat_Content to either Low Fat or Regular', 'Fill missing values in Weight column with the average value', 'Remove duplicate rows', etc."
                value={directCommands}
                onChange={(e) => setDirectCommands(e.target.value)}
                rows={5}
                disabled={isProcessingCommands}
                className="text-sm mb-2"
              />
              <p className="text-xs text-muted-foreground mb-3">
                For best results, click on the "Command Format Documentation" section below to see example command formats.
              </p>
              <Accordion type="single" collapsible className="w-full mb-3">
                <AccordionItem value="command-format">
                  <AccordionTrigger className="text-primary font-medium">
                    <Info className="h-4 w-4 mr-2" /> Command Format Documentation
                  </AccordionTrigger>                  <AccordionContent>
                    <div className="mt-2 space-y-4">
                      <div>
                        <h4 className="font-medium">1. Basic Operations</h4>
                        <h5 className="text-xs font-semibold mt-2">Find and Replace</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>replace "text to find" with "replacement text" in "Column Name"</code>
                        </div>
                        <p className="text-xs text-muted-foreground">Example:</p>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>replace " Type1" with "" in "Outlet_Type"</code><br/>
                        </div>
                        
                        <h5 className="text-xs font-semibold mt-2">Round Numeric Values</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>round "Column Name" to 2 decimal places</code>
                        </div>
                        
                        <h5 className="text-xs font-semibold mt-2">Fill Missing Values</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>fill missing in "Column Name" with "value"</code>
                        </div>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>fill missing values in "Weight" with "0"</code><br/>
                          <code>fill nulls in "Category" with "Unknown"</code>
                        </div>
                        
                        <h5 className="text-xs font-semibold mt-2">Standardize Values</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>standardize "Column Name" to "standard value" for values [value1, value2, value3]</code>
                        </div>
                        
                        <h5 className="text-xs font-semibold mt-2">Case Conversion</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>convert "Column Name" to uppercase</code><br/>
                          <code>convert "Column Name" to lowercase</code>
                        </div>
                        
                        <h5 className="text-xs font-semibold mt-2">Sorting</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>sort by "Column Name" ascending</code><br/>
                          <code>sort by "Column Name" descending numerically</code>
                        </div>
                        
                        <h5 className="text-xs font-semibold mt-2">Filtering (Keep/Remove Rows)</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>keep rows where "Column Name" equals "value"</code><br/>
                          <code>remove rows where "Column Name" contains "value"</code>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium">2. Conditional Operations</h4>
                        <h5 className="text-xs font-semibold mt-2">Numeric Comparisons</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>change all values less than 100 to 1000 in "Price" column</code><br/>
                          <code>replace values greater than 50 with "High" in "Score" column</code><br/>
                          <code>set all values not equal to "Approved" to "Pending" in "Status" column</code>
                        </div>
                        
                        <h5 className="text-xs font-semibold mt-2">Pattern Matching</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>replace values containing "big" with "large" in "Product_Size"</code><br/>
                          <code>change values starting with "temp" to "temporary" in "Category"</code><br/>
                          <code>set values matching "% small" to "compact" in "Product_Type"</code>
                        </div>
                        
                        <h5 className="text-xs font-semibold mt-2">Percentile Operations</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>replace the top 10% of values in "Revenue" with their mean</code><br/>
                          <code>replace the bottom 5% of values in "Performance" with 0</code>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium">3. Date and Time Operations</h4>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>convert dates in "Order_Date" to YYYY-MM-DD format</code><br/>
                          <code>extract month from "Transaction_Date" to a new column "Transaction_Month"</code><br/>
                          <code>flag all records with "Date" older than 2023-01-01</code>
                        </div>
                      </div>
                      
                      <div>                        <h4 className="font-medium">4. Statistical Transformations</h4>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>replace missing values in "Revenue" with the median of that column</code><br/>
                          <code>add a new column "Z_Score" with the z-score of "Performance"</code><br/>
                          <code>normalize values in "Data" column to range between 0 and 1</code><br/>
                          <code>replace outliers in "Price" (&gt;3 std dev) with the column's median</code>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium">5. Text Processing</h4>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>extract the first 5 characters from "Product_Code" into "Category_Code"</code><br/>
                          <code>split "Full_Name" into "First_Name" and "Last_Name"</code><br/>
                          <code>concatenate "City", "State", and "Zip" into "Location" separated by commas</code><br/>
                          <code>extract email domains from "Email" column to "Domain" column</code>
                        </div>
                      </div>
                      
                      <div>                        <h4 className="font-medium">6. Data Classification and Binning</h4>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>bin "Age" column into categories: "&lt;18", "18-35", "36-65", "&gt;65"</code><br/>
                          <code>create "Price_Range" with "Low" for &lt;50, "Medium" for 50-100, "High" for &gt;100</code><br/>
                          <code>group "Score" into quartiles labeled "Q1", "Q2", "Q3", "Q4"</code>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium">7. Dataset Structure Operations</h4>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>pivot data from "Month" column creating columns for each month with "Sales" values</code><br/>
                          <code>melt columns "Q1_Sales", "Q2_Sales", "Q3_Sales", "Q4_Sales" into "Quarter", "Sales"</code><br/>
                          <code>transpose the dataset using the first column as header</code>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <Button
                onClick={handleProcessWithCommands}
                disabled={isProcessingCommands || !directCommands.trim() || !currentCsvData}
                className="w-full sm:w-auto"
              >
                {isProcessingCommands ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Commands...</>
                ) : (
                  <><Wand2 className="mr-2 h-4 w-4" /> Process Commands</>
                )}
              </Button>
              {commandError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Command Processing Error</AlertTitle>
                  <AlertDescription>{commandError}</AlertDescription>
                </Alert>
              )}
              {commandResult && (
                <Card className="mt-4 border-t pt-4 bg-secondary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wand2 className="w-5 h-5"/> Command Processing Results
                    </CardTitle>
                    <CardDescription>{commandResult.summary}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-medium mb-2">Applied Actions</h4>
                    <div className="overflow-auto max-h-60">
                      <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground">
                          <tr>
                            <th className="p-2 text-left">Action</th>
                            <th className="p-2 text-right">Rows Affected</th>
                            <th className="p-2 text-left">Columns Affected</th>
                          </tr>
                        </thead>
                        <tbody>
                          {commandResult.appliedActions.map((action, idx) => (
                            <tr key={idx} className="border-b border-muted">
                              <td className="p-2">{action.description}</td>
                              <td className="p-2 text-right">{action.affectedRows}</td>
                              <td className="p-2">{action.affectedColumns.join(', ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {commandResult.errorMessages && commandResult.errorMessages.length > 0 && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertTitle>Processing Errors</AlertTitle>
                        <div className="max-h-40 overflow-y-auto">
                          <ul className="list-disc list-inside text-sm">
                            {commandResult.errorMessages.map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : isSqlMode ? (
            <div className="space-y-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Database className="w-5 h-5 text-accent" /> SQL-like Processing
              </h3>
              <Textarea
                placeholder="Enter SQL-like query. Example: UPDATE data SET Item_Fat_Content = 'Low Fat' WHERE Item_Fat_Content IN ('low fat', 'LF')"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                rows={5}
                disabled={isProcessingSql}
                className="text-sm font-mono mb-2"
              />              <p className="text-xs text-muted-foreground mb-3">
                Use SQL-like queries to directly process the CSV data. Supported operations: SELECT, WHERE, UPDATE, DELETE, CASE, basic functions, and aggregations.
              </p>
              <Accordion type="single" collapsible className="w-full mb-3">
                <AccordionItem value="sql-format">
                  <AccordionTrigger className="text-primary font-medium">
                    <Info className="h-4 w-4 mr-2" /> SQL Command Format Documentation
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="mt-2 space-y-4">
                      <div>
                        <h4 className="font-medium">1. SELECT Operations</h4>
                        <h5 className="text-xs font-semibold mt-2">Select All Columns</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>SELECT * FROM data</code>
                        </div>
                        
                        <h5 className="text-xs font-semibold mt-2">Select Specific Columns</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>SELECT Column1, Column2 FROM data</code>
                        </div>
                          <h5 className="text-xs font-semibold mt-2">Select with Filter</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>SELECT * FROM data WHERE Column = 'Value'</code>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          <Info className="h-3 w-3 inline mr-1" /> SELECT queries show filtered results without modifying your data. 
                          You'll see an option to apply the results if desired.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium">2. UPDATE Operations</h4>
                        <h5 className="text-xs font-semibold mt-2">Update All Rows</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>UPDATE data SET Column = 'New Value'</code>
                        </div>
                        
                        <h5 className="text-xs font-semibold mt-2">Update with Filter</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>UPDATE data SET Column = 'New Value' WHERE Column2 = 'Condition'</code>
                        </div>
                        
                        <h5 className="text-xs font-semibold mt-2">Update with IN Clause</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>UPDATE data SET Column = 'New Value' WHERE Column2 IN ('Value1', 'Value2')</code>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium">3. DELETE Operations</h4>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>DELETE FROM data WHERE Column = 'Value'</code><br/>
                          <code>DELETE FROM data WHERE Column &gt; 100</code>
                        </div>
                        <p className="text-xs text-muted-foreground">Note: DELETE without WHERE clause is not supported for safety.</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium">4. WHERE Clause Conditions</h4>
                        <h5 className="text-xs font-semibold mt-2">Equality</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>WHERE Column = 'Value'</code>
                        </div>
                        
                        <h5 className="text-xs font-semibold mt-2">Numeric Comparisons</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>WHERE Column &gt; 100</code><br/>
                          <code>WHERE Column &lt;= 50</code><br/>
                          <code>WHERE Column != 0</code>
                        </div>
                        
                        <h5 className="text-xs font-semibold mt-2">Pattern Matching</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>WHERE Column LIKE '%pattern%'</code><br/>
                          <code>WHERE Column LIKE 'start%'</code><br/>
                          <code>WHERE Column LIKE '%end'</code>
                        </div>
                        <p className="text-xs text-muted-foreground">Note: % is a wildcard for any number of characters, _ is for a single character.</p>
                        
                        <h5 className="text-xs font-semibold mt-2">IN Clause</h5>
                        <div className="bg-muted p-2 rounded my-1 text-xs">
                          <code>WHERE Column IN ('Value1', 'Value2', 'Value3')</code>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <Button
                onClick={handleProcessWithSql}
                disabled={isProcessingSql || !sqlQuery.trim() || !currentCsvData}
                className="w-full sm:w-auto"
              >
                {isProcessingSql ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing CSV with SQL...</>
                ) : (
                  <><Database className="mr-2 h-4 w-4" /> Process with SQL</>
                )}
              </Button>
              {sqlError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>SQL Processing Error</AlertTitle>
                  <AlertDescription>{sqlError}</AlertDescription>
                </Alert>
              )}
              {sqlResult && (
                <Card className="mt-4 border-t pt-4 bg-secondary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Database className="w-5 h-5"/> SQL Processing Results
                    </CardTitle>
                    <CardDescription>{sqlResult.summary}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-medium mb-2">Column Information</h4>
                    <div className="overflow-auto max-h-60">
                      <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground">
                          <tr>
                            <th className="p-2 text-left">Column</th>
                            <th className="p-2 text-left">Data Type</th>
                            <th className="p-2 text-right">Non-Null Values</th>
                            <th className="p-2 text-right">Unique Values</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sqlResult.columnInfo.map((col, idx) => (
                            <tr key={idx} className="border-b border-muted">
                              <td className="p-2 font-mono">{col.name}</td>
                              <td className="p-2">{col.dataType}</td>
                              <td className="p-2 text-right">{col.nonNullCount}</td>
                              <td className="p-2 text-right">{col.uniqueValueCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>                    {sqlResult.errorLog && sqlResult.errorLog.length > 0 && (
                      <>
                        {/* Display warnings separately from errors */}
                        {sqlResult.errorLog.some(err => err.startsWith('Warning:')) && (
                          <Alert variant="warning" className="mt-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700">
                            <AlertTitle className="text-amber-700 dark:text-amber-400">SQL Processing Warnings</AlertTitle>
                            <div className="max-h-40 overflow-y-auto">
                              <ul className="list-disc list-inside text-sm">
                                {sqlResult.errorLog
                                  .filter(err => err.startsWith('Warning:'))
                                  .map((warning, idx) => (
                                    <li key={idx} className="mb-1 text-amber-600 dark:text-amber-400">
                                      {warning.replace('Warning:', '')}
                                    </li>
                                  ))
                                }
                              </ul>
                            </div>
                          </Alert>
                        )}
                        
                        {/* Display actual errors */}
                        {sqlResult.errorLog.some(err => !err.startsWith('Warning:')) && (
                          <Alert variant="destructive" className="mt-4">
                            <AlertTitle>Processing Errors</AlertTitle>
                            <div className="max-h-40 overflow-y-auto">
                              <ul className="list-disc list-inside text-sm">
                                {sqlResult.errorLog
                                  .filter(err => !err.startsWith('Warning:'))
                                  .map((err, idx) => (
                                    <li key={idx} className="mb-1">
                                      {err.includes('Available columns:') ? (
                                        <>
                                          {err.split('Available columns:')[0]}
                                          <span className="font-semibold">Available columns: </span>
                                          <code className="bg-muted/80 px-1 rounded text-xs">
                                            {err.split('Available columns:')[1].split('.')[0].trim()}
                                          </code>
                                          {err.includes('For single column CSV') && (
                                            <div className="mt-1 ml-6 text-xs bg-background/80 p-1 rounded border border-muted">
                                              <span className="font-semibold">Hint:</span> {err.split('For single column CSV')[1]}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        err
                                      )}
                                    </li>
                                  ))
                                }
                              </ul>
                            </div>
                          </Alert>
                        )}
                      </>
                    )}{sqlResult.isSelectQuery && (
                      <div className="mt-4 border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Search className="h-4 w-4 text-primary" />
                            SELECT Query Results
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Showing filtered data without changing the original CSV
                          </p>
                        </div>
                        
                        {/* Data preview section */}
                        <div className="my-3 border rounded-md overflow-hidden">
                          <div className="bg-muted p-2 font-medium text-sm flex justify-between items-center">
                            <span>Data Preview</span>                            <span className="text-xs text-muted-foreground">
                              {(() => {
                                try {
                                  const parsed = Papa.parse(sqlResult.processedCsvData, { header: true });
                                  const totalRows = parsed.data.length;
                                  const displayRows = Math.min(5, totalRows);
                                  
                                  if (totalRows === 0) {
                                    return "No rows matched your query";
                                  } else if (totalRows <= 5) {
                                    return `Showing all ${totalRows} filtered rows`;
                                  } else {
                                    return `Showing ${displayRows} of ${totalRows} filtered rows`;
                                  }
                                } catch (e) {
                                  return 'Could not parse data';
                                }
                              })()}
                            </span>
                          </div>
                          <div className="p-2 bg-card overflow-auto max-h-40">
                            <div className="text-xs font-mono">
                              {(() => {
                                try {
                                  const parsed = Papa.parse(sqlResult.processedCsvData, { header: true });
                                  const rows = parsed.data.slice(0, 5);
                                  if (rows.length === 0) {
                                    return <p className="text-muted-foreground p-2 text-center">No rows matched your query</p>;
                                  }
                                  
                                  const headers = parsed.meta.fields || [];
                                  
                                  return (
                                    <table className="min-w-full">
                                      <thead>
                                        <tr className="border-b">
                                          {headers.map((header, i) => (
                                            <th key={i} className="p-1 text-left bg-muted">{header}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {rows.map((row, i) => (                                          <tr key={i} className={i % 2 ? "bg-muted/30" : ""}>
                                            {headers.map((header, j) => (
                                              <td key={j} className="p-1 truncate max-w-[200px]">{String((row as Record<string, any>)[header] || '')}</td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  );
                                } catch (e) {
                                  return <p className="text-muted-foreground p-2 text-center">Could not parse data preview</p>;
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                          <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              onClick={() => {
                                if (sqlResult.processedCsvData) {
                                  setCurrentCsvData(sqlResult.processedCsvData);
                                  setIsIterativeProcessing(true);
                                  toast({
                                    title: "Changes Applied",
                                    description: "Query results have been applied to the current data.",
                                    variant: "default",
                                    action: <CheckCircle className="h-5 w-5 text-green-500" />,
                                  });
                                }
                              }}
                              variant="outline"
                              size="sm"
                            >
                              <Save className="mr-2 h-4 w-4" />
                              Apply These Results to Current Data
                            </Button>
                            
                            <Button 
                              onClick={() => {
                                if (sqlResult.processedCsvData) {
                                  // Create a download link for the filtered data
                                  const blob = new Blob([sqlResult.processedCsvData], { type: 'text/csv;charset=utf-8' });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = originalFileName ? 
                                    `filtered_${originalFileName}` : 
                                    `filtered_data_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);
                                  
                                  toast({
                                    title: "Download Started",
                                    description: "Filtered data is being downloaded.",
                                    variant: "default",
                                  });
                                }
                              }}
                              variant="secondary"
                              size="sm"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download Filtered Results
                            </Button>
                          </div>
                          
                          <p className="text-xs text-muted-foreground">
                            You can apply these results to update your current data, download the filtered results, or continue working with the original dataset.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <h3 className="font-medium mb-2 flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /> Suggest CSV Cleaning Actions</h3>
                <Textarea
                  placeholder="Optional: Provide specific cleaning instructions. e.g., 'Standardize all dates in column Date to YYYY-MM-DD'. 'Remove rows where email is invalid'. 'For 0 entry in Item_Visibility write xx and for missing data write kk'"
                  value={cleaningInstructions}
                  onChange={(e) => setCleaningInstructions(e.target.value)}
                  rows={3}
                  disabled={isLoadingSuggestions || isProfiling || isApplyingChanges}
                  className="text-sm mb-2"
                />
                <p className="text-xs text-muted-foreground mb-3">
                  If instructions are provided, the AI will prioritize them. If blank, general suggestions based on common issues will be provided. All suggestions require your review.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button
                    onClick={handleSuggestCleaning}
                    disabled={isLoadingSuggestions || isProfiling || isApplyingChanges || (!currentCsvData && !originalDataForFlow)}
                    className="w-full sm:w-auto"
                  >
                    {isLoadingSuggestions ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Getting AI Suggestions...</>
                    ) : (
                      <><ListChecks className="mr-2 h-4 w-4" /> Get Cleaning Suggestions</>
                    )}
                  </Button>
                  <Button
                    onClick={handleProfileCsv}
                    disabled={isProfiling || isLoadingSuggestions || isApplyingChanges || !currentCsvData}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    {isProfiling ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Profiling Current CSV...</>
                    ) : (
                      <><BarChartHorizontalBig className="mr-2 h-4 w-4" /> Profile Current CSV</>
                    )}
                  </Button>
                </div>
                {suggestionsError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Suggestion Error</AlertTitle>
                    <AlertDescription>{suggestionsError}</AlertDescription>
                  </Alert>
                )}
                {profileError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Profiling Error</AlertTitle>
                    <AlertDescription>{profileError}</AlertDescription>
                  </Alert>
                )}
              </div>

              {(suggestionsResult && (userInstructionSuggestions.length > 0 || generalSuggestions.length > 0)) && (
                <Card className="mt-4 border-t pt-4 bg-secondary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-5 h-5"/>Review Cleaning Suggestions</CardTitle>
                    {suggestionsResult.overallSummary && <CardDescription>{suggestionsResult.overallSummary}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    {renderSuggestions(
                      userInstructionSuggestions,
                      'user',
                      'Suggestions Based on Your Instructions',
                      <UserCog className="w-5 h-5 text-primary" />
                    )}

                    {renderSuggestions(
                      generalSuggestions,
                      'general',
                      'General AI Suggestions',
                      <Bot className="w-5 h-5 text-accent" />
                    )}

                    {userInstructionSuggestions.length === 0 && generalSuggestions.length === 0 && !cleaningInstructions.trim() && (
                      <p className="text-sm text-muted-foreground text-center py-4">No suggestions generated. Try providing specific instructions or ensure data has identifiable issues.</p>
                    )}
                  </CardContent>
                  {totalApprovedCount > 0 && (
                    <CardFooter className="border-t pt-4 mt-4">
                      <Button
                        onClick={handleApplyApprovedChanges}
                        disabled={isApplyingChanges}
                        className="w-full sm:w-auto"
                      >
                        {isApplyingChanges ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Applying {totalApprovedCount} Changes...</>
                        ) : (
                          `Apply ${totalApprovedCount} Approved Change(s)`
                        )}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              )}

              {applyChangesError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Critical Application Error</AlertTitle>
                  <AlertDescription>{applyChangesError}</AlertDescription>
                </Alert>
              )}

              {finalCleanedResult && (
                <div className="mt-6 space-y-4 p-4 border rounded-md bg-green-50 dark:bg-green-900/30">
                  <h3 className="font-medium text-lg flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="w-6 h-6"/>Cleaning Round Complete
                  </h3>
                  <Card className="bg-card">
                    <CardHeader className="pb-2"> <CardTitle className="text-base">Summary of Applied Changes</CardTitle> </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{applySummary || finalCleanedResult.summary}</p>
                      {finalCleanedResult.errors && finalCleanedResult.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-semibold text-destructive">Errors during application:</p>
                          <ul className="list-disc list-inside text-xs text-destructive/80">
                            {finalCleanedResult.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                          </ul>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-3">The data has been updated if changes were successful. You can download it, get new suggestions, or profile the cleaned version.</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}

          {profileResult && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChartHorizontalBig className="w-5 h-5 text-primary"/>CSV Data Profile ({isIterativeProcessing ? 'Processed Data' : 'Original Data'})</CardTitle>
                <CardDescription>{profileResult.overallSummary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div><strong>Total Records Analyzed:</strong> {profileResult.recordCount}</div>
                  <div><strong>Total Fields Found:</strong> {profileResult.fieldCount}</div>
                </div>
                {profileResult.fields.length === 0 ? (
                  <p className="text-sm text-center py-4 text-muted-foreground">No specific field profiles generated.</p>
                ) : (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2 text-md">
                      <Table className="w-4 h-4"/>
                      Field-Level Analysis:
                    </h4>
                    <ScrollArea className="h-96">
                      {profileResult.fields.map((field, index) => (
                        <Card key={index} className="bg-card border rounded-lg overflow-hidden shadow-sm mb-3">
                          <CardHeader className="p-3 bg-secondary/50">
                            <p className="font-semibold text-sm">
                              Field: <code className="bg-muted px-1 py-0.5 rounded">{field.fieldName}</code>
                            </p>
                          </CardHeader>
                          <CardContent className="p-3 text-sm space-y-1.5">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              <p><strong>Inferred Type:</strong> {field.inferredType}</p>
                              <p><strong>Missing:</strong> {field.missingValues} ({field.missingPercentage.toFixed(1)}%)</p>
                              <p><strong>Unique Values:</strong> {field.uniqueValues}</p>
                              {field.stats && (
                                <>
                                  {field.stats.min !== undefined && <p><strong>Min:</strong> {field.stats.min}</p>}
                                  {field.stats.max !== undefined && <p><strong>Max:</strong> {field.stats.max}</p>}
                                  {field.stats.mean !== undefined && <p><strong>Mean:</strong> {field.stats.mean.toFixed(2)}</p>}
                                  {field.stats.median !== undefined && <p><strong>Median:</strong> {field.stats.median}</p>}
                                  {field.stats.stddev !== undefined && <p><strong>Std Dev:</strong> {field.stats.stddev.toFixed(2)}</p>}
                                </>
                              )}
                            </div>
                            {field.valueDistribution && field.valueDistribution.length > 0 && (
                              <div className="mt-2">
                                <strong>Value Distribution (Top {Math.min(5, field.valueDistribution.length)}):</strong>
                                <ul className="list-disc pl-5 mt-1 text-xs text-muted-foreground">
                                  {field.valueDistribution
                                    .sort((a, b) => b.count - a.count)
                                    .slice(0, 5)
                                    .map((item) => (
                                      <li key={item.value} className="truncate" title={item.value}>{item.value}: {item.count}</li>
                                    ))}
                                  {field.valueDistribution.length > 5 && <li>... and {field.valueDistribution.length - 5} more</li>}
                                </ul>
                              </div>
                            )}
                            {field.commonFormats && field.commonFormats.length > 0 && (
                              <p className="mt-1"><strong>Common Formats:</strong> <span className="text-xs">{field.commonFormats.join(', ')}</span></p>
                            )}
                            {field.potentialIssues && field.potentialIssues.length > 0 && (
                              <div className="mt-2">
                                <strong className="text-destructive/90">Potential Issues:</strong>
                                <ul className="list-disc pl-5 mt-1 text-xs text-destructive/80">
                                  {field.potentialIssues.map((issue, i) => ( <li key={i}>{issue}</li> ))}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </ScrollArea>
                  </div>
                )}
                {profileResult.generalObservations && profileResult.generalObservations.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium flex items-center gap-2 mb-2 text-md">
                      <FileText className="w-4 h-4"/> General Dataset Observations:
                    </h4>
                    <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                      {profileResult.generalObservations.map((obs, i) => ( <li key= {i}>{obs}</li> ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

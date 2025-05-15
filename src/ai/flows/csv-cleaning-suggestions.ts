'use server';
/**
 * @fileOverview CSV Data Cleaning Suggestions AI agent.
 *
 * - suggestCsvCleaningActions - A function that analyzes CSV data and suggests cleaning actions.
 * - SuggestCsvCleaningActionsInput - The input type for the suggestCsvCleaningActions function.
 * - SuggestCsvCleaningActionsOutput - The return type for the suggestCsvCleaningActions function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { CleaningSuggestionSchema, type CleaningSuggestion } from './schemas/csv-schemas';

export type { CleaningSuggestion };

const SuggestCsvCleaningActionsInputSchema = z.object({
  csvData: z.string().describe('The CSV data as a string (preferably a sample for large datasets).'),
  cleaningInstructions: z
    .string()
    .optional()
    .describe('Specific instructions from the user for cleaning the data (e.g., "Standardize date formats to YYYY-MM-DD in the \'Date\' column", "Remove rows with missing values in the \'Email\' column", "Replace 0 values in the \'Quantity\' column with \'Not Specified\'"). The LLM should prioritize these.'),
  modelId: z.string().optional().describe('The model ID to use for this operation.'),
  previouslyAppliedSuggestionIds: z.array(z.string()).optional().describe('IDs of suggestions that have already been applied in iterative mode'),
});
export type SuggestCsvCleaningActionsInput = z.infer<typeof SuggestCsvCleaningActionsInputSchema>;

const SuggestCsvCleaningActionsOutputSchema = z.object({
  suggestions: z.array(CleaningSuggestionSchema).describe('A list of detailed cleaning suggestions for user review.'),
  overallSummary: z.string().describe('A high-level summary of the types of issues found and suggestions made.'),
});
export type SuggestCsvCleaningActionsOutput = z.infer<typeof SuggestCsvCleaningActionsOutputSchema>;

export async function suggestCsvCleaningActions(input: SuggestCsvCleaningActionsInput): Promise<SuggestCsvCleaningActionsOutput> {
  return suggestCsvCleaningActionsFlow(input);
}

const suggestCsvCleaningActionsPrompt = ai.definePrompt({
  name: 'suggestCsvCleaningActionsPrompt',
  input: { schema: SuggestCsvCleaningActionsInputSchema },
  output: { schema: SuggestCsvCleaningActionsOutputSchema },
  prompt: `You are an expert data cleaning specialist. Your task is to analyze the provided CSV data and suggest specific, actionable, and non-redundant cleaning actions.
Provide a confidence score (0.0-1.0) and a priority (low, medium, high) for each suggestion.

**CRITICAL INSTRUCTIONS:**
1.  **CONSOLIDATION:** For any issue type that affects multiple rows within the *same column* (e.g., missing values, format standardization, common typo patterns, inconsistent casing), generate **ONLY ONE SINGLE SUGGESTION** for that combination of column and issue type.
    *   For these consolidated, column-wide suggestions, **OMIT** the 'rowNumber' field.
    *   'originalFragment' should be a descriptive summary (e.g., "Missing values in '[columnName]'", "Varied date formats in '[columnName]'", "Inconsistent casing like 'active', 'Active' in '[columnName]'").
    *   'columnName' **MUST** be specified for these column-wide suggestions.
    *   Estimate 'affectedRows' based on the CSV sample.
2.  **SPECIFICITY:** For unique, isolated typos or anomalies affecting only a single row, include the specific 'rowNumber' (1-indexed). 'affectedRows' should be 1. 'columnName' **MUST** be specified.
3.  **COLUMN NAME REQUIREMENT:** The 'columnName' field is **REQUIRED** for ALL action types **EXCEPT** 'REMOVE_ROW' actions that remove the entire row based on a non-column-specific condition (which is rare). If an action targets a column, even 'REMOVE_ROW' based on a column value, specify the 'columnName'.
4.  **USER INSTRUCTIONS:** Strictly prioritize and follow any 'cleaningInstructions' provided by the user.
    *   Generate suggestions ONLY for what the user asked.
    *   Set the 'source' field to 'user_instruction'.
    *   Generate a 'userInstructionId' for each distinct user directive (e.g., 'user_instr_1').
    *   Follow the **CONSOLIDATION** rule for general user instructions (e.g., "standardize all 'Date' columns", "fill missing 'Notes'"). Omit 'rowNumber', summarize in 'originalFragment', estimate 'affectedRows'.
    *   For specific cell user instructions (e.g., "change row 5, column 'ID' to 'X'"), include 'rowNumber' and set 'affectedRows' to 1.
    *   Do **NOT** generate 'general_suggestion' types that duplicate or contradict user instructions.

Input CSV Data (sample or full):
\`\`\`csv
{{{csvData}}}
\`\`\`

{{#if cleaningInstructions}}
Specific Cleaning Instructions from User (Prioritize these strictly):
"{{{cleaningInstructions}}}"
{{/if}}

General Cleaning Focus (Generate ONLY if no user instructions cover the area, set 'source' to 'general_suggestion', follow CONSOLIDATION rule):
- **Missing Values:**
  - Non-numeric columns: ONE 'FILL_MISSING' per column. 'columnName' REQUIRED. Omit 'rowNumber'. 'originalFragment': "Missing values in '[columnName]'". 'suggestedFragment': placeholder like 'UNKNOWN' or 'N/A'. Estimate 'affectedRows'.
  - Numeric columns: ONE 'FILL_MISSING_NUMERIC' per column. 'columnName' REQUIRED. Omit 'rowNumber'. 'originalFragment': "Missing numeric values in '[columnName]'". 'suggestedFragment' MUST be 'CALCULATE'. Set 'imputationMethod' if confidence is high, otherwise leave for user. Estimate 'affectedRows'.
- **Data Entry Errors & Typos:** Suggest 'MODIFY_CELL'.
  - Consolidate common patterns (e.g., "Untied States" -> "United States") into ONE suggestion per pattern per column. 'columnName' REQUIRED. Omit 'rowNumber', describe pattern in 'originalFragment', provide correction in 'suggestedFragment', estimate 'affectedRows'.
  - For isolated typos: include 'rowNumber', 'columnName' REQUIRED. 'originalFragment' is typo, 'suggestedFragment' is correction, 'affectedRows' is 1.
- **Format Standardization (dates, numbers, casing, units):** ONE 'STANDARDIZE_FORMAT' per column needing it. 'columnName' REQUIRED. Omit 'rowNumber'. 'originalFragment' describes inconsistency (e.g., "Varied date formats", "Mixed casing"). 'suggestedFragment' is target standard (e.g., "YYYY-MM-DD", "Title Case"). Estimate 'affectedRows'.
- **Data Type Consistency:** ONE 'REVIEW_CONSISTENCY' or 'STANDARDIZE_FORMAT' per column with mixed types. 'columnName' REQUIRED. Omit 'rowNumber'. 'suggestedFragment' is the dominant/target type or a conversion instruction. Estimate 'affectedRows'.
- **Duplicate Rows:** Suggest 'REMOVE_ROW'. Specify 'rowNumber'(s) of duplicates to remove (keeping one). 'originalFragment' can be "Duplicate of row X".
- **Outliers/Anomalous Values (Requiring Judgment):** Suggest 'REVIEW_CONSISTENCY'.
   - Consolidate if a pattern exists (e.g., negative values in 'Age' column). Omit 'rowNumber', describe pattern in 'originalFragment'. 'columnName' REQUIRED.
   - Can be row-specific if isolated (include 'rowNumber'). 'columnName' REQUIRED.
   - 'suggestedFragment' MUST be a reasonable default/common value found in the column, OR 'Needs Manual Review' if no clear default exists. 'rationale' should explain why review is needed. Estimate 'affectedRows'.

Output Structure:
Provide a JSON object adhering strictly to the schema: { "suggestions": [ { id, userInstructionId?, description, rowNumber?, columnName?, originalFragment, suggestedFragment, actionType, imputationMethod?, rationale?, source, confidence?, priority?, affectedRows?, userProvidedReplacement? } ], "overallSummary": "..." }.
- **Ensure** 'columnName' is present for MODIFY_CELL, STANDARDIZE_FORMAT, FILL_MISSING, FILL_MISSING_NUMERIC, REVIEW_CONSISTENCY.
- **Omit** 'userProvidedReplacement' field entirely in your output.
- Double-check the **CONSOLIDATION RULE** was followed. ONE suggestion per issue type per column unless truly row-specific.
- Provide a concise 'overallSummary'.
\`\`\``,
});

const suggestCsvCleaningActionsFlow = ai.defineFlow(
  {
    name: 'suggestCsvCleaningActionsFlow',
    inputSchema: SuggestCsvCleaningActionsInputSchema,
    outputSchema: SuggestCsvCleaningActionsOutputSchema,
  },
  async (input) => {
    const { output } = await suggestCsvCleaningActionsPrompt(input);
    if (!output) {
      throw new Error('LLM did not return an output for CSV cleaning suggestions.');
    }

    // --- De-duplication and Consolidation Logic ---
    const suggestionMap = new Map<string, CleaningSuggestion>();
    let suggestionCounter = 0;

    // Create a Set of previously applied suggestion IDs for fast lookup
    const previouslyAppliedIds = new Set(input.previouslyAppliedSuggestionIds || []);

    // First, let's ensure all suggestions have the required fields
    const validatedSuggestions = (output.suggestions || [])
      .filter(s => {
        // Verify all required fields exist
        if (!s.originalFragment) {
          console.warn(`Skipping suggestion with missing originalFragment: ${s.id || 'unknown ID'}`);
          return false;
        }
        if (!s.suggestedFragment) {
          console.warn(`Skipping suggestion with missing suggestedFragment: ${s.id || 'unknown ID'}`);
          return false;
        }
        if (!s.actionType) {
          console.warn(`Skipping suggestion with missing actionType: ${s.id || 'unknown ID'}`);
          return false;
        }
        if (!s.description) {
          console.warn(`Skipping suggestion with missing description: ${s.id || 'unknown ID'}`);
          return false;
        }
        
        // Validate the column name requirement based on action type
        const requiresColumnName = ['MODIFY_CELL', 'STANDARDIZE_FORMAT', 'FILL_MISSING', 'FILL_MISSING_NUMERIC', 'REVIEW_CONSISTENCY'].includes(s.actionType);
        if (requiresColumnName && !s.columnName) {
          console.warn(`Skipping suggestion ID (from LLM) ${s.id || 'unknown ID'} due to missing columnName for actionType ${s.actionType}.`);
          return false;
        }
        
        return true;
      })
      .map(s => ({
        ...s,
        columnName: s.columnName ? s.columnName.trim() : undefined,
        source: s.source || (input.cleaningInstructions?.trim() ? 'user_instruction' : 'general_suggestion'),
        // Ensure these fields are never undefined/null
        description: s.description || 'No description provided',
        originalFragment: s.originalFragment || 'N/A', // Set a fallback, but should be filtered out above
        suggestedFragment: s.suggestedFragment || 'N/A', // Set a fallback, but should be filtered out above
      }));

    // Now proceed with the normalization and consolidation
    validatedSuggestions.forEach((s) => {
      let suggestionKey: string;

      // Create a consistent key for grouping/de-duplication
      if (s.source === 'user_instruction' && s.userInstructionId) {
        // Group user instructions by their ID, column (if applicable), and action
        const columnKey = s.columnName ? s.columnName.toLowerCase() : 'GLOBAL';
        suggestionKey = `USER-${s.userInstructionId}-${columnKey}-${s.actionType}`;
      } else if (s.rowNumber === undefined && s.columnName) {
        // Group column-wide general suggestions by column and action type
        // Add originalFragment pattern for more specific grouping (e.g., different typos)
        const columnKey = s.columnName.toLowerCase();
        const patternKey = ['STANDARDIZE_FORMAT', 'FILL_MISSING', 'FILL_MISSING_NUMERIC'].includes(s.actionType)
          ? ''
          : `-${s.originalFragment?.substring(0, 20).toLowerCase().replace(/\s+/g, '_')}`; // Sanitize fragment and normalize case
        suggestionKey = `GEN-COL-${columnKey}-${s.actionType}${patternKey}`;
      } else if (s.rowNumber !== undefined && s.columnName) {
        // Key for row-specific suggestions (less likely to be duplicates unless LLM error)
        const columnKey = s.columnName.toLowerCase();
        suggestionKey = `ROW-${s.rowNumber}-${columnKey}-${s.actionType}-${s.originalFragment?.substring(0, 10).toLowerCase().replace(/\s+/g, '_')}`;
      } else if (s.actionType === 'REMOVE_ROW' && s.rowNumber !== undefined) {
        // Key for specific row removal
        suggestionKey = `REMOVE-ROW-${s.rowNumber}`;
      } else {
        // Fallback key for other cases or potential global actions
        suggestionCounter++;
        suggestionKey = `OTHER-${s.actionType}-${s.description?.substring(0, 20).toLowerCase().replace(/\s+/g, '_')}-${suggestionCounter}`;
      }


      // If a suggestion with this key doesn't exist, or if the new one is higher priority (user > general), add/replace it.
      const existing = suggestionMap.get(suggestionKey);
      if (!existing || (s.source === 'user_instruction' && existing.source === 'general_suggestion')) {
         // Ensure unique ID
         const newId = `suggestion-${suggestionMap.size + 1}-${Date.now()}`;

         // Validate and clean the suggestion before adding
         const cleanedSuggestion: CleaningSuggestion = {
             ...s,
             id: newId,
             source: s.source || (input.cleaningInstructions?.trim() ? 'user_instruction' : 'general_suggestion'),
             confidence: s.confidence !== undefined && s.confidence !== null ? s.confidence : 0.75,
             priority: s.priority || (s.source === 'user_instruction' ? 'high' : 'medium'),
             rowNumber: (s.rowNumber === null || s.rowNumber === 0 || s.rowNumber === undefined) ? undefined : s.rowNumber, // Standardize missing rowNumber
             // Keep original case for columnName but ensure it's trimmed
             columnName: s.columnName ? s.columnName.trim() : undefined, 
             userInstructionId: s.userInstructionId || undefined,
             affectedRows: (s.affectedRows === null || s.affectedRows === 0 || s.affectedRows === undefined) ? undefined : s.affectedRows,
             imputationMethod: s.actionType === 'FILL_MISSING_NUMERIC' ? s.imputationMethod : undefined, // Only set if relevant
             userProvidedReplacement: undefined, // Ensure this is NEVER set by LLM
             // Ensure required fields have fallbacks if LLM misses them (though the prompt is strict now)
             description: s.description || "No description provided",
             originalFragment: s.originalFragment || "N/A",
             suggestedFragment: s.suggestedFragment || "N/A",
             actionType: s.actionType || 'OTHER', // Fallback actionType
         };         // Final check with Zod schema (optional but good practice)
         try {
            CleaningSuggestionSchema.parse(cleanedSuggestion);
            suggestionMap.set(suggestionKey, cleanedSuggestion);
         } catch (error: unknown) {
             // Handle Zod error with proper type checking
             const zodError = error instanceof Error ? error : new Error(String(error));
             console.warn(`Skipping suggestion due to schema validation failure. Key: ${suggestionKey}, Error: ${zodError.message}`);
             console.warn("Problematic suggestion data:", JSON.stringify(cleanedSuggestion, null, 2));
         }

      } else {
         console.warn(`Skipping duplicate/lower priority suggestion for key: ${suggestionKey}. Original: ${existing.description}, New: ${s.description}`);
      }
    });

    let processedSuggestions = Array.from(suggestionMap.values());

    // Optional: Further filtering of general suggestions if a user instruction clearly covers the same column/action
     if (input.cleaningInstructions && input.cleaningInstructions.trim() !== '') {
       const userSuggestions = processedSuggestions.filter(s => s.source === 'user_instruction');
       const generalSuggestions = processedSuggestions.filter(s => s.source === 'general_suggestion');
       const userCoveredContext = new Set<string>();

       userSuggestions.forEach(us => {
         if (us.columnName) {
           // Mark column + actionType as covered (using lowercase column name for consistency)
           const columnKey = us.columnName.toLowerCase();
           userCoveredContext.add(`${columnKey}-${us.actionType}`);
           // Broaden coverage: fill covers both numeric/general, modify might cover standardization
           if (us.actionType === "FILL_MISSING" || us.actionType === "FILL_MISSING_NUMERIC") {
             userCoveredContext.add(`${columnKey}-FILL_MISSING`);
             userCoveredContext.add(`${columnKey}-FILL_MISSING_NUMERIC`);
           }
           if (us.actionType === "MODIFY_CELL" || us.actionType === "STANDARDIZE_FORMAT") {
             userCoveredContext.add(`${columnKey}-MODIFY_CELL`);
             userCoveredContext.add(`${columnKey}-STANDARDIZE_FORMAT`);
           }
         }
       });

       const finalGeneralSuggestions = generalSuggestions.filter(gs => {
         if (gs.columnName && userCoveredContext.has(`${gs.columnName.toLowerCase()}-${gs.actionType}`)) {
           console.log(`Filtered redundant general suggestion (covered by user instruction): ${gs.description} (ID: ${gs.id})`);
           return false;
         }
         return true;
       });

       processedSuggestions = [...userSuggestions, ...finalGeneralSuggestions];
     }
     
     // Filter out suggestions for already addressed issues
     if (previouslyAppliedIds.size > 0) {
       // We'll use fingerprinting to identify suggestions that address the same issue
       // even if they have different IDs (from different generations)
       const appliedSuggestionFingerprints = new Set<string>();
       
       // Generate fingerprints from previously applied suggestions
       input.previouslyAppliedSuggestionIds?.forEach(prevId => {
         // We don't have the full object of previously applied suggestions, just IDs
         // But we can construct a fingerprint from the ID pattern if using our ID format
         const idParts = prevId.split('-');
         if (idParts.length >= 2) {
           // Create a basic fingerprint from the ID parts if possible
           appliedSuggestionFingerprints.add(idParts[0]);
         }
       });
       
       // Filter suggestions based on semantic similarity
       processedSuggestions = processedSuggestions.filter(suggestion => {
         // Always include user instructions in iterative mode
         if (suggestion.source === 'user_instruction') return true;
         
         // Generate a fingerprint for this suggestion based on its properties
         const fingerprint = `${suggestion.actionType}-${suggestion.columnName?.toLowerCase() || ''}-${
           suggestion.rowNumber || 'col'}-${suggestion.originalFragment?.substring(0, 20).toLowerCase().replace(/\s+/g, '_')}`;
         
         // Check if we have a similar suggestion already applied
         // This is a simplification - in a real implementation you might want more sophisticated matching
         for (const appliedFingerprint of appliedSuggestionFingerprints) {
           // If there's significant overlap in the fingerprint, consider it already addressed
           if (fingerprint.includes(appliedFingerprint) || appliedFingerprint.includes(fingerprint)) {
             console.log(`Filtering out suggestion that appears to be already addressed: ${suggestion.description}`);
             return false;
           }
         }
         
         // For simple cases, check if the exact suggestion ID was in the applied list
         if (previouslyAppliedIds.has(suggestion.id)) {
           console.log(`Filtering out previously applied suggestion: ${suggestion.id}`);
           return false;
         }
         
         return true;
       });
       
       console.log(`After filtering previously applied suggestions: ${processedSuggestions.length} suggestions remaining`);
     }

    // Final safety check - ensure no suggestion is missing required fields
    const validFinalSuggestions = processedSuggestions.filter(suggestion => {
      try {
        CleaningSuggestionSchema.parse(suggestion);
        return true;
      } catch (err) {
        console.error(`Removing invalid suggestion from final output: ${suggestion.id}`, err);
        return false;
      }
    });

    return { 
      ...output, 
      suggestions: validFinalSuggestions,
      overallSummary: validFinalSuggestions.length === 0 
        ? "No valid cleaning suggestions could be generated. Please try with more specific instructions or different CSV data."
        : output.overallSummary
    };
  }
);

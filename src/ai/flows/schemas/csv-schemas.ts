import { z } from 'genkit';

export const CleaningSuggestionSchema = z.object({
  id: z.string().describe('A unique identifier for this suggestion (e.g., a hash of relevant fields or a UUID).'),
  userInstructionId: z.string().optional().describe('An identifier linking this suggestion to a specific user instruction, if applicable. Helps in grouping and prioritizing.'),
  description: z.string().describe('A human-readable description of the cleaning action suggested. e.g., "Standardize date format in \'Signup Date\' column", "Remove row with missing email", "Correct typo in city name". Be very specific about what is being changed and why.'),
  rowNumber: z.number().optional().describe('The specific row number (1-indexed, excluding header) where the change is suggested. OMIT for column-wide suggestions or if not applicable. Must be a positive integer if provided.'),
  columnName: z.string().optional().describe('The name of the column where the change is suggested. Required for cell or column-wide operations unless it\'s a full row removal without column context.'),
  originalFragment: z.string().describe('The original data fragment (e.g., cell value, representation of a row part, or a summary like "missing values in [column]" or "0 values in [column]") that is identified for cleaning.'),
  suggestedFragment: z.string().describe('The suggested cleaned version of the data fragment, or a placeholder like "CALCULATE" if programmatic calculation is needed (e.g., for numeric imputation), or a suggested standard value for REVIEW_CONSISTENCY.'),
  actionType: z.enum(['MODIFY_CELL', 'REMOVE_ROW', 'STANDARDIZE_FORMAT', 'FILL_MISSING', 'FILL_MISSING_NUMERIC', 'REVIEW_CONSISTENCY', 'OTHER'])
    .describe('The type of cleaning action proposed. "FILL_MISSING_NUMERIC" for numeric columns where mean/median/mode can be applied. "REVIEW_CONSISTENCY" for broader issues requiring human judgment (provide a suggestedFragment as a default). "STANDARDIZE_FORMAT" for format changes like dates or casing.'),
  imputationMethod: z.enum(['mean', 'median', 'mode']).optional().describe('Specifies the method for numeric imputation if actionType is FILL_MISSING_NUMERIC and suggestedFragment is "CALCULATE".'),
  userProvidedReplacement: z.string().optional().describe('Value provided by the user to replace the original fragment, especially for REVIEW_CONSISTENCY actions.'), // Added field
  rationale: z.string().optional().describe('Why this change is suggested (e.g., "Standardizing to YYYY-MM-DD for consistency", "Email is missing, row may be incomplete", "User instruction to replace 0s.").'),
  source: z.enum(['user_instruction', 'general_suggestion']).describe('Indicates if the suggestion originated from a user instruction or general AI analysis.'),
  confidence: z.number().optional().describe('LLM confidence score for this suggestion (expected range 0.0 to 1.0). Higher means more confident.'),
  priority: z.enum(['low', 'medium', 'high']).optional().describe('Suggested priority for addressing this issue. User instructions are typically high priority.'),
  affectedRows: z.number().optional().describe('For column-wide operations, an estimated count of rows that would be affected by this suggestion (should be a positive integer if provided). Omit for single-row operations.')
}).refine(data => {
  // If actionType requires a columnName (e.g. not REMOVE_ROW that might not specify one), then columnName must be present.
  if (!['REMOVE_ROW', 'OTHER'].includes(data.actionType) && !data.columnName) {
      // REVIEW_CONSISTENCY might operate on a row level without a specific column, though usually it has one. Adjust if needed.
    return false;
  }
  // Basic validation: if rowNumber is present, it should be > 0
  if (data.rowNumber !== undefined && data.rowNumber <= 0) {
    return false;
  }
  // Basic validation: if affectedRows is present, it should be > 0
  if (data.affectedRows !== undefined && data.affectedRows <= 0) {
    return false;
  }
  return true;
}, {
  message: "ColumnName is required for most action types. RowNumber and AffectedRows must be positive integers if provided.",
});

// Export the TypeScript type from the schema
export type CleaningSuggestion = z.infer<typeof CleaningSuggestionSchema>;

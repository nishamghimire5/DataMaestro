
'use server';
/**
 * @fileOverview Data Profiling AI agent.
 *
 * - profileData - A function that analyzes data and generates a profile.
 * - ProfileDataInput - The input type for the profileData function.
 * - ProfileDataOutput - The return type for the profileData function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

// Define input schema
const ProfileDataInputSchema = z.object({
  data: z.string().describe('The data to be profiled, as a JSON string or CSV string.'),
  format: z.enum(['json', 'csv']).describe('The format of the input data.'),
  sampleSize: z.number().optional().describe('Optional: Number of records to sample for profiling (if data is large).'),
});
export type ProfileDataInput = z.infer<typeof ProfileDataInputSchema>;

// Define output schema components
const FieldStatsSchema = z.object({
    min: z.number().optional().describe('Minimum numeric value.'),
    max: z.number().optional().describe('Maximum numeric value.'),
    mean: z.number().optional().describe('Mean average of numeric values.'),
    median: z.number().optional().describe('Median of numeric values.'),
    stddev: z.number().optional().describe('Standard deviation of numeric values.'),
}).optional();

// Updated ValueDistribution schema
const ValueDistributionItemSchema = z.object({
  value: z.string().describe('The distinct value found.'),
  count: z.number().describe('The frequency count of this value.'),
});

const FieldProfileSchema = z.object({
  fieldName: z.string().describe('The name of the data field.'),
  inferredType: z.string().describe('The inferred data type (e.g., string, number, date, boolean, categorical).'),
  missingValues: z.number().describe('Count of missing or null values.'),
  missingPercentage: z.number().describe('Percentage of missing values.'),
  uniqueValues: z.number().describe('Count of distinct unique values.'),
  // Use the updated array-based schema for valueDistribution
  valueDistribution: z.array(ValueDistributionItemSchema).optional().describe('Frequency distribution of the top N most common values as an array of objects (e.g., [{"value": "valueA", "count": 10}, {"value": "valueB", "count": 5}]). Provided for categorical or low-cardinality fields.'),
  commonFormats: z.array(z.string()).optional().describe('Examples of common data formats found (especially for dates or complex strings).'),
  potentialIssues: z.array(z.string()).optional().describe('List of potential data quality issues identified (e.g., outliers, mixed formats, unexpected values).'),
  stats: FieldStatsSchema.describe('Basic statistical measures if the field is numeric.'),
});

const ProfileDataOutputSchema = z.object({
  recordCount: z.number().describe('Total number of records analyzed.'),
  fieldCount: z.number().describe('Total number of fields (columns) detected.'),
  overallSummary: z.string().describe('A high-level summary of the dataset\'s characteristics and quality.'),
  fields: z.array(FieldProfileSchema).describe('Detailed profile for each identified field.'),
  generalObservations: z.array(z.string()).optional().describe('General observations about the dataset as a whole (e.g., potential duplication, relationships between fields).'),
});
export type ProfileDataOutput = z.infer<typeof ProfileDataOutputSchema>;


// Define the exported function
export async function profileData(input: ProfileDataInput): Promise<ProfileDataOutput> {
  // In a real scenario, you might add pre-processing here:
  // - Handle sampling if sampleSize is provided and data is large.
  // - Potentially parse CSV/JSON more robustly before sending to LLM,
  //   although the LLM might handle raw strings well.
  return profileDataFlow(input);
}


// Define the prompt
const profileDataPrompt = ai.definePrompt({
    name: 'profileDataPrompt',
    input: { schema: ProfileDataInputSchema },
    output: { schema: ProfileDataOutputSchema },
    prompt: `You are a highly skilled data analyst tasked with profiling a dataset. Analyze the provided data ({ {format} } format) and generate a comprehensive profile according to the output schema.

Data Sample (or full data if small):
\`\`\`{{format}}
{{{data}}}
\`\`\`
{{#if sampleSize}}
(Note: This profile might be based on a sample of { {sampleSize} } records.)
{{/if}}

Instructions:
1.  Determine the total number of records and fields.
2.  For each field:
    *   Infer the most likely data type (string, integer, float, date, boolean, categorical, etc.).
    *   Calculate the count and percentage of missing values.
    *   Calculate the number of unique values.
    *   If the field seems categorical or has low cardinality (e.g., less than 20 unique values), provide a value distribution of the top 5-10 most frequent values. Format this as an array of objects, where each object has a 'value' (string) and 'count' (number) property. Example: [{"value": "valueA", "count": 10}, {"value": "valueB", "count": 5}].
    *   If the field is numeric, calculate basic statistics (min, max, mean, median, standard deviation).
    *   Identify any common patterns or formats, especially for dates or complex strings.
    *   List potential data quality issues like outliers, mixed data types within the column, inconsistent formatting, leading/trailing spaces, or unusual values.
3.  Provide an overall summary of the dataset's structure, completeness, and potential quality concerns.
4.  Include any general observations about the dataset, such as potential duplicate records or interesting relationships between fields.

Ensure the output strictly adheres to the JSON schema provided. Focus on providing accurate counts, percentages, and insightful observations.
`,
});


// Define the flow
const profileDataFlow = ai.defineFlow<
  typeof ProfileDataInputSchema,
  typeof ProfileDataOutputSchema
>({
  name: 'profileDataFlow',
  inputSchema: ProfileDataInputSchema,
  outputSchema: ProfileDataOutputSchema,
},
async (input) => {
  // The LLM does the heavy lifting based on the prompt.
  // For very large datasets, pre-processing (sampling, initial parsing)
  // might be done here before calling the prompt.
  const { output } = await profileDataPrompt(input);

   // Basic validation (optional post-processing)
  if (!output) {
     throw new Error("Flow did not return an output.");
   }
   if (output.fieldCount !== output.fields.length) {
     console.warn("Field count mismatch between summary and detailed profiles.");
     // Decide how to handle: trust fields array length? Log warning?
     output.fieldCount = output.fields.length; // Correct the count
   }


  return output;
});


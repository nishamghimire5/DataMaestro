// src/ai/flows/data-standardization.ts
'use server';

/**
 * @fileOverview Data Standardization flow using LLMs to standardize data formats.
 *
 * This file defines a Genkit flow for standardizing data formats (e.g., date and address formats)
 * across the CDP using an LLM. It includes functions for data standardization and
 * corresponding input and output type definitions.
 *
 * @exports standardizeData - A function that standardizes data formats.
 * @exports StandardizeDataInput - The input type for the standardizeData function.
 * @exports StandardizeDataOutput - The return type for the standardizeData function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Define the input schema for data standardization
const StandardizeDataInputSchema = z.object({
  fieldName: z.string().describe('The name of the field to standardize.'),
  fieldValue: z.string().describe('The current value of the field.'),
  fieldType: z.enum(['date', 'address', 'text']).describe('The data type of the field.'),
  formatHint: z.string().optional().describe('Optional hint for the desired format (e.g., MM/DD/YYYY for dates).'),
});

export type StandardizeDataInput = z.infer<typeof StandardizeDataInputSchema>;

// Define the output schema for data standardization
const StandardizeDataOutputSchema = z.object({
  standardizedValue: z.string().describe('The standardized value of the field.'),
  explanation: z
    .string() // Make explanation non-nullable
    .optional()
    .describe('Explanation of the standardization process.'),
});

export type StandardizeDataOutput = z.infer<typeof StandardizeDataOutputSchema>;

export async function standardizeData(input: StandardizeDataInput): Promise<StandardizeDataOutput> {
  return standardizeDataFlow(input);
}

// Define the prompt for data standardization
const standardizeDataPrompt = ai.definePrompt({
  name: 'standardizeDataPrompt',
  input: {
    schema: z.object({
      fieldName: z.string().describe('The name of the field to standardize.'),
      fieldValue: z.string().describe('The current value of the field.'),
      fieldType: z.enum(['date', 'address', 'text']).describe('The data type of the field.'),
      formatHint: z
        .string()
        .optional()
        .describe('Optional hint for the desired format (e.g., MM/DD/YYYY for dates).'),
    }),
  },
  output: {
    schema: z.object({
      standardizedValue: z.string().describe('The standardized value of the field.'),
      explanation: z
        .string()
        .optional()
        .describe('Explanation of the standardization process.'),
    }),
  },
  prompt: `You are a data standardization expert. You will receive a field name, its current value, and its data type. You will standardize the value according to the data type, and explain how you standardized it. If a format hint is provided, you must use the format hint.

Field Name: {{{fieldName}}}
Field Value: {{{fieldValue}}}
Field Type: {{{fieldType}}}
Format Hint: {{{formatHint}}}

Standardized Value:`, // No function calls or async operations in Handlebars
})

// Define the Genkit flow for data standardization
const standardizeDataFlow = ai.defineFlow<
  typeof StandardizeDataInputSchema,
  typeof StandardizeDataOutputSchema
>({
  name: 'standardizeDataFlow',
  inputSchema: StandardizeDataInputSchema,
  outputSchema: StandardizeDataOutputSchema,
},
async input => {
  const {output} = await standardizeDataPrompt(input);
  return output!;
});


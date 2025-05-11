'use server';

/**
 * @fileOverview Data Anomaly Detection AI agent.
 *
 * - detectDataAnomaly - A function that handles the data anomaly detection process.
 * - DetectDataAnomalyInput - The input type for the detectDataAnomaly function.
 * - DetectDataAnomalyOutput - The return type for the detectDataAnomaly function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const DetectDataAnomalyInputSchema = z.object({
  customerData: z
    .string()
    .describe('The customer data to check for anomalies, as a JSON string.'),
});
export type DetectDataAnomalyInput = z.infer<typeof DetectDataAnomalyInputSchema>;

const AnomalySchema = z.object({
  field: z.string().describe('The field where the anomaly was detected.'),
  description: z
    .string()
    .describe('A detailed description of the anomaly and its potential impact.'),
  suggestedCorrection: z
    .string()
    .optional()
    .describe('A suggestion on how to correct the anomaly, if applicable.'),
});

const DetectDataAnomalyOutputSchema = z.object({
  anomalies: z.array(AnomalySchema).describe('A list of anomalies found in the customer data.'),
  summary: z.string().describe('A summary of the anomalies detected.'),
});
export type DetectDataAnomalyOutput = z.infer<typeof DetectDataAnomalyOutputSchema>;

export async function detectDataAnomaly(input: DetectDataAnomalyInput): Promise<DetectDataAnomalyOutput> {
  return detectDataAnomalyFlow(input);
}

const detectDataAnomalyPrompt = ai.definePrompt({
  name: 'detectDataAnomalyPrompt',
  input: {
    schema: z.object({
      customerData: z
        .string()
        .describe('The customer data to check for anomalies, as a JSON string.'),
    }),
  },
  output: {
    schema: z.object({
      anomalies: z.array(
        z.object({
          field: z.string().describe('The field where the anomaly was detected.'),
          description: z
            .string()
            .describe('A detailed description of the anomaly and its potential impact.'),
          suggestedCorrection: z
            .string()
            .optional()
            .describe('A suggestion on how to correct the anomaly, if applicable.'),
        })
      ),
      summary: z.string().describe('A summary of the anomalies detected.'),
    }),
  },
  prompt: `You are an expert data analyst specializing in identifying anomalies in customer data.

You will receive customer data as a JSON string. Your task is to analyze the data and identify any anomalies, inconsistencies, or errors.
For each anomaly, provide a detailed description of the issue, the field where it was found, and a suggestion on how to correct it if possible.

Customer Data:
{{{customerData}}}

Ensure that the output is a JSON object matching the schema, including an array of anomalies and a summary.
`,
});

const detectDataAnomalyFlow = ai.defineFlow<
  typeof DetectDataAnomalyInputSchema,
  typeof DetectDataAnomalyOutputSchema
>({
  name: 'detectDataAnomalyFlow',
  inputSchema: DetectDataAnomalyInputSchema,
  outputSchema: DetectDataAnomalyOutputSchema,
},
async input => {
  const {output} = await detectDataAnomalyPrompt(input);
  return output!;
});

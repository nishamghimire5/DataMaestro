'use server';

/**
 * @fileOverview English Correction flow using LLMs to correct and style text.
 *
 * This file defines a Genkit flow for correcting English text with different tones,
 * formatting for different use cases, and adjusting grammar strictness using an LLM.
 *
 * @exports correctEnglish - A function that corrects and styles English text.
 * @exports EnglishCorrectionInput - The input type for the correctEnglish function.
 * @exports EnglishCorrectionOutput - The return type for the correctEnglish function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

export interface EnglishCorrectionInput {
  text: string;
  tone: 'casual' | 'formal' | 'professional' | 'funny' | 'sarcastic' | 'loving' | 'helpful' | string; // Allow custom strings too
  useCase: 'mail' | 'message' | 'professional_tweet' | 'funny_tweet' | 'caption' | 'assignment' | 'thread_tweet' | string; // Added thread_tweet option
  grammarStrictness: 'informal' | 'formal' | 'genz_casual';
  enforceCharacterLimit?: boolean; // For Twitter/X posts with 280 char limit
}

export interface EnglishCorrectionOutput {
  correctedText: string;
  suggestions?: string[]; // Optional: for more detailed feedback
  threadParts?: string[]; // For thread tweets, array of tweet parts
  characterCount?: number; // Character count for tweets
}

// Define the input schema for English correction
const EnglishCorrectionInputSchema = z.object({
  text: z.string().describe('The text to be corrected.'),
  tone: z.string().describe('The desired tone of the corrected text (e.g., casual, formal, professional, funny)'),
  useCase: z.string().describe('The use case for the text (e.g., mail, message, tweet, caption, assignment)'),
  grammarStrictness: z.enum(['informal', 'formal', 'genz_casual']).describe('The level of grammar strictness'),
  enforceCharacterLimit: z.boolean().optional().describe('Whether to enforce the Twitter character limit of 280 characters'),
});

// Define the output schema for English correction
const EnglishCorrectionOutputSchema = z.object({
  correctedText: z.string().describe('The corrected version of the input text'),
  suggestions: z.array(z.string()).optional().describe('Suggestions for further improvement'),
  threadParts: z.array(z.string()).optional().describe('For thread tweets, parts of the thread'),
  characterCount: z.number().optional().describe('Character count for the corrected text'),
});

// Define the prompt for English correction
const correctEnglishPrompt = ai.definePrompt({
  name: 'correctEnglishPrompt',
  input: {
    schema: EnglishCorrectionInputSchema,
  },
  output: {
    schema: EnglishCorrectionOutputSchema,
  },
  prompt: `You are an expert English language specialist who helps people improve their text based on their preferences.

Please correct and style the following text according to these parameters:
- Text: {{{text}}}
- Desired tone: {{{tone}}}
- Use case: {{{useCase}}}
- Grammar strictness level: {{{grammarStrictness}}}
- Enforce character limit: {{{enforceCharacterLimit}}}

Guidelines:
1. If the use case is "professional_tweet" or "funny_tweet" and enforceCharacterLimit is true, ensure the text is under 280 characters.
2. If the use case is "thread_tweet", break the content into multiple tweets, each under 280 characters, and provide them as an array in threadParts.
3. If grammarStrictness is "formal", use proper grammar and punctuation.
4. If grammarStrictness is "informal", be more relaxed with grammar but maintain clarity.
5. If grammarStrictness is "genz_casual", incorporate more casual Gen Z style language elements like abbreviations, but make sure it remains understandable.
6. Provide 2-3 helpful suggestions for improving the text further.
7. For tweets, include the character count of each tweet.

Make sure the corrected text maintains the original meaning while applying the requested style.`,
});

// Define the flow for English correction
const correctEnglishFlow = ai.defineFlow<
  typeof EnglishCorrectionInputSchema,
  typeof EnglishCorrectionOutputSchema
>({
  name: 'correctEnglishFlow',
  inputSchema: EnglishCorrectionInputSchema,
  outputSchema: EnglishCorrectionOutputSchema,
},
async input => {
  const { output } = await correctEnglishPrompt(input);
  return output!;
});

// The main function that the component will call
export async function correctEnglish(input: EnglishCorrectionInput): Promise<EnglishCorrectionOutput> {
  console.log('AI English Correction called with:', input);
  
  try {
    // Process the correction through our AI flow
    const result = await correctEnglishFlow(input);
    
    // Process tweets for character limits if needed
    if ((input.useCase.includes('tweet') || input.useCase === 'thread_tweet') && !result.characterCount) {
      result.characterCount = result.correctedText.length;
    }
    
    return result;
  } catch (error) {
    console.error('Error in English correction AI flow:', error);
    return {
      correctedText: input.text,
      suggestions: ['Error processing your text. Please try again.'],
    };
  }
}

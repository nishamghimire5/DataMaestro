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

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

export interface EnglishCorrectionInput {
  text: string;
  tone: 'casual' | 'formal' | 'professional' | 'funny' | 'sarcastic' | 'loving' | 'helpful' | string; // Allow custom strings too
  useCase: 'mail' | 'message' | 'tweet' | 'professional_tweet' | 'funny_tweet' | 'caption' | 'assignment' | 'thread_tweet' | string; // Added tweet and thread_tweet options
  grammarStrictness: 'informal' | 'formal' | 'genz_casual' | string; // Allow custom strings too
  enforceCharacterLimit?: boolean; // For Twitter/X posts with 280 char limit
  isGenerationMode?: boolean; // Whether this is a correction or generation from instructions
  targetLanguage?: string; // Target language for translation
  includeRomanization?: boolean; // Whether to include romanized version for non-Latin scripts
}

export interface EnglishCorrectionOutput {
  correctedText: string;
  suggestions?: string[]; // Optional: for more detailed feedback
  threadParts?: string[]; // For thread tweets, array of tweet parts
  characterCount?: number; // Character count for tweets
}

// Define the input schema for English correction
const EnglishCorrectionInputSchema = z.object({
  text: z.string().describe('The text to be corrected or the instructions for generating text.'),
  tone: z.string().describe('The desired tone of the corrected text (e.g., casual, formal, professional, funny)'),
  useCase: z.string().describe('The use case for the text (e.g., mail, message, tweet, caption, assignment)'),
  grammarStrictness: z.string().describe('The level of grammar strictness (e.g., informal, formal, genz_casual)'),
  enforceCharacterLimit: z.boolean().optional().describe('Whether to enforce the Twitter character limit of 280 characters'),
  isGenerationMode: z.boolean().optional().describe('Whether this is a correction or generation from instructions'),
  targetLanguage: z.string().optional().describe('The target language to translate the text into'),
  includeRomanization: z.boolean().optional().describe('Whether to include romanized version of non-Latin script translations'),
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
  prompt: `You are an expert English language specialist who helps people improve their text based on their preferences or generate text from their instructions.

{{#if isGenerationMode}}
I will provide you with instructions for generating content. Create a complete text that follows these instructions according to the specified parameters:
- Instructions: {{{text}}}
- Desired tone: {{{tone}}}
- Use case: {{{useCase}}}
- Grammar strictness level: {{{grammarStrictness}}}
- Enforce character limit: {{{enforceCharacterLimit}}}
{{#if targetLanguage}}
- Target language: {{{targetLanguage}}}
{{/if}}

{{else}}
Please correct and style the following text according to these parameters:
- Text: {{{text}}}
- Desired tone: {{{tone}}}
- Use case: {{{useCase}}}
- Grammar strictness level: {{{grammarStrictness}}}
- Enforce character limit: {{{enforceCharacterLimit}}}
{{#if targetLanguage}}
- Target language: {{{targetLanguage}}}
{{/if}}
{{/if}}

Guidelines:
1. If the use case is "tweet", "professional_tweet", or "funny_tweet" and enforceCharacterLimit is true, ensure the text is under 280 characters.
2. If the use case is "thread_tweet", break the content into multiple tweets, each under 280 characters, and provide them as an array in threadParts.
3. If grammarStrictness is "formal", use proper grammar, punctuation and avoid contractions.
4. If grammarStrictness is "informal", be more relaxed with grammar but maintain clarity.
5. If grammarStrictness is "genz_casual", incorporate Gen Z style language elements such as:
   - Replacing "because" with "cuz"
   - Using "tbh" for "to be honest"
   - Using "fr" for "for real"
   - Using "ngl" for "not gonna lie"
   - Including emotional expressions like "lol", "lmao", "vibing", "no cap"
   - Using lowercase letters and minimal punctuation
   - Make it conversational but still understandable
6. For emails (useCase = "mail"), ALWAYS use a formal and professional tone regardless of other settings. Avoid direct, rude, or attitude-showing language. Include proper salutations and closings.
7. Provide 2-3 helpful suggestions for improving the text further.
8. For tweets, include the character count of each tweet.
9. If a target language is provided, YOU MUST ABSOLUTELY translate the entire text to that language:
   - This is a CRITICAL INSTRUCTION: You MUST translate the text when a target language is specified   {{#if includeRomanization}}
   - YOU MUST FOLLOW THIS EXACT FORMAT for translations, with both sections clearly labeled:
     [Native Script]: <full text translated into native script of target language>
     [Romanized]: <full text transliterated into Latin alphabet>
   
   - For languages that use the Latin script (Spanish, French, German, Italian, etc.):
     - The [Native Script] section will be the translation in that language
     - The [Romanized] section should contain exactly the same text as [Native Script]
   
   - For languages using non-Latin scripts (Chinese, Japanese, Arabic, Russian, Hindi, Nepali, Korean, etc.):
     - The [Native Script] section must contain text in the native script of the language
     - The [Romanized] section MUST contain the romanized/transliterated version in Latin alphabet
   
   - SPECIFIC ROMANIZATION INSTRUCTIONS:
     - Chinese: Use standard Pinyin romanization with tone marks (e.g., Nǐ hǎo)
     - Japanese: Use Hepburn romanization (e.g., Konnichiwa)
     - Korean: Use Revised Romanization (e.g., Annyeonghaseyo)
     - Russian: Use standard transliteration (e.g., Privet)
     - Arabic: Use common transliteration (e.g., Marhaban)
     - Hindi: Use standard transliteration (e.g., Namaste)
     - Nepali: Use standardized transliteration following "Romanized Nepali" conventions (e.g., "Namaste" for नमस्ते)
     
   - PAY SPECIAL ATTENTION TO NEPALI:
     - Ensure Nepali script (Devanagari) appears correctly in [Native Script]
     - Include PROPER romanization in [Romanized] section
     - Example for नेपाली: "nepālī" with correct diacritical marks where appropriate
     - Do not skip either section for ANY language
   {{else}}
   - Provide ONLY the translation in the native script of the target language
   - Do not include any special formatting, section headers, or labels like [Native Script] or [Romanized]
   - For languages using non-Latin scripts (Chinese, Japanese, Arabic, Russian, Hindi, Nepali, Korean, etc.), provide only the native script
   - For all languages, do not provide any romanization/transliteration or explanations
   - The output should ONLY be the translated text, nothing else
   {{/if}}
   - ALWAYS apply all requested tone, style, and format settings to the translation
   - ALWAYS maintain the cultural nuances appropriate for the target language
   - IMPORTANT: Your translation should ONLY contain the translated text. Do NOT include the original English query, any part of these instructions, or any other conversational text.

{{#if isGenerationMode}}
For text generation mode:
- Be creative and helpful based on the user's instructions
- For emails, include all necessary elements (subject line, greeting, body, closing, signature)
- Ensure the generated content is complete and ready to use
- If the instructions mention specific details to include, make sure they are incorporated
{{else}}
Make sure the corrected text maintains the original meaning while applying the requested style.
{{/if}}`,
});

// Define the flow for English correction
const correctEnglishFlow = ai.defineFlow(
  {
    name: 'correctEnglishFlow',
    inputSchema: EnglishCorrectionInputSchema,
    outputSchema: EnglishCorrectionOutputSchema,
  },
  async (input: z.infer<typeof EnglishCorrectionInputSchema>) => {
    const { output } = await correctEnglishPrompt(input);
    return output!;
  }
);

// The main function that the component will call
export async function correctEnglish(input: EnglishCorrectionInput): Promise<EnglishCorrectionOutput> {
  console.log('AI English Correction called with:', input);
  try {
    // Process the correction through our AI flow
    // Note: Translation requests are handled directly through the prompt text
    // Users can specify translation needs in their text input
    const result = await correctEnglishFlow(input);
    
    // Process tweets for character limits if needed
    if (input.useCase === 'tweet' || input.useCase === 'professional_tweet' || 
        input.useCase === 'funny_tweet' || input.useCase === 'thread_tweet') {
      if (!result.characterCount) {
        result.characterCount = result.correctedText.length;
      }
      
      // Ensure thread parts are properly set ONLY when using thread_tweet specifically
      if (input.useCase === 'thread_tweet' && !result.threadParts) {
        // If AI didn't create thread parts, create them manually
        const maxLength = 280;
        const text = result.correctedText;
        const parts: string[] = [];
        
        // Simple tweet splitting logic
        let remainingText = text;
        while (remainingText.length > 0) {
          // Find a good breakpoint (sentence end or space) within limit
          let cutPoint = Math.min(remainingText.length, maxLength);
          
          if (cutPoint < remainingText.length) {
            // Look for sentence ending (., !, ?)
            const sentenceEndMatch = remainingText.substring(0, maxLength).match(/[.!?]\s+/g);
            if (sentenceEndMatch && sentenceEndMatch.length > 0) {
              // Find the last sentence end within limit
              const lastSentenceEnd = remainingText.substring(0, maxLength).lastIndexOf(
                sentenceEndMatch[sentenceEndMatch.length - 1]
              ) + sentenceEndMatch[sentenceEndMatch.length - 1].length;
              
              if (lastSentenceEnd > maxLength / 2) {
                cutPoint = lastSentenceEnd;
              } else {
                // If no good sentence break, look for last space
                const lastSpace = remainingText.substring(0, maxLength).lastIndexOf(' ');
                if (lastSpace > maxLength / 2) {
                  cutPoint = lastSpace;
                }
              }
            } else {
              // No sentence end, use space
              const lastSpace = remainingText.substring(0, maxLength).lastIndexOf(' ');
              if (lastSpace > maxLength / 2) {
                cutPoint = lastSpace;
              }
            }
          }
          
          // Add the part and remove from remaining text
          parts.push(remainingText.substring(0, cutPoint).trim());
          remainingText = remainingText.substring(cutPoint).trim();
        }
        
        // Update result with our thread parts
        result.threadParts = parts;
      }
    }
    
    return result;
  } catch (error: any) {
    console.error('Error in English correction AI flow:', error);
    
    // Generic error handling for all issues
    return {
      correctedText: input.text,
      suggestions: [
        'Error processing your text. Please try again.',
        'If the error persists, try simplifying your text or using shorter sentences.',
        'For translation requests, try including language instructions in your prompt (e.g., "translate this to Spanish").'
      ],
    };
  }
}

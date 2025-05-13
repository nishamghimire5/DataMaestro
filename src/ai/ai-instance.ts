import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { ollama } from 'genkitx-ollama';

export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
    ollama({
      models: [
        {
          name: 'gemma3:4b',
          type: 'generate', // type: 'chat' | 'generate' | undefined
        },
      ],
      serverAddress: 'http://127.0.0.1:11434', // default local address
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});

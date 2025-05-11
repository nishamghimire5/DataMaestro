export enum LlmModel {
  DEFAULT = 'default',
  GEMINI = 'gemini',
  OLLAMA = 'ollama'
}

export type CsvPandasProcessInput = {
  csvData: string;
  command: string;
  originalFilename?: string;
  model?: LlmModel;
  modelOptions?: {
    geminiModel?: string;
    ollamaModel?: string;
  };
};

export type CsvPandasProcessOutput = {
  processedCsvData: string;
  summary: string;
  columnInfo: Array<{
    name: string;
    dataType: string;
    nonNullCount: number;
    uniqueValueCount: number;
  }>;
  pythonCode?: string;
  errorLog?: string[];
  sqlQuery?: string;
};

export type CsvRow = Record<string, string | number | boolean | null>;

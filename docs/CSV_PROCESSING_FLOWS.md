# DataMaestro: Detailed CSV Processing Flows

This document provides a technical deep-dive into how CSV processing works in DataMaestro, with a focus on the system architecture and data flow for each processing mode.

## CSV Processing: Core Architecture

### Initial CSV Parsing Flow

```
[CSV File] → [File Reader] → [PapaParse] → [Data Structures] → [Processing Engine Selection]
```

#### Technical Implementation Details:

1. **File Reading Stage**:

   ```typescript
   // From csv-processing.tsx
   const file = event.target.files?.[0];
   const reader = new FileReader();
   reader.onload = (e) => {
     const text = e.target?.result as string;
     // Processing continues...
   };
   reader.readAsText(file);
   ```

2. **PapaParse Integration**:

   ```typescript
   // CSV parsing using PapaParse
   const parseResult = Papa.parse(text, {
     header: true,
     preview: 10, // For initial preview
     skipEmptyLines: true,
   });
   ```

3. **Data Structure Creation**:

   - Headers array extracted from CSV
   - In-memory data structure created with rows and columns
   - Metadata calculated (row count, column statistics)

4. **Processing Mode Determination**:
   - User selects one of three modes (suggestion, command, SQL)
   - Appropriate processing engine is initialized

## Processing Mode 1: Suggestion Mode

### Suggestion Mode Flow

```
[CSV Data] → [Data Sampling] → [AI Prompt Construction] → [LLM Analysis] → [Suggestion Parsing] → [Presentation] → [User Approval] → [Transformation]
```

#### Technical Implementation Details:

1. **Data Sampling** (For large datasets):

   ```typescript
   // Stratified sampling for large datasets
   const sampleSize = 200; // Maximum sample size
   const dataRows = csvData.split("\n");
   const headerRow = dataRows[0];

   // Stratified sampling from beginning, middle, and end
   const beginSample = dataRows.slice(1, Math.floor(sampleSize * 0.4));
   const middleStart =
     Math.floor(dataRows.length / 2) - Math.floor(sampleSize * 0.1);
   const middleSample = dataRows.slice(
     middleStart,
     middleStart + Math.floor(sampleSize * 0.2)
   );
   const endStart = dataRows.length - Math.floor(sampleSize * 0.4);
   const endSample = dataRows.slice(endStart);

   const sampledData = [
     headerRow,
     ...beginSample,
     ...middleSample,
     ...endSample,
   ].join("\n");
   ```

2. **AI Prompt Construction**:

   ```typescript
   // From csv-cleaning-suggestions.ts
   const suggestCsvCleaningActionsPrompt = ai.definePrompt({
     name: "suggestCsvCleaningActionsPrompt",
     input: { schema: SuggestCsvCleaningActionsInputSchema },
     output: { schema: SuggestCsvCleaningActionsOutputSchema },
     prompt: `You are an expert data cleaning specialist. Your task is to analyze the provided CSV data and suggest specific, actionable, and non-redundant cleaning actions.
     // ... detailed prompt instructions ...
     Input CSV Data (sample or full):
     \`\`\`csv
     {{{csvData}}}
     \`\`\`
     // ... more instructions ...`,
   });
   ```

3. **LLM Invocation**:

   ```typescript
   // Simplified from the actual implementation
   const { output } = await suggestCsvCleaningActionsPrompt({
     csvData: sampledData,
     cleaningInstructions: userInstructions,
     modelId: selectedModel,
   });
   ```

4. **Suggestion Schema Validation**:

   ```typescript
   // Structural validation using zod schema
   const CleaningSuggestionSchema = z.object({
     id: z.string().describe("A unique identifier for this suggestion."),
     userInstructionId: z
       .string()
       .optional()
       .describe(
         "If generated from a user instruction, the ID of that instruction."
       ),
     description: z
       .string()
       .describe("A human-readable description of the cleaning suggestion."),
     rowNumber: z
       .number()
       .optional()
       .describe(
         "The 1-indexed row number with the issue (empty for column-wide issues)."
       ),
     columnName: z
       .string()
       .optional()
       .describe(
         "The column name with the issue. Required for all but REMOVE_ROW."
       ),
     originalFragment: z
       .string()
       .describe("A sample or description of the original problematic data."),
     suggestedFragment: z
       .string()
       .describe("The suggested replacement or correction."),
     actionType: z
       .enum([
         "FILL_MISSING",
         "FILL_MISSING_NUMERIC",
         "MODIFY_CELL",
         "STANDARDIZE_FORMAT",
         "REMOVE_ROW",
         "REVIEW_CONSISTENCY",
       ])
       .describe("The type of cleaning action."),
     imputationMethod: z
       .enum(["mean", "median", "mode"])
       .optional()
       .describe("For FILL_MISSING_NUMERIC, the statistical method to use."),
     rationale: z
       .string()
       .optional()
       .describe("The reasoning behind the suggestion."),
     source: z
       .enum(["general_suggestion", "user_instruction"])
       .describe("Where this suggestion came from."),
     confidence: z
       .number()
       .min(0)
       .max(1)
       .optional()
       .describe("A confidence score between 0.0 and 1.0."),
     priority: z
       .enum(["low", "medium", "high"])
       .optional()
       .describe("The priority level of this suggestion."),
     affectedRows: z
       .number()
       .optional()
       .describe("Estimated number of rows affected by this suggestion."),
   });
   ```

5. **User Approval Flow**:
   - Suggestions displayed to user with confidence scores and preview
   - User can approve/reject each suggestion individually
   - For FILL_MISSING_NUMERIC, user can select imputation method
6. **Data Transformation Implementation**:

   ```typescript
   // From apply-csv-changes.ts
   export async function applyCsvApprovedChanges({
     csvData,
     approvedSuggestions,
   }: ApplyCsvApprovedChangesInput): Promise<ApplyCsvApprovedChangesOutput> {
     let processedCsv = csvData;
     const transformationResults = [];

     // Process each approved suggestion
     for (const suggestion of approvedSuggestions) {
       // Apply different transformation logic based on actionType
       switch (suggestion.actionType) {
         case "FILL_MISSING":
           processedCsv = applyFillMissingTransformation(
             processedCsv,
             suggestion.columnName!,
             suggestion.suggestedFragment
           );
           break;

         case "FILL_MISSING_NUMERIC":
           processedCsv = applyNumericImputationTransformation(
             processedCsv,
             suggestion.columnName!,
             suggestion.selectedImputationMethod || "median"
           );
           break;

         // Other action types...
       }

       // Track transformation result
       transformationResults.push({
         suggestionId: suggestion.id,
         success: true,
       });
     }

     return {
       processedCsvData: processedCsv,
       transformationResults,
     };
   }
   ```

## Processing Mode 2: Command Mode

### Command Mode Flow

```
[CSV Data] → [Command Input] → [Pattern Matching] → [AI Command Translation] → [Execution Plan] → [Data Transformation] → [Result Generation]
```

#### Technical Implementation Details:

1. **Command Analysis Stage**:

   ```typescript
   // Regex-based pattern matching for common operations
   const FILL_MISSING_PATTERN =
     /fill\s+(missing|empty)\s+values?\s+in\s+['"]([^'"]+)['"]\s+with\s+['"]?([^'"]+)['"]?/i;
   const STANDARDIZE_DATE_PATTERN =
     /standardize\s+dates?\s+in\s+['"]([^'"]+)['"]\s+to\s+['"]?([^'"]+)['"]?/i;

   // Pattern matching attempt first (simplified)
   const fillMatch = command.match(FILL_MISSING_PATTERN);
   if (fillMatch) {
     const columnName = fillMatch[2];
     const fillValue = fillMatch[3];
     return {
       operation: "FILL_MISSING",
       column: columnName,
       value: fillValue,
     };
   }

   // If no pattern match, use AI processing
   return await aiCommandTranslation(command, csvSample);
   ```

2. **AI Command Translation**:

   ```typescript
   // From csv-direct-commands.ts
   const csvDirectCommandPrompt = ai.definePrompt({
     name: "csvDirectCommandPrompt",
     input: { schema: CsvDirectCommandInputSchema },
     output: { schema: CsvDirectCommandOutputSchema },
     prompt: `You are an experienced senior data scientist with extensive expertise in data manipulation...
     
     Input CSV Data:
     \`\`\`csv
     {{{csvData}}}
     \`\`\`
     
     User Commands:
     {{{commands}}}
     
     Key Instructions for Processing Commands:
     1. **Parse CSV Data**: Carefully parse the "Input CSV Data"...
     // ... detailed instructions ...`,
   });
   ```

3. **Command Execution**:

   ```typescript
   // From csv-direct-processor.ts
   // Execution plan generation
   const executionPlan = generateExecutionPlan(commandAnalysis);

   // Apply transformations based on plan
   const transformResult = await applyTransformations(csvData, executionPlan);

   // Track metrics and return
   return {
     processedCsvData: transformResult.data,
     summary: `Applied ${executionPlan.operations.length} operations to the data.`,
     appliedActions: transformResult.actions,
     errorMessages: transformResult.errors,
   };
   ```

4. **Transformation Functions**:

   ```typescript
   // Fill missing values transformation (simplified)
   function fillMissingValues(csvData, columnName, fillValue) {
     const parsedData = Papa.parse(csvData, { header: true });
     const headers = parsedData.meta.fields;
     const rows = parsedData.data;

     // Validate column exists
     if (!headers.includes(columnName)) {
       throw new Error(`Column "${columnName}" not found`);
     }

     // Apply transformation
     let affectedRows = 0;
     const transformedRows = rows.map((row) => {
       if (!row[columnName] || row[columnName].trim() === "") {
         row[columnName] = fillValue;
         affectedRows++;
       }
       return row;
     });

     // Convert back to CSV
     return {
       data: Papa.unparse(transformedRows),
       affectedRows,
     };
   }
   ```

## Processing Mode 3: SQL Mode

### SQL Mode Flow

```
[CSV Data] → [SQL Query] → [Query Parsing] → [Schema Mapping] → [Execution Engine] → [Result Formatting]
```

#### Technical Implementation Details:

1. **Query Analysis & Schema Mapping**:

   ```typescript
   // From csv-sql-processing.ts
   function analyzeSqlQuery(query, csvHeaders) {
     const isSelect = /^\s*SELECT\s+/i.test(query);
     const isUpdate = /^\s*UPDATE\s+/i.test(query);
     const isDelete = /^\s*DELETE\s+/i.test(query);

     // Extract column references
     const columnRefs = extractColumnReferences(query);

     // Validate column references
     const invalidColumns = columnRefs.filter(
       (col) => !csvHeaders.includes(col) && col !== "*"
     );

     return {
       queryType: isSelect
         ? "SELECT"
         : isUpdate
         ? "UPDATE"
         : isDelete
         ? "DELETE"
         : "UNKNOWN",
       columnReferences: columnRefs,
       invalidColumns,
       isValid: invalidColumns.length === 0,
     };
   }
   ```

2. **SQL Processing AI Integration**:

   ```typescript
   // From csv-sql-processing.ts
   const csvSqlProcessPrompt = ai.definePrompt({
     name: "csvSqlProcessPrompt",
     input: { schema: CsvSqlProcessInputSchema },
     output: { schema: CsvSqlProcessOutputSchema },
     prompt: `You are an expert CSV data processor with SQL capabilities...
     
     Input CSV Data:
     \`\`\`csv
     {{{csvData}}}
     \`\`\`
     
     SQL-like Query to Execute:
     \`\`\`sql
     {{{sqlQuery}}}
     \`\`\`
     
     Your task is to:
     1. Parse the CSV data and understand its structure...
     // ... detailed instructions ...`,
   });
   ```

3. **Query Execution & Data Transformation**:

   ```typescript
   // SQL execution process (conceptual representation)
   async function executeSqlQuery(csvData, sqlQuery) {
     // For simple queries, use regex-based execution
     if (isSimpleQuery(sqlQuery)) {
       return executeWithRegexParser(csvData, sqlQuery);
     }

     // For complex queries, use AI-based execution
     const result = await csvSqlProcessPrompt({
       csvData,
       sqlQuery,
     });

     return {
       processedCsvData: result.output.processedCsvData,
       summary: result.output.summary,
       columnInfo: result.output.columnInfo,
       errorLog: result.output.errorLog || [],
     };
   }
   ```

4. **Result Formatting & Schema Detection**:

   ```typescript
   // Calculate column statistics
   function generateColumnInfo(csvData) {
     const parseResult = Papa.parse(csvData, { header: true });
     const headers = parseResult.meta.fields || [];
     const rows = parseResult.data || [];

     return headers.map((columnName) => {
       // Extract all values for this column
       const values = rows.map((row) => row[columnName]);

       // Count non-null values
       const nonNullCount = values.filter(
         (v) => v !== null && v !== undefined && v !== ""
       ).length;

       // Count unique values (approximate for large datasets)
       const uniqueSet = new Set(values);

       // Infer data type
       const dataType = inferDataType(values);

       return {
         name: columnName,
         dataType,
         nonNullCount,
         uniqueValueCount: uniqueSet.size,
       };
     });
   }
   ```

## In-Memory Processing Architecture

DataMaestro uses sophisticated in-memory processing techniques to handle data efficiently:

### Chunked Processing for Large Files

```typescript
// Chunked processing for large files
async function processLargeFile(csvData, operation) {
  // Split into chunks of 1000 rows
  const rows = csvData.split("\n");
  const header = rows[0];
  const dataRows = rows.slice(1);
  const chunkSize = 1000;
  const chunks = [];

  // Create chunks
  for (let i = 0; i < dataRows.length; i += chunkSize) {
    chunks.push(dataRows.slice(i, i + chunkSize));
  }

  // Process each chunk
  const processedChunks = await Promise.all(
    chunks.map(async (chunk) => {
      const chunkCsv = [header, ...chunk].join("\n");
      return await operation(chunkCsv);
    })
  );

  // Combine processed chunks
  return [
    header,
    ...processedChunks.flatMap((chunk) => chunk.split("\n").slice(1)),
  ].join("\n");
}
```

### Memory-Efficient Transformations

```typescript
// Stream-based transformation for memory efficiency
function streamTransform(csvData, transformation) {
  // Use stream parsing for large files
  let header = null;
  let transformedRows = [];

  // Create parser with streaming approach
  const parser = Papa.parse(csvData, {
    header: true,
    step: function (result) {
      if (!header) {
        header = result.meta.fields;
      }

      // Apply transformation to each row
      const transformedRow = transformation(result.data[0]);
      transformedRows.push(transformedRow);
    },
    complete: function () {
      // Processing complete
    },
  });

  // Return transformed CSV
  return Papa.unparse({
    fields: header,
    data: transformedRows,
  });
}
```

## Error Handling Architecture

DataMaestro implements a comprehensive error handling system:

```typescript
// Error categorization and handling
function handleProcessingError(error, context) {
  // Categorize error
  if (error.message.includes("Column not found")) {
    return {
      errorType: "COLUMN_NOT_FOUND",
      errorMessage: `Column "${error.columnName}" not found in dataset`,
      severity: "ERROR",
      recoverable: false,
    };
  } else if (error.message.includes("Invalid data type")) {
    return {
      errorType: "DATA_TYPE_MISMATCH",
      errorMessage: `Cannot perform numeric operation on non-numeric data in column "${error.columnName}"`,
      severity: "WARNING",
      recoverable: true,
      recoveryAction: "SKIP_AFFECTED_ROWS",
    };
  } else if (error.message.includes("API limit exceeded")) {
    return {
      errorType: "API_ERROR",
      errorMessage: "AI model API rate limit exceeded",
      severity: "ERROR",
      recoverable: true,
      recoveryAction: "RETRY_WITH_BACKOFF",
    };
  }

  // Default error handling
  return {
    errorType: "UNKNOWN_ERROR",
    errorMessage: error.message,
    severity: "ERROR",
    recoverable: false,
  };
}
```

## Performance Optimization Strategies

DataMaestro employs several techniques to optimize data processing performance:

1. **Stratified Sampling**: Takes representative samples from beginning, middle, and end of data
2. **Request Batching**: Groups similar operations for more efficient AI API usage
3. **Context Window Optimization**: Carefully manages token limits for LLM context windows
4. **Caching**: Stores calculated statistics and previous processing results
5. **Hybrid Processing**: Uses rule-based approaches for common operations, AI for complex ones

## End-to-End Processing Example

To illustrate the complete flow, here's an example of processing a CSV file with all three modes:

### Upload & Initial Processing

```
1. User uploads sales_data.csv (5,000 rows)
2. System parses CSV headers: Date, Product, Region, Sales, Profit
3. Preview is generated with first 10 rows
4. Basic statistics are calculated (row count, column types)
```

### Suggestion Mode Flow

```
1. User clicks "Get Suggestions"
2. System samples ~200 rows (stratified sampling)
3. AI analyzes data patterns
4. System returns 5 suggestions:
   - Missing values in "Sales" column
   - Inconsistent date formats in "Date" column
   - Duplicate rows detected
   - Possible outliers in "Profit" column
   - Inconsistent casing in "Region" column
5. User approves 3 suggestions
6. System applies transformations to entire dataset
7. Transformed CSV is generated
```

### Command Mode Flow

```
1. User enters: "standardize all dates in the 'Date' column to YYYY-MM-DD format"
2. System matches command to pattern
3. Command is validated (column exists, operation is supported)
4. Preview shows sample of transformations
5. User confirms
6. System processes all 5,000 rows in chunks
7. Transformed CSV is generated
```

### SQL Mode Flow

```
1. User enters SQL: "SELECT Product, Region FROM data where Sales > 1000"
2. System parses query and validates columns
3. Query is executed against in-memory data
4. Results are formatted as new CSV
5. Column statistics are calculated for result set
6. User can download the result or continue processing
```

This detailed technical flow shows how data moves through the DataMaestro system, from initial upload through sophisticated processing and transformation stages, to final output generation.

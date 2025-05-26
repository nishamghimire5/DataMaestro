# DataMaestro CSV Processing Flow Diagrams

This document provides visual representations of how data flows through the DataMaestro system, focusing on the technical implementation of CSV processing.

## Master Data Flow Diagram

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│    CSV Upload   │────────▶│  Data Parsing   │────────▶│  Mode Selection │
│                 │         │   & Preview     │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                                                 │
                 ┌───────────────────────┬───────────────────────┴───────────────────────┐
                 │                       │                                               │
                 ▼                       ▼                                               ▼
        ┌─────────────────┐    ┌─────────────────┐                            ┌─────────────────┐
        │                 │    │                 │                            │                 │
        │ Suggestion Mode │    │  Command Mode   │                            │    SQL Mode     │
        │                 │    │                 │                            │                 │
        └────────┬────────┘    └────────┬────────┘                            └────────┬────────┘
                 │                      │                                              │
                 ▼                      ▼                                              ▼
        ┌─────────────────┐    ┌─────────────────┐                            ┌─────────────────┐
        │                 │    │                 │                            │                 │
        │  AI Analysis    │    │Command Analysis │                            │  Query Parsing  │
        │                 │    │                 │                            │                 │
        └────────┬────────┘    └────────┬────────┘                            └────────┬────────┘
                 │                      │                                              │
                 ▼                      ▼                                              ▼
        ┌─────────────────┐    ┌─────────────────┐                            ┌─────────────────┐
        │                 │    │                 │                            │                 │
        │   Suggestions   │    │ Transformation  │                            │ Query Execution │
        │                 │    │     Plan        │                            │                 │
        └────────┬────────┘    └────────┬────────┘                            └────────┬────────┘
                 │                      │                                              │
                 ▼                      ▼                                              ▼
        ┌─────────────────┐    ┌─────────────────┐                            ┌─────────────────┐
        │                 │    │                 │                            │                 │
        │ User Approval   │    │ User Approval   │                            │ Result Display  │
        │                 │    │                 │                            │                 │
        └────────┬────────┘    └────────┬────────┘                            └────────┬────────┘
                 │                      │                                              │
                 └──────────────────────┴──────────────────────────────────────────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │                 │
                                        │ CSV Generation  │
                                        │                 │
                                        └─────────────────┘
```

## Detailed Mode-Specific Flows

### 1. Suggestion Mode Technical Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              SUGGESTION MODE FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 1. DATA SAMPLING                                                                     │
│                                                                                      │
│    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐             │
│    │ Header Row   │──────────│ Row Counting │──────────│ Stratified   │             │
│    │ Extraction   │          │              │          │ Sampling     │             │
│    └──────────────┘          └──────────────┘          └──────────────┘             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 2. AI PROMPT CONSTRUCTION                                                            │
│                                                                                      │
│    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐             │
│    │ CSV Data     │──────────│ Instruction  │──────────│ Structured   │             │
│    │ Formatting   │          │ Integration  │          │ Prompt       │             │
│    └──────────────┘          └──────────────┘          └──────────────┘             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 3. LLM PROCESSING                                                                    │
│                                                                                      │
│    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐             │
│    │ Model        │──────────│ AI           │──────────│ Response     │             │
│    │ Selection    │          │ Processing   │          │ Parsing      │             │
│    └──────────────┘          └──────────────┘          └──────────────┘             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 4. SUGGESTION PROCESSING                                                             │
│                                                                                      │
│    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐             │
│    │ Schema       │──────────│ Suggestion   │──────────│ Confidence   │             │
│    │ Validation   │          │ Organization │          │ Scoring      │             │
│    └──────────────┘          └──────────────┘          └──────────────┘             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 5. USER INTERACTION                                                                  │
│                                                                                      │
│    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐             │
│    │ Suggestion   │──────────│ User         │──────────│ Approval     │             │
│    │ Display      │          │ Review       │          │ Collection   │             │
│    └──────────────┘          └──────────────┘          └──────────────┘             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 6. DATA TRANSFORMATION                                                               │
│                                                                                      │
│    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐             │
│    │ Action       │──────────│ CSV          │──────────│ Results      │             │
│    │ Application  │          │ Generation   │          │ Validation   │             │
│    └──────────────┘          └──────────────┘          └──────────────┘             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Command Mode Technical Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                               COMMAND MODE FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 1. COMMAND ANALYSIS                                                                  │
│                                                                                      │
│    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐             │
│    │ Regex        │────┐     │ Command      │     ┌────│ AI-Based     │             │
│    │ Pattern      │    │     │ Type         │     │    │ Parsing      │             │
│    │ Matching     │    │     │ Detection    │     │    │              │             │
│    └──────────────┘    │     └──────────────┘     │    └──────────────┘             │
│           │            │            │             │           │                      │
│           │            │            │             │           │                      │
│           ▼            │            ▼             │           ▼                      │
│    ┌──────────────┐    │     ┌──────────────┐     │    ┌──────────────┐             │
│    │ Fast Path    │◄───┘     │ Hybrid       │◄────┘    │ Complex      │             │
│    │ Processing   │          │ Processing   │          │ Command      │             │
│    └──────────────┘          └──────────────┘          │ Processing   │             │
│                                                         └──────────────┘             │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 2. EXECUTION PLANNING                                                                │
│                                                                                      │
│    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐             │
│    │ Column       │──────────│ Action       │──────────│ Preview      │             │
│    │ Validation   │          │ Planning     │          │ Generation   │             │
│    └──────────────┘          └──────────────┘          └──────────────┘             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 3. DATA TRANSFORMATION                                                               │
│                                                                                      │
│    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐             │
│    │ Row-by-Row   │──────────│ Batch        │──────────│ Operation    │             │
│    │ Processing   │          │ Processing   │          │ Metrics      │             │
│    └──────────────┘          └──────────────┘          └──────────────┘             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 4. RESULT GENERATION                                                                 │
│                                                                                      │
│    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐             │
│    │ CSV          │──────────│ Summary      │──────────│ Log          │             │
│    │ Generation   │          │ Statistics   │          │ Generation   │             │
│    └──────────────┘          └──────────────┘          └──────────────┘             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 3. SQL Mode Technical Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                 SQL MODE FLOW                                        │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 1. QUERY ANALYSIS                                                                    │
│                                                                                      │
│    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐             │
│    │ Query Type   │──────────│ Column       │──────────│ Operation    │             │
│    │ Detection    │          │ Extraction   │          │ Parsing      │             │
│    └──────────────┘          └──────────────┘          └──────────────┘             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 2. SCHEMA MAPPING                                                                    │
│                                                                                      │
│    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐             │
│    │ CSV Header   │──────────│ Data Type    │──────────│ Virtual Table│             │
│    │ Mapping      │          │ Inference    │          │ Creation     │             │
│    └──────────────┘          └──────────────┘          └──────────────┘             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 3. EXECUTION STRATEGY                                                                │
│                                                                                      │
│    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐             │
│    │ Processing   │──────────│ Operation    │──────────│ SQL/AI       │             │
│    │ Mode         │          │ Planning     │          │ Execution    │             │
│    │ Selection    │          │              │          │              │             │
│    └──────────────┘          └──────────────┘          └──────────────┘             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 4. RESULT PROCESSING                                                                 │
│                                                                                      │
│    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐             │
│    │ Data         │──────────│ Column       │──────────│ CSV          │             │
│    │ Formatting   │          │ Statistics   │          │ Generation   │             │
│    └──────────────┘          └──────────────┘          └──────────────┘             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Technical Implementation Examples

### Suggestion Mode Implementation

```typescript
// Key components in the Suggestion Mode processing pipeline

// 1. Data Sampling
function sampleCsvForAnalysis(csvData: string): string {
  const rows = csvData.split("\n");
  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  // Calculate sample size based on data size
  const sampleSize = Math.min(200, dataRows.length);

  // Stratified sampling
  const beginRows = dataRows.slice(0, Math.floor(sampleSize * 0.4));
  const middleStart =
    Math.floor(dataRows.length / 2) - Math.floor((sampleSize * 0.2) / 2);
  const middleRows = dataRows.slice(
    middleStart,
    middleStart + Math.floor(sampleSize * 0.2)
  );
  const endStart = dataRows.length - Math.floor(sampleSize * 0.4);
  const endRows = dataRows.slice(endStart);

  return [headerRow, ...beginRows, ...middleRows, ...endRows].join("\n");
}

// 2. AI Processing and Suggestion Generation
async function generateSuggestions(
  csvSample: string
): Promise<CleaningSuggestion[]> {
  const result = await suggestCsvCleaningActionsPrompt({
    csvData: csvSample,
    modelId: "gemini-pro",
  });

  return result.output.suggestions;
}

// 3. Applying Approved Suggestions
function applyApprovedSuggestions(
  csvData: string,
  approvedSuggestions: SuggestionWithStatus[]
): string {
  let processedCsv = csvData;

  for (const suggestion of approvedSuggestions) {
    if (suggestion.status !== "approved") continue;

    switch (suggestion.actionType) {
      case "FILL_MISSING":
        processedCsv = fillMissingValues(
          processedCsv,
          suggestion.columnName!,
          suggestion.suggestedFragment
        );
        break;

      case "FILL_MISSING_NUMERIC":
        processedCsv = fillMissingNumericValues(
          processedCsv,
          suggestion.columnName!,
          suggestion.selectedImputationMethod || "median"
        );
        break;

      case "MODIFY_CELL":
        processedCsv = modifyCellValue(
          processedCsv,
          suggestion.columnName!,
          suggestion.rowNumber,
          suggestion.originalFragment,
          suggestion.suggestedFragment
        );
        break;

      // Other action types...
    }
  }

  return processedCsv;
}
```

### Command Mode Implementation

```typescript
// Key components in the Command Mode processing pipeline

// 1. Command Pattern Matching
function analyzeCommand(command: string): CommandOperation | null {
  // Check for fill missing values pattern
  const fillMissingMatch = command.match(
    /fill\s+(missing|empty)\s+values?\s+in\s+['"]([^'"]+)['"]\s+with\s+['"]?([^'"]+)['"]?/i
  );

  if (fillMissingMatch) {
    return {
      type: "FILL_MISSING",
      column: fillMissingMatch[2],
      value: fillMissingMatch[3],
    };
  }

  // Check for standardize dates pattern
  const standardizeDatesMatch = command.match(
    /standardize\s+dates?\s+in\s+['"]([^'"]+)['"]\s+to\s+['"]?([^'"]+)['"]?/i
  );

  if (standardizeDatesMatch) {
    return {
      type: "STANDARDIZE_DATES",
      column: standardizeDatesMatch[1],
      format: standardizeDatesMatch[2],
    };
  }

  // No pattern match, return null for AI processing
  return null;
}

// 2. AI Command Processing
async function processCommandWithAI(
  csvData: string,
  command: string
): Promise<CommandPlan> {
  const result = await csvDirectCommandPrompt({
    csvData,
    commands: command,
  });

  return {
    operations: extractOperationsFromAiResponse(result.output),
    summary: result.output.summary,
  };
}

// 3. Execution Planning
function createExecutionPlan(
  csvData: string,
  commandOp: CommandOperation
): ExecutionPlan {
  // Validate column exists
  const headers = getHeadersFromCsv(csvData);
  if (!headers.includes(commandOp.column)) {
    return {
      isValid: false,
      errors: [`Column "${commandOp.column}" not found in the CSV data`],
    };
  }

  // Create plan based on operation type
  switch (commandOp.type) {
    case "FILL_MISSING":
      return {
        isValid: true,
        operations: [
          {
            type: "FILL_MISSING",
            column: commandOp.column,
            value: commandOp.value,
          },
        ],
        previewData: generatePreview(csvData, commandOp),
      };

    case "STANDARDIZE_DATES":
      return {
        isValid: true,
        operations: [
          {
            type: "STANDARDIZE_DATES",
            column: commandOp.column,
            format: commandOp.format,
          },
        ],
        previewData: generateDateStandardizationPreview(csvData, commandOp),
      };

    // Other cases...
  }
}
```

### SQL Mode Implementation

```typescript
// Key components in the SQL Mode processing pipeline

// 1. Query Analysis
function analyzeSqlQuery(query: string): QueryAnalysis {
  // Detect query type
  const isSelect = /^\s*SELECT\s+/i.test(query);
  const isUpdate = /^\s*UPDATE\s+/i.test(query);
  const isDelete = /^\s*DELETE\s+/i.test(query);

  // Extract column references using regex
  const columnRefs: string[] = [];

  // Extract SELECT columns
  if (isSelect) {
    const selectMatch = query.match(/SELECT\s+(.*?)\s+FROM/is);
    if (selectMatch && selectMatch[1]) {
      const selectClause = selectMatch[1];
      if (selectClause.trim() !== "*") {
        // Extract individual columns
        const columns = selectClause
          .split(",")
          .map((col) => col.trim())
          .map((col) => {
            // Handle aliased columns like "column as alias"
            const asMatch = col.match(/^(.*?)\s+as\s+/i);
            return asMatch ? asMatch[1].trim() : col;
          })
          .filter((col) => !col.match(/^\s*COUNT|SUM|AVG|MIN|MAX\s*\(/i)); // Filter out aggregations

        columnRefs.push(...columns);
      }
    }
  }

  return {
    queryType: isSelect
      ? "SELECT"
      : isUpdate
      ? "UPDATE"
      : isDelete
      ? "DELETE"
      : "UNKNOWN",
    columnReferences: columnRefs,
    hasAggregation: /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(query),
    hasGroupBy: /\bGROUP\s+BY\b/i.test(query),
    hasOrderBy: /\bORDER\s+BY\b/i.test(query),
  };
}

// 2. SQL Execution
async function executeSqlQuery(
  csvData: string,
  sqlQuery: string
): Promise<SqlExecutionResult> {
  const queryAnalysis = analyzeSqlQuery(sqlQuery);

  // For complex queries or natural language SQL, use AI
  if (isComplexQuery(queryAnalysis) || isNaturalLanguageQuery(sqlQuery)) {
    const result = await processWithAI(csvData, sqlQuery);
    return {
      resultData: result.processedCsvData,
      summary: result.summary,
      columnInfo: result.columnInfo,
    };
  }

  // For simple SELECT queries, use direct processing
  if (queryAnalysis.queryType === "SELECT" && !isComplexQuery(queryAnalysis)) {
    return executeSimpleSelect(csvData, sqlQuery, queryAnalysis);
  }

  // For other operations, use appropriate handlers
  switch (queryAnalysis.queryType) {
    case "UPDATE":
      return executeUpdate(csvData, sqlQuery);
    case "DELETE":
      return executeDelete(csvData, sqlQuery);
    default:
      throw new Error(`Unsupported query type: ${queryAnalysis.queryType}`);
  }
}

// 3. Result Processing
function generateColumnStatistics(resultData: string): ColumnInfo[] {
  const parseResult = Papa.parse(resultData, { header: true });
  const headers = parseResult.meta.fields || [];
  const rows = parseResult.data || [];

  return headers.map((columnName) => {
    // Extract values for this column
    const values = rows.map((row: any) => row[columnName]);

    // Count non-null values
    const nonNullCount = values.filter(
      (v) => v !== null && v !== undefined && v !== ""
    ).length;

    // Count unique values
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

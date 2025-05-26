# DataMaestro - Advanced Technical Architecture & Processing Flows

DataMaestro is a sophisticated AI-powered data processing engine designed for complex data cleaning, transformation, and analysis operations. This technical document provides an in-depth analysis of the system's internal architecture, data flows, and processing mechanisms.

## 1. System Architecture & Technical Stack

DataMaestro implements a multi-layered architecture with clear separation of concerns:

- **Frontend Layer**:

  - Next.js 15.3.2 (React 18.3.1) with TypeScript 5.x
  - Client-side state management via React hooks with optimized re-rendering
  - Event-driven component communication via callback patterns

- **UI Component Layer**:

  - Custom atomic design system built on Radix UI primitives
  - Tailwind CSS with JIT compilation for optimized CSS bundles
  - Dynamic component rendering based on processing states

- **AI Processing Layer**:

  - Genkit AI framework (v1.8.0) as abstraction layer for LLM operations
  - Primary: Google Gemini 2.0 Flash with API key authentication
  - Secondary: Local Ollama integration with Gemma3:4b model for offline processing
  - Structured prompt engineering with templating

- **Data Processing Layer**:
  - PapaParse for high-performance CSV parsing with streaming capabilities
  - Type-safe schema validation using Zod
  - Custom data transformation pipelines

## 2. Data Processing Pipeline & Core Workflows

### 2.1 Data Ingestion Workflow

```
[User Input] → [Input Validation] → [Format Detection] → [Initial Parsing] → [Metadata Extraction] → [State Storage]
```

1. **Data Entry Points**:

   - Binary file upload via `<input type="file">` in `fileInputRef` (CsvProcessing.tsx:38)
   - Direct text input via `<Textarea>` components with onChange handlers
   - Format auto-detection using content pattern analysis

2. **Parsing Process**:

   - CSV parsing with configurable options:

   ```typescript
   Papa.parse(input.csvData, {
     header: true,
     skipEmptyLines: true,
     dynamicTyping: false, // Keeps values as strings to prevent type coercion issues
   });
   ```

   - Header detection and normalization
   - Type inference with validation against expected schemas
   - Error collection and aggregation for user feedback

3. **Memory Management**:
   - Large files (>10MB) processed in chunks to prevent UI blocking
   - Streaming parser implementation for memory efficiency
   - Sample-based processing for initial analysis with 1000-row limit

### 2.2 AI Processing & Orchestration

```
[Input Data] → [Preprocessing] → [Model Selection] → [Prompt Construction] → [API Invocation] → [Response Parsing] → [Validation] → [State Update]
```

1. **AI Service Configuration** (`src/ai/ai-instance.ts`):

   ```typescript
   export const ai = genkit({
     promptDir: "./prompts",
     plugins: [
       googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY }),
       ollama({
         models: [{ name: "gemma3:4b", type: "generate" }],
         serverAddress: "http://127.0.0.1:11434",
       }),
     ],
     model: "googleai/gemini-2.0-flash",
   });
   ```

2. **Flow Architecture**:

   - Each AI capability encapsulated in dedicated "flow" modules
   - Strong typing with Zod schemas for input/output validation
   - Server-side execution pattern:

   ```typescript
   // Flow definition pattern
   const myFlow = ai.defineFlow(
     {
       name: "flowName",
       inputSchema: InputSchema,
       outputSchema: OutputSchema,
     },
     async (input) => {
       // Processing logic with error handling
       const { output } = await promptDefinition(input);
       return output;
     }
   );
   ```

3. **Model Selection Logic**:
   - Dynamic model switching based on user preference, data size, and complexity
   - Fallback mechanisms for API failures
   - Performance monitoring with processing time tracking

## 3. Feature-Specific Workflows

### 3.1 CSV Processing

The CSV processing is the core functionality with three distinct modes, each with a specialized technical implementation:

#### 3.1.1 Suggestion Mode Technical Architecture

```
[CSV Data] → [Data Sampling] → [AI Analysis] → [Suggestion Generation] → [User Review] → [Approval Tracking] → [Change Application]
```

1. **Data Analysis Engine**:

   - **Implementation**: `csv-cleaning-suggestions.ts` implements a sophisticated analysis pipeline
   - **Sampling Logic**:
     ```typescript
     // For large files, sample to prevent context window limits
     if (csvLines.length > MAX_SAMPLE_SIZE) {
       const header = csvLines[0];
       const dataLines = csvLines.slice(1);
       // Random sampling for representative analysis
       const sampledLines = [header];
       const sampleIndices = new Set();
       while (
         sampleIndices.size < Math.min(MAX_SAMPLE_SIZE - 1, dataLines.length)
       ) {
         sampleIndices.add(Math.floor(Math.random() * dataLines.length));
       }
       for (const idx of Array.from(sampleIndices).sort((a, b) => a - b)) {
         sampledLines.push(dataLines[idx]);
       }
       csvData = sampledLines.join("\n");
     }
     ```
   - **Pattern Recognition**: The AI identifies patterns including:
     - Missing values (null, empty strings, N/A variants)
     - Inconsistent formatting (dates, numbers, casing)
     - Outliers and anomalies
     - Data type inconsistencies
   - **Confidence Scoring**: Each suggestion receives a confidence score (0.0-1.0) based on:
     - Pattern consistency
     - Statistical significance
     - Context relevance

2. **User Review Interface**:

   - **Component**: `SuggestionItem.tsx` manages individual suggestion presentation
   - **State Management**:

     ```typescript
     export interface SuggestionWithStatus extends CleaningSuggestion {
       status: "pending" | "approved" | "rejected";
       selectedImputationMethod?: "mean" | "median" | "mode";
       userProvidedReplacement?: string;
     }

     // Tracking suggestions by source
     const [userInstructionSuggestions, setUserInstructionSuggestions] =
       useState<SuggestionWithStatus[]>([]);
     const [generalSuggestions, setGeneralSuggestions] = useState<
       SuggestionWithStatus[]
     >([]);

     // Tracking applied suggestions for iterative processing
     const [appliedSuggestionIds, setAppliedSuggestionIds] = useState<
       Set<string>
     >(new Set());
     ```

   - **User Controls**: For numerical data, specialized imputation controls:

     ```typescript
     // For FILL_MISSING_NUMERIC, calculate statistics for imputation options
     const stats = useMemo(() => {
       if (
         suggestion.actionType === "FILL_MISSING_NUMERIC" &&
         currentCsvData &&
         suggestion.columnName
       ) {
         return calculateFrontendNumericStats(
           currentCsvData,
           suggestion.columnName
         );
       }
       return null;
     }, [suggestion, currentCsvData]);

     // Render imputation options with calculated values
     <Select
       onValueChange={(value) =>
         setSelectedImputationMethod(value as ImputationMethod)
       }
     >
       <SelectItem value="mean">Mean: {stats?.mean.toFixed(2)}</SelectItem>
       <SelectItem value="median">
         Median: {stats?.median.toFixed(2)}
       </SelectItem>
       <SelectItem value="mode">Mode: {stats?.mode.toFixed(2)}</SelectItem>
     </Select>;
     ```

3. **Change Application Engine**:
   - **Implementation**: `apply-csv-changes.ts` handles the transformation logic
   - **Processing Strategy**:
     - Group suggestions by type for optimized processing
     - Process column-wide operations first (e.g., all missing values in a column)
     - Process row-specific operations in order
   - **State Management**:

     ```typescript
     // Track processing state
     const [isApplyingChanges, setIsApplyingChanges] = useState(false);
     const [finalCleanedResult, setFinalCleanedResult] =
       useState<ApplyCsvApprovedChangesOutput | null>(null);

     // Enable iterative processing mode
     const [isIterativeProcessing, setIsIterativeProcessing] = useState(false);
     const [originalDataForFlow, setOriginalDataForFlow] = useState<
       string | null
     >(null);
     ```

#### 3.1.2 Direct Command Mode Technical Architecture

```
[Command Input] → [Command Parsing] → [Pattern Matching] → [Processing Strategy Selection] → [Direct Processing | AI Processing] → [Data Transformation]
```

1. **Command Interpretation Engine**:

   - **Primary Implementation**: `csv-direct-commands.ts` for AI interpretation
   - **Fallback Implementation**: `csv-direct-processor.ts` for regex-based processing
   - **Command Classification**:
     - Fill missing values commands
     - Replace/standardize values commands
     - Filter/remove rows commands
     - Transform column commands
     - Advanced pattern-based commands

2. **Command Processing Logic**:

   - **Pattern Matching First**:

     ```typescript
     // Example pattern for fill missing values command
     const fillPatterns = [
       /fill\s+(?:the\s+|all\s+)?missing\s+(?:values\s+)?(?:in\s+)?(?:(?:column|field|the\s+column)\s+)?['"]*([^'"]+)['"]*\s+(?:with|to)\s+['"]*([^'"]*)['"]*(?:\s|$)/i,
       // Additional patterns for various phrasings
       /fill\s+(?:the\s+|all\s+)?(?:null|nulls|null\s+values|empty|empty\s+values?)(?:\s+in\s+|\s+of\s+|\s+for\s+|\s+from\s+)?(?:(?:column|field|the\s+column)\s+)?['"]*([^'"]+)['"]*\s+(?:with|to)\s+['"]*([^'"]*)['"]*(?:\s|$)/i,
     ];

     // Try to match common patterns first for performance
     for (const pattern of fillPatterns) {
       const match = command.match(pattern);
       if (match) {
         // Extract column name and value for filling
         const columnName = match[1].trim();
         const fillValue = match[2].trim();

         // Validate column exists
         const actualColumn = headers.find(
           (h) => h.toLowerCase() === columnName.toLowerCase()
         );
         if (!actualColumn) {
           errorMessages.push(`Column "${columnName}" not found in CSV`);
           continue;
         }

         // Apply the fill operation
         let affectedRows = 0;
         data = data.map((row) => {
           if (!row[actualColumn] || String(row[actualColumn]).trim() === "") {
             affectedRows++;
             return { ...row, [actualColumn]: fillValue };
           }
           return row;
         });

         // Track the action
         appliedActions.push({
           description: `Filled ${affectedRows} missing values in column "${actualColumn}" with "${fillValue}"`,
           affectedRows,
           affectedColumns: [actualColumn],
         });

         // Command matched and processed
         actionsApplied++;
         rowsModified += affectedRows;
         continue mainCommandLoop;
       }
     }
     ```

   - **AI Fallback**: For unmatched or complex commands
     ```typescript
     // If no pattern matched, use AI processing
     if (actionsApplied === 0) {
       try {
         // Process with AI-assisted interpretation
         const aiResult = await processWithAI(csvData, command, headers);

         // Merge results
         appliedActions.push(...aiResult.appliedActions);
         errorMessages.push(...(aiResult.errorMessages || []));

         // Use AI-processed data
         data = aiResult.processedData;
         rowsModified = aiResult.affectedRows;
       } catch (error) {
         console.error("AI processing error:", error);
         errorMessages.push(`AI processing failed: ${error.message}`);
       }
     }
     ```

3. **Performance Optimization**:
   - Fast path for common commands using regex patterns
   - Pattern matching ordered by frequency for optimal performance
   - AI processing as fallback for complex or ambiguous commands
   - Hybrid approach provides both performance and flexibility

#### 3.1.3 SQL Mode Technical Architecture

```
[SQL Query] → [Query Validation] → [Schema Extraction] → [Execution Planning] → [Direct SQL Execution | AI Query Processing] → [Result Generation]
```

1. **SQL Parsing Engine**:

   - **Primary Implementation**: `csv-sql-processing.ts`
   - **Direct SQL Implementation**: `csv-direct-sql-processor.ts`
   - **Query Validation**:
     - SQL syntax checking
     - Column name validation against CSV headers
     - Query complexity analysis

2. **Execution Strategy**:

   - **Direct Execution Pipeline**:
     ```typescript
     function directSqlExecution(
       query: string,
       csvData: string
     ): ProcessingResult {
       // Parse CSV to get headers and data
       const { headers, data } = parseCsvToObjects(csvData);

       // Convert SQL to execution plan
       const plan = parseSqlToExecutionPlan(query, headers);

       // Execute the plan
       let result = data;

       // Apply where clauses (filtering)
       if (plan.filters.length > 0) {
         result = applyFilters(result, plan.filters);
       }

       // Apply projections (select columns)
       if (plan.projections.length > 0) {
         result = applyProjections(result, plan.projections);
       }

       // Apply sorting
       if (plan.orderBy.length > 0) {
         result = applyOrderBy(result, plan.orderBy);
       }

       // Apply limit
       if (plan.limit !== null) {
         result = result.slice(0, plan.limit);
       }

       // Convert result back to CSV
       return {
         processedCsvData: unparseToCSV(
           result,
           getResultHeaders(plan, headers)
         ),
         affectedRows: result.length,
         summary: `Executed SQL query, returned ${result.length} rows`,
       };
     }
     ```
   - **AI Assistance Pipeline**:
     - Natural language to SQL translation
     - Complex query handling
     - Error correction and suggestions

3. **Result Generation**:
   - Typed result set based on inferred schema
   - Performance metrics (execution time, rows affected)
   - Error reporting with suggested fixes

### 3.2 Data Profiling

1. **Data Analysis**:

   - `data-profiling.ts` flow analyzes CSV or JSON data
   - Generates statistical summaries, distributions, correlations
   - Identifies data types and patterns

2. **Visualization**:
   - Results are displayed with formatting and charts
   - Key statistics are highlighted
   - Format detection determines appropriate analysis methods

### 3.3 Anomaly Detection

1. **Anomaly Identification**:

   - `data-anomaly-detection.ts` flow scans data for outliers and anomalies
   - AI determines what constitutes an anomaly based on context
   - Confidence scores are assigned to potential anomalies

2. **User Validation**:
   - Anomalies are presented for user review
   - User can approve/reject detected anomalies
   - Callbacks track decisions for the evaluation dashboard

### 3.4 Data Standardization

1. **Standardization Analysis**:

   - `data-standardization.ts` flow identifies inconsistent formatting
   - Suggests standardized formats for dates, numbers, text, etc.
   - Provides confidence scores for suggestions

2. **User Approval**:
   - Standardization suggestions are presented for review
   - User approves/rejects each suggestion
   - Feedback is tracked for the evaluation dashboard

### 3.5 English Correction

1. **Text Analysis**:

   - `english-correction.ts` flow analyzes text input
   - Identifies grammatical errors, awkward phrasing, etc.
   - Generates corrected text while preserving meaning

2. **Correction Display**:
   - Original and corrected text are displayed side by side
   - Differences are highlighted for easy comparison

## 4. Data Flow & State Management Architecture

### 4.1 Core Data Flow Architecture

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Component Layer │       │ Processing Layer│       │ AI Service Layer│
│                 │       │                 │       │                 │
│ - User Interface│◄─────►│ - Data Transform│◄─────►│ - Model Access  │
│ - State Mgmt    │       │ - Business Logic│       │ - Prompt Exec   │
│ - Event Handling│       │ - Validation    │       │ - Response Parse│
└─────────────────┘       └─────────────────┘       └─────────────────┘
        │                         │                         │
        │                         │                         │
        ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ UI Components   │       │ Data Structures │       │ AI Schemas      │
│                 │       │                 │       │                 │
│ - Input Controls│       │ - CSV Parsing   │       │ - Input Schema  │
│ - Visualization │       │ - State Objects │       │ - Output Schema │
│ - User Feedback │       │ - Type Safety   │       │ - Validation    │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### 4.2 Component Communication Architecture

1. **Callback Registration Pattern**:

   ```typescript
   // In page.tsx (parent component)
   const handleAnomalyValidation = useCallback(
     (anomaly: AnomalyWithStatus, processingTime: number) => {
       // Update session metrics
       setSessionStats((prev) => ({
         ...prev,
         anomalyDetection: {
           processed: prev.anomalyDetection.processed + 1,
           approved:
             prev.anomalyDetection.approved +
             (anomaly.status === "approved" ? 1 : 0),
           rejected:
             prev.anomalyDetection.rejected +
             (anomaly.status === "rejected" ? 1 : 0),
           totalProcessingTime:
             prev.anomalyDetection.totalProcessingTime + processingTime,
         },
       }));

       // Log rejected items for improvement analysis
       if (anomaly.status === "rejected") {
         setLoggedIssues((prev) => [
           {
             id: `anomaly-${Date.now()}-${Math.random()}`,
             timestamp: Date.now(),
             feature: "Anomaly Detection",
             field: anomaly.field,
             originalValue: `Data Context: ${anomaly.description.substring(
               0,
               50
             )}...`,
             suggestion: anomaly.suggestedCorrection,
             status: "rejected",
           },
           ...prev,
         ]);
       }
     },
     []
   );

   // Passing callback to child component
   <DataAnomalyDetection onValidation={handleAnomalyValidation} />;
   ```

2. **Child Component Implementation**:

   ```typescript
   // In DataAnomalyDetection.tsx (child component)
   interface DataAnomalyDetectionProps {
     onValidation?: (
       anomaly: AnomalyWithStatus,
       processingTime: number
     ) => void;
   }

   export default function DataAnomalyDetection({
     onValidation,
   }: DataAnomalyDetectionProps) {
     // Component state and logic

     const handleDecision = (
       anomaly: AnomalyWithStatus,
       decision: "approved" | "rejected"
     ) => {
       // Update local state
       const updatedAnomaly = { ...anomaly, status: decision };
       setProcessedAnomalies((prev) => [...prev, updatedAnomaly]);

       // Calculate processing time for metrics
       const processingTime = Date.now() - startProcessingTime;

       // Notify parent component via callback
       if (onValidation) {
         onValidation(updatedAnomaly, processingTime);
       }
     };

     // Render UI
   }
   ```

3. **Event Flow Architecture**:
   - User interaction in child component triggers local state update
   - Child component calls parent-provided callback with updated data
   - Parent component updates global application state
   - State changes trigger re-rendering of affected components
   - Performance optimization through memoization and dependency tracking

### 4.3 State Management Technical Implementation

1. **State Hierarchy**:

   - **Application-level state** (in `page.tsx`):
     - Session statistics (`sessionStats`)
     - Logged issues (`loggedIssues`)
     - Navigation state
   - **Feature-level state** (in feature components):
     - Processing status
     - Input/output data
     - User interactions
   - **Component-level state** (in UI components):
     - UI state (expanded/collapsed)
     - Form values
     - Validation state

2. **State Update Patterns**:

   ```typescript
   // Immutable state updates using functional updates
   const handleApprove = (id: string) => {
     // Update suggestions immutably
     setSuggestions((prevSuggestions) =>
       prevSuggestions.map((suggestion) =>
         suggestion.id === id
           ? { ...suggestion, status: "approved" }
           : suggestion
       )
     );

     // Update tracking sets immutably
     setApprovedIds((prevIds) => new Set([...prevIds, id]));
   };
   ```

3. **State Optimization Techniques**:
   - Function memoization with `useCallback`
   - Value memoization with `useMemo`
   - Dependency array optimization
   - Selective re-rendering with React.memo
   - State access optimization with context selectors

### 4.4 Data Processing Flow

```
┌─────────────┐    ┌──────────────┐    ┌────────────────┐    ┌───────────────┐
│ Raw Data    │───►│ Preprocessing│───►│ AI Processing  │───►│ Post-process  │
│ (CSV/JSON)  │    │ (Parse/Clean)│    │ (Analysis/Gen) │    │ (Format/Valid)│
└─────────────┘    └──────────────┘    └────────────────┘    └───────────────┘
                           │                                         │
                           │                                         │
                           ▼                                         ▼
                    ┌──────────────┐                         ┌───────────────┐
                    │ User Review  │◄────────────────────────│ Result Display│
                    │ (Interact)   │                         │ (Render/UI)   │
                    └──────────────┘                         └───────────────┘
                           │                                         ▲
                           │                                         │
                           ▼                                         │
                    ┌──────────────┐    ┌────────────────┐    ┌───────────────┐
                    │ User Decision│───►│ Data Transform │───►│ Final Output  │
                    │ (Approve/Rej)│    │ (Apply Changes)│    │ (CSV/Analysis)│
                    └──────────────┘    └────────────────┘    └───────────────┘
```

1. **Data Flow Implementation**:

   ```typescript
   // Pseudocode showing the core data flow
   async function processDataFlow(
     inputData: string
   ): Promise<ProcessingResult> {
     try {
       // 1. Preprocessing
       const parsedData = parseInputData(inputData);
       const cleanedData = preprocessData(parsedData);

       // 2. AI Processing
       const analysisPrompt = buildAnalysisPrompt(cleanedData);
       const aiResponse = await callAiModel(analysisPrompt);
       const structuredResults = parseAiResponse(aiResponse);

       // 3. Post-processing
       const validatedResults = validateResults(structuredResults, parsedData);
       const formattedResults = formatForDisplay(validatedResults);

       // 4. Display results to user and collect decisions
       displayResults(formattedResults);
       const userDecisions = await collectUserDecisions();

       // 5. Apply transformations based on decisions
       const transformedData = applyTransformations(parsedData, userDecisions);

       // 6. Generate final output
       return generateFinalOutput(transformedData, userDecisions);
     } catch (error) {
       // Error handling with appropriate fallbacks
       return handleProcessingError(error, inputData);
     }
   }
   ```

2. **Error Handling & Recovery**:
   - Try/catch blocks at critical processing stages
   - Fallback strategies for AI failures
   - Graceful degradation to simpler processing
   - User feedback on errors with actionable information

### 4.5 Evaluation & Analytics Architecture

1. **Metrics Collection System**:

   - Performance metrics (processing time, AI response time)
   - User interaction metrics (approvals, rejections)
   - Error metrics (failure rates, error types)
   - Feature usage metrics (most used functions)

2. **Dashboard Implementation**:

   ```typescript
   // EvaluationDashboard.tsx
   interface EvaluationDashboardProps {
     stats: SessionStats;
   }

   export default function EvaluationDashboard({
     stats,
   }: EvaluationDashboardProps) {
     // Calculate derived metrics
     const approvalRate = useMemo(() => {
       const anomalyRate =
         stats.anomalyDetection.processed > 0
           ? (stats.anomalyDetection.approved /
               stats.anomalyDetection.processed) *
             100
           : 0;

       const standardizationRate =
         stats.standardization.processed > 0
           ? (stats.standardization.approved /
               stats.standardization.processed) *
             100
           : 0;

       return {
         anomaly: anomalyRate.toFixed(1),
         standardization: standardizationRate.toFixed(1),
       };
     }, [stats]);

     // Calculate average processing times
     const avgProcessingTime = useMemo(() => {
       return {
         anomaly:
           stats.anomalyDetection.processed > 0
             ? (
                 stats.anomalyDetection.totalProcessingTime /
                 stats.anomalyDetection.processed
               ).toFixed(0)
             : "0",
         standardization:
           stats.standardization.processed > 0
             ? (
                 stats.standardization.totalProcessingTime /
                 stats.standardization.processed
               ).toFixed(0)
             : "0",
       };
     }, [stats]);

     // Render charts and metrics
     // ...
   }
   ```

3. **Issue Logging System**:

   ```typescript
   // IssueLog.tsx
   interface IssueLogProps {
     issues: LoggedIssue[];
   }

   export default function IssueLog({ issues }: IssueLogProps) {
     // Group issues by feature
     const issuesByFeature = useMemo(() => {
       const grouped: Record<string, LoggedIssue[]> = {};

       issues.forEach((issue) => {
         if (!grouped[issue.feature]) {
           grouped[issue.feature] = [];
         }
         grouped[issue.feature].push(issue);
       });

       return grouped;
     }, [issues]);

     // Process for display
     // ...
   }
   ```

4. **Analytics Integration**:
   - Performance monitoring with time tracking
   - User decision tracking for model improvement
   - Issue categorization for targeted enhancements

## 5. Technical Implementation Details

### 5.1 AI Integration Architecture

```
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│ Input Preparation │     │ Model Selection   │     │ Prompt Engineering│
│                   │     │                   │     │                   │
│ - Data Sampling   │────►│ - User Selection  │────►│ - Template System │
│ - Type Conversion │     │ - Fallback Logic  │     │ - Context Mgmt    │
│ - Schema Mapping  │     │ - API Config      │     │ - Instruction Set │
└───────────────────┘     └───────────────────┘     └───────────────────┘
          │                         │                         │
          │                         │                         │
          ▼                         ▼                         ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│ Request Formation │     │ API Communication │     │ Response Handling │
│                   │     │                   │     │                   │
│ - JSON Payload    │────►│ - Async API Call  │────►│ - Schema Validation│
│ - Headers         │     │ - Retry Logic     │     │ - Error Handling  │
│ - Timeout Config  │     │ - Rate Limiting   │     │ - Result Processing│
└───────────────────┘     └───────────────────┘     └───────────────────┘
```

1. **Prompt Engineering Architecture**:

   ```typescript
   // Example from csv-cleaning-suggestions.ts
   const suggestCsvCleaningActionsPrompt = ai.definePrompt({
     name: "suggestCsvCleaningActionsPrompt",
     input: { schema: SuggestCsvCleaningActionsInputSchema },
     output: { schema: SuggestCsvCleaningActionsOutputSchema },
     prompt: `You are an expert data cleaning specialist. Your task is to analyze the provided CSV data and suggest specific, actionable, and non-redundant cleaning actions.
   Provide a confidence score (0.0-1.0) and a priority (low, medium, high) for each suggestion.
   
   **CRITICAL INSTRUCTIONS:**
   1.  **CONSOLIDATION:** For any issue type that affects multiple rows within the *same column* (e.g., missing values, format standardization, common typo patterns, inconsistent casing), generate **ONLY ONE SINGLE SUGGESTION** for that combination of column and issue type.
       *   For these consolidated, column-wide suggestions, **OMIT** the 'rowNumber' field.
       *   'originalFragment' should be a descriptive summary (e.g., "Missing values in '[columnName]'", "Varied date formats in '[columnName]'", "Inconsistent casing like 'active', 'Active' in '[columnName]'").
       *   'columnName' **MUST** be specified for these column-wide suggestions.
       *   Estimate 'affectedRows' based on the CSV sample.
   
   // Detailed instructions continue...
   
   Input CSV Data (sample or full):
   \`\`\`csv
   {{{csvData}}}
   \`\`\`
   
   {{#if cleaningInstructions}}
   Specific Cleaning Instructions from User (Prioritize these strictly):
   "{{{cleaningInstructions}}}"
   {{/if}}
   
   // Additional instructions for specific scenarios...
   `,
   });
   ```

2. **Model Selection & Failover System**:

   ```typescript
   // From CsvProcessing.tsx
   const handleProcessOperation = async () => {
     setIsProcessing(true);
     setError(null);

     try {
       // Determine which model to use
       let modelToUse: string | undefined;

       switch (selectedModel) {
         case LlmModel.GEMINI:
           modelToUse = geminiModel;
           break;
         case LlmModel.OLLAMA:
           modelToUse = ollamaModel;
           break;
         case LlmModel.DEFAULT:
         default:
           modelToUse = undefined; // Use default from AI instance
       }

       // Primary model attempt
       try {
         const result = await processFunction({
           // Input parameters
           csvData: currentCsvData,
           instructions: userInstructions,
           modelId: modelToUse,
         });

         setResult(result);
         return;
       } catch (primaryError) {
         console.warn("Primary model failed:", primaryError);

         // If selected model was already default, don't try again
         if (selectedModel === LlmModel.DEFAULT) {
           throw primaryError;
         }

         // Fallback to default model
         console.log("Attempting fallback to default model");
         const result = await processFunction({
           // Same parameters without specific model
           csvData: currentCsvData,
           instructions: userInstructions,
         });

         setResult(result);
         toast({
           title: "Fallback Model Used",
           description: "Primary model failed, used default model instead.",
           variant: "default",
         });
       }
     } catch (error) {
       console.error("Processing failed:", error);
       setError(error.message || "Unknown error occurred");

       // Try rule-based fallback if applicable
       if (hasRuleBasedFallback && currentCsvData) {
         try {
           const fallbackResult = await ruleBasedProcess(
             currentCsvData,
             userInstructions
           );
           setResult(fallbackResult);
           toast({
             title: "AI Processing Failed",
             description: "Used rule-based processing as fallback.",
             variant: "default",
           });
         } catch (fallbackError) {
           // Both AI and rule-based failed
           console.error("Rule-based fallback also failed:", fallbackError);
         }
       }
     } finally {
       setIsProcessing(false);
     }
   };
   ```

3. **Schema Validation & Type Safety**:
   ```typescript
   // From schemas/csv-schemas.ts
   export const CleaningSuggestionSchema = z.object({
     id: z.string().describe("A unique identifier for this suggestion."),
     userInstructionId: z
       .string()
       .optional()
       .describe(
         "For user_instruction source suggestions, the ID of the specific user instruction this is addressing."
       ),
     description: z
       .string()
       .describe(
         "A human-readable description of the issue and suggested cleaning action."
       ),
     rowNumber: z
       .number()
       .optional()
       .describe(
         "The specific row number (1-indexed) if this is a row-specific issue. Omit for column-wide suggestions."
       ),
     columnName: z
       .string()
       .optional()
       .describe(
         "The name of the column containing the issue. Required for all action types except REMOVE_ROW based on non-column-specific conditions."
       ),
     originalFragment: z
       .string()
       .describe(
         "For row-specific: the problematic value. For column-wide: a descriptive summary of the issue pattern."
       ),
     suggestedFragment: z
       .string()
       .describe(
         'The suggested replacement/standardized value, or "CALCULATE" for FILL_MISSING_NUMERIC if multiple imputation methods are possible.'
       ),
     actionType: z
       .enum([
         "MODIFY_CELL",
         "FILL_MISSING",
         "FILL_MISSING_NUMERIC",
         "STANDARDIZE_FORMAT",
         "REMOVE_ROW",
         "REVIEW_CONSISTENCY",
       ])
       .describe("The type of cleaning action to perform."),
     imputationMethod: z
       .enum(["mean", "median", "mode"])
       .optional()
       .describe(
         "For FILL_MISSING_NUMERIC, the suggested statistical method to use."
       ),
     rationale: z
       .string()
       .optional()
       .describe("The reasoning behind this suggestion."),
     source: z
       .enum(["user_instruction", "general_suggestion"])
       .describe(
         "Whether this suggestion is directly addressing user instructions or is a general data quality suggestion."
       ),
     confidence: z
       .number()
       .min(0)
       .max(1)
       .optional()
       .describe(
         "A confidence score between 0.0-1.0 indicating how certain the system is about this suggestion."
       ),
     priority: z
       .enum(["low", "medium", "high"])
       .optional()
       .describe("The suggested priority for addressing this issue."),
     affectedRows: z
       .number()
       .optional()
       .describe(
         "An estimate of how many rows this suggestion will affect if approved."
       ),
     userProvidedReplacement: z
       .string()
       .optional()
       .describe(
         "If the user wants to specify their own replacement value instead of the suggested one."
       ),
   });
   ```

### 5.2 Error Handling & Recovery Architecture

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Error Sources │     │ Error Types   │     │ Error Handling│     │ Recovery      │
│               │     │               │     │               │     │               │
│ - API Errors  │────►│ - Network     │────►│ - Try/Catch   │────►│ - Retry Logic │
│ - User Input  │     │ - Validation  │     │ - Error UI    │     │ - Fallbacks   │
│ - Processing  │     │ - Timeout     │     │ - Logging     │     │ - Graceful UI │
└───────────────┘     └───────────────┘     └───────────────┘     └───────────────┘
```

1. **Error Classification System**:

   ```typescript
   // Error types and handling
   class ApiConnectionError extends Error {
     constructor(message: string, public originalError: unknown) {
       super(`API Connection Error: ${message}`);
       this.name = "ApiConnectionError";
     }
   }

   class ValidationError extends Error {
     constructor(
       message: string,
       public fieldErrors?: Record<string, string[]>
     ) {
       super(`Validation Error: ${message}`);
       this.name = "ValidationError";
     }
   }

   class ProcessingError extends Error {
     constructor(
       message: string,
       public phase: "parsing" | "analysis" | "transformation"
     ) {
       super(`Processing Error (${phase}): ${message}`);
       this.name = "ProcessingError";
     }
   }
   ```

2. **Comprehensive Error Handling**:

   ```typescript
   async function processWithErrorHandling(
     data: string
   ): Promise<ProcessingResult> {
     try {
       // Phase 1: Parsing
       let parsedData;
       try {
         parsedData = parseData(data);
       } catch (parseError) {
         throw new ProcessingError(
           `Failed to parse input data: ${parseError.message}`,
           "parsing"
         );
       }

       // Phase 2: AI Analysis
       let analysisResult;
       try {
         analysisResult = await callAiService(parsedData);
       } catch (apiError) {
         if (
           apiError.code === "ECONNREFUSED" ||
           apiError.code === "ETIMEDOUT"
         ) {
           throw new ApiConnectionError(
             "Could not connect to AI service. Please check your connection.",
             apiError
           );
         }

         // Specific error for rate limiting
         if (apiError.status === 429) {
           throw new ApiConnectionError(
             "AI service rate limit exceeded. Please try again later.",
             apiError
           );
         }

         // Try fallback if main API fails
         try {
           console.warn("Primary API failed, trying fallback API");
           analysisResult = await callFallbackAiService(parsedData);
         } catch (fallbackError) {
           throw new ApiConnectionError(
             "Both primary and fallback AI services failed.",
             { primary: apiError, fallback: fallbackError }
           );
         }
       }

       // Phase 3: Result Validation
       if (!analysisResult || !Array.isArray(analysisResult.suggestions)) {
         throw new ValidationError(
           "Invalid response from AI service: missing or malformed suggestions",
           {
             suggestions: [
               "Expected array but got " + typeof analysisResult.suggestions,
             ],
           }
         );
       }

       // Phase 4: Processing
       return transformResults(parsedData, analysisResult);
     } catch (error) {
       // Log all errors
       console.error("Processing pipeline error:", error);

       // Determine user-friendly message and recovery options
       let userMessage = "An unexpected error occurred";
       let recoveryOptions = null;

       if (error instanceof ApiConnectionError) {
         userMessage = `Connection issue: ${error.message}`;
         recoveryOptions = {
           canRetry: true,
           canUseFallback: true,
           fallbackType: "rule-based",
         };
       } else if (error instanceof ValidationError) {
         userMessage = `Data validation error: ${error.message}`;
         recoveryOptions = {
           canRetry: false,
           canEditInput: true,
           validationErrors: error.fieldErrors,
         };
       } else if (error instanceof ProcessingError) {
         userMessage = `Processing error in ${error.phase} phase: ${error.message}`;
         recoveryOptions = {
           canRetry: error.phase !== "parsing",
           canEditInput: error.phase === "parsing",
           canUseFallback: error.phase === "analysis",
         };
       }

       // Return error result with recovery options
       return {
         success: false,
         error: userMessage,
         recovery: recoveryOptions,
       };
     }
   }
   ```

3. **Fallback Mechanisms**:
   - AI model fallbacks (primary → secondary → rule-based)
   - Processing strategy fallbacks (complex → simple)
   - UI degradation for partial results

### 5.3 Performance Optimization Techniques

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Data          │     │ Processing    │     │ UI            │     │ Network       │
│ Optimization  │     │ Optimization  │     │ Optimization  │     │ Optimization  │
│               │     │               │     │               │     │               │
│ - Sampling    │────►│ - Batching    │────►│ - Virtualized │────►│ - Caching    │
│ - Chunking    │     │ - Web Workers │     │   Lists       │     │ - Compression │
│ - Indexing    │     │ - Memoization │     │ - Lazy Loading│     │ - Debouncing  │
└───────────────┘     └───────────────┘     └───────────────┘     └───────────────┘
```

1. **Data Processing Optimization**:

   ```typescript
   // Efficient CSV processing with sampling
   function processLargeCsvData(
     csvData: string,
     processingFn: (chunk: string) => Promise<ProcessingResult>
   ): Promise<ProcessingResult[]> {
     return new Promise(async (resolve, reject) => {
       try {
         const lines = csvData.split("\n");
         const header = lines[0];
         const dataLines = lines.slice(1);

         // For very large files, process in chunks
         const CHUNK_SIZE = 1000;
         const results: ProcessingResult[] = [];

         if (dataLines.length <= CHUNK_SIZE) {
           // Small enough to process in one go
           const result = await processingFn(csvData);
           resolve([result]);
           return;
         }

         // Process header + sample for initial analysis
         const sampleSize = Math.min(CHUNK_SIZE, dataLines.length);
         const sampleLines = [];
         const sampleIndices = new Set<number>();

         // Stratified sampling - get some from beginning, middle, and end
         const beginCount = Math.floor(sampleSize * 0.4);
         const middleCount = Math.floor(sampleSize * 0.2);
         const endCount = sampleSize - beginCount - middleCount;

         // Beginning rows
         for (let i = 0; i < beginCount; i++) {
           sampleIndices.add(i);
         }

         // Middle rows
         const middleStart =
           Math.floor(dataLines.length / 2) - Math.floor(middleCount / 2);
         for (let i = 0; i < middleCount; i++) {
           sampleIndices.add(middleStart + i);
         }

         // End rows
         for (let i = 0; i < endCount; i++) {
           sampleIndices.add(dataLines.length - endCount + i);
         }

         // Build sample CSV
         sampleLines.push(header);
         Array.from(sampleIndices)
           .sort((a, b) => a - b)
           .forEach((idx) => {
             sampleLines.push(dataLines[idx]);
           });

         const sampleCsv = sampleLines.join("\n");

         // Process sample first
         const sampleResult = await processingFn(sampleCsv);
         results.push(sampleResult);

         // Now process rest in chunks if needed
         if (requiresFullProcessing(sampleResult)) {
           // Split remaining data into chunks and process
           for (let i = 0; i < dataLines.length; i += CHUNK_SIZE) {
             const chunk = [header]
               .concat(dataLines.slice(i, i + CHUNK_SIZE))
               .join("\n");
             const chunkResult = await processingFn(chunk);
             results.push(chunkResult);

             // Report progress
             onProgressUpdate?.(
               Math.min(
                 100,
                 Math.round(((i + CHUNK_SIZE) / dataLines.length) * 100)
               )
             );
           }
         }

         resolve(results);
       } catch (error) {
         reject(error);
       }
     });
   }
   ```

2. **React Performance Optimization**:

   ```typescript
   // Optimized component with memoization
   const SuggestionList = React.memo(function SuggestionList({
     suggestions,
     onAction,
   }: SuggestionListProps) {
     // Memoize filtered lists to prevent re-computation
     const pendingSuggestions = useMemo(
       () => suggestions.filter((s) => s.status === "pending"),
       [suggestions]
     );

     const approvedSuggestions = useMemo(
       () => suggestions.filter((s) => s.status === "approved"),
       [suggestions]
     );

     const rejectedSuggestions = useMemo(
       () => suggestions.filter((s) => s.status === "rejected"),
       [suggestions]
     );

     // Memoize handlers to prevent recreation
     const handleAction = useCallback(
       (id: string, action: "approve" | "reject") => {
         onAction(id, action);
       },
       [onAction]
     );

     // Only re-render list items that change
     return (
       <div>
         <h3>Pending ({pendingSuggestions.length})</h3>
         <VirtualizedList
           items={pendingSuggestions}
           itemHeight={80}
           renderItem={(suggestion) => (
             <SuggestionItem
               key={suggestion.id}
               suggestion={suggestion}
               onAction={handleAction}
             />
           )}
         />

         {/* Similar rendering for approved and rejected */}
       </div>
     );
   },
   arePropsEqual);

   // Custom equality function for preventing unnecessary re-renders
   function arePropsEqual(
     prevProps: SuggestionListProps,
     nextProps: SuggestionListProps
   ) {
     // Only re-render if the actual suggestions array references changed
     // or if the callback reference changed
     return (
       prevProps.suggestions === nextProps.suggestions &&
       prevProps.onAction === nextProps.onAction
     );
   }
   ```

3. **Network & API Optimization**:

   ```typescript
   // Optimized API calling with caching and debouncing
   const apiCallCache = new Map<string, { result: any; timestamp: number }>();

   async function callApiWithOptimization(
     endpoint: string,
     payload: any,
     options?: ApiOptions
   ): Promise<any> {
     // Generate cache key based on endpoint and payload
     const cacheKey = `${endpoint}:${JSON.stringify(payload)}`;

     // Check cache if caching is enabled
     if (options?.enableCaching !== false) {
       const cached = apiCallCache.get(cacheKey);
       if (
         cached &&
         (Date.now() - cached.timestamp < options?.cacheTTL || 60000)
       ) {
         console.log(`Cache hit for ${endpoint}`);
         return cached.result;
       }
     }

     try {
       const result = await fetchWithRetry(
         endpoint,
         {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
             ...(options?.headers || {}),
           },
           body: JSON.stringify(payload),
         },
         options?.retryCount || 3
       );

       // Cache the result if caching is enabled
       if (options?.enableCaching !== false) {
         apiCallCache.set(cacheKey, {
           result,
           timestamp: Date.now(),
         });

         // Prune cache if it gets too large
         if (apiCallCache.size > 100) {
           const oldestEntries = Array.from(apiCallCache.entries())
             .sort((a, b) => a[1].timestamp - b[1].timestamp)
             .slice(0, 20);

           for (const [key] of oldestEntries) {
             apiCallCache.delete(key);
           }
         }
       }

       return result;
     } catch (error) {
       console.error(`API call to ${endpoint} failed:`, error);
       throw error;
     }
   }

   // Implement fetch with retry logic
   async function fetchWithRetry(
     url: string,
     options: RequestInit,
     retries: number
   ): Promise<any> {
     try {
       const response = await fetch(url, options);

       if (!response.ok) {
         throw new Error(
           `HTTP error ${response.status}: ${response.statusText}`
         );
       }

       return await response.json();
     } catch (error) {
       if (retries <= 0) {
         throw error;
       }

       // Exponential backoff
       const delay = Math.pow(2, 4 - retries) * 100;
       console.log(`Retrying fetch to ${url} after ${delay}ms...`);

       await new Promise((resolve) => setTimeout(resolve, delay));
       return fetchWithRetry(url, options, retries - 1);
     }
   }
   ```

## 6. UI/UX Implementation

1. **Component Structure**:

   - Main page (`page.tsx`) defines the layout and navigation
   - Feature-specific components handle individual functionality
   - Shared UI components provide consistent styling

2. **Responsive Design**:

   - Sidebar adapts to screen size
   - Card layouts reflow for mobile devices
   - Font sizes and spacing are responsive

3. **User Feedback**:
   - Toast notifications for operation status
   - Loading indicators during processing
   - Error messages with actionable information

## 7. Deployment & Runtime Environment

1. **Next.js Application**:

   - Server-side rendering for initial page load
   - Client-side navigation for smooth transitions
   - API routes for server-side processing

2. **AI Model Hosting**:

   - Google Gemini models accessed via API
   - Ollama models run locally (requires local installation)
   - Model switching handled seamlessly

3. **Firebase Integration**:
   - Potential for authentication and data persistence
   - Configuration in `firebase.json`

## 8. Future Extension Points

1. **Additional Processing Modes**:

   - Integration with more specialized models
   - Support for additional data formats
   - Advanced visualization capabilities

2. **Collaboration Features**:

   - Multi-user feedback collection
   - Shared datasets and processing history
   - Team-based evaluation dashboards

3. **Learning from Feedback**:
   - Adaptive AI based on user decisions
   - Personalized suggestion prioritization
   - Historical processing patterns

## 9. Complete Processing Lifecycle Example

### 9.1 Detailed Technical Flow Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ User Input      │       │ Data Parsing    │       │ AI Processing   │
│                 │       │                 │       │                 │
│ - File Upload   │──────►│ - PapaParse     │──────►│ - LLM Selection │
│ - Text Entry    │       │ - Type Detection│       │ - Prompt Build  │
│ - Command Input │       │ - Sample Extract│       │ - API Call      │
└─────────────────┘       └─────────────────┘       └─────────────────┘
         │                        │                         │
         │                        │                         │
         ▼                        ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ User Decision   │       │ Data Transform  │       │ Results Display │
│                 │◄──────│                 │◄──────│                 │
│ - Approve/Reject│       │ - Apply Changes │       │ - Suggestions   │
│ - Modify Values │       │ - Execute Cmds  │       │ - Command Results│
│ - Validate      │       │ - Process SQL   │       │ - SQL Output    │
└─────────────────┘       └─────────────────┘       └─────────────────┘
         │                        │                         │
         │                        │                         │
         ▼                        ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Metrics Update  │       │ Result Storage  │       │ User Feedback   │
│                 │       │                 │       │                 │
│ - Stats Tracking│       │ - CSV Download  │       │ - Issue Logging │
│ - Dashboard     │       │ - CSV State     │       │ - Error Display │
│ - Performance   │       │ - History       │       │ - Notifications │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### 9.2 Technical Processing Steps

1. **Data Input & Parsing**

   ```typescript
   // From CsvProcessing.tsx
   const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
     const selectedFile = event.target.files?.[0];
     if (selectedFile) {
       const reader = new FileReader();
       reader.onload = (e) => {
         const csvData = e.target?.result as string;
         setCurrentCsvData(csvData);

         // Parse for statistics
         const parseResult = Papa.parse(csvData, {
           header: true,
           preview: 10,
           skipEmptyLines: true,
         });
         // Set metadata and preview
         setFilePreview({
           name: selectedFile.name,
           size: selectedFile.size,
           type: selectedFile.type,
           rowCount: csvData.split("\n").length - 1,
         });
       };
       reader.readAsText(selectedFile);
     }
   };
   ```

2. **AI Processing Flow**

   ```typescript
   // From csv-cleaning-suggestions.ts
   const suggestCsvCleaningActionsFlow = ai.defineFlow(
     {
       name: "suggestCsvCleaningActionsFlow",
       inputSchema: SuggestCsvCleaningActionsInputSchema,
       outputSchema: SuggestCsvCleaningActionsOutputSchema,
     },
     async (input) => {
       // Sample data for large inputs
       const sampledData = sampleDataIfNeeded(input.csvData);

       // Process with selected model
       const modelId = input.modelId || ai.defaultModel;

       // Call AI with appropriate prompt
       const { output } = await suggestCsvCleaningActionsPrompt({
         ...input,
         csvData: sampledData,
       });

       // Additional processing and validation
       return validateAndEnhanceOutput(output);
     }
   );
   ```

3. **User Interaction Processing**

   ```typescript
   // From SuggestionItem.tsx
   const handleApprove = () => {
     // Track processing time for metrics
     const startTime = performance.now();

     // Process user selection for numeric imputations
     let userValue = undefined;
     if (
       suggestion.actionType === "FILL_MISSING_NUMERIC" &&
       suggestion.imputationMethod
     ) {
       switch (selectedImputationMethod) {
         case "mean":
           userValue = stats?.mean?.toFixed(2);
           break;
         case "median":
           userValue = stats?.median?.toFixed(2);
           break;
         case "mode":
           userValue = stats?.mode?.toFixed(2);
           break;
       }
     }

     // Update UI state
     setItemStatus("approved");

     // Notify parent component
     onAction(suggestion.id, "approve", userValue);

     // Record processing time for metrics
     const processingTime = performance.now() - startTime;
     if (onProcessingTime) onProcessingTime(processingTime);
   };
   ```

4. **Data Transformation Execution**

   ```typescript
   // From apply-csv-changes.ts
   async function processApprovedChanges(
     csvData: string,
     suggestions: ProcessableSuggestion[]
   ): Promise<ProcessingResult> {
     // Parse CSV to work with
     const parseResult = Papa.parse(csvData, {
       header: true,
       skipEmptyLines: true,
     });
     const headers = parseResult.meta.fields || [];
     let data = [...parseResult.data] as Record<string, any>[];

     // Group suggestions by type for optimal processing
     const groupedSuggestions = groupSuggestionsByType(suggestions);

     // Process each suggestion group with appropriate handler
     const appliedActions = [];

     // Handle fill missing values (columnar operation)
     for (const suggestion of groupedSuggestions.fillMissing) {
       const { columnName, suggestedFragment } = suggestion;
       let affectedRows = 0;

       data = data.map((row) => {
         if (!row[columnName] || String(row[columnName]).trim() === "") {
           affectedRows++;
           return { ...row, [columnName]: suggestedFragment };
         }
         return row;
       });

       appliedActions.push({
         description: `Filled ${affectedRows} missing values in column "${columnName}" with "${suggestedFragment}"`,
         affectedRows,
         suggestionId: suggestion.id,
       });
     }

     // Similar processing for other suggestion types...

     // Rebuild CSV
     const newCsv = Papa.unparse({
       fields: headers,
       data,
     });

     return {
       processedCsv: newCsv,
       appliedActions,
     };
   }
   ```

5. **Metrics & Logging Update**
   ```typescript
   // From page.tsx
   const handleStandardizationValidation = useCallback(
     (result: StandardizationResult, processingTime: number) => {
       // Update session metrics
       setSessionStats((prev) => ({
         ...prev,
         standardization: {
           processed: prev.standardization.processed + 1,
           approved:
             prev.standardization.approved +
             (result.status === "approved" ? 1 : 0),
           rejected:
             prev.standardization.rejected +
             (result.status === "rejected" ? 1 : 0),
           totalProcessingTime:
             prev.standardization.totalProcessingTime + processingTime,
         },
       }));

       // Log rejected items for improvement analysis
       if (result.status === "rejected") {
         setLoggedIssues((prev) => [
           {
             id: `std-${Date.now()}-${Math.random()}`,
             timestamp: Date.now(),
             feature: "Standardization",
             field: result.fieldName,
             originalValue: result.originalValue,
             suggestion: result.standardizedValue,
             status: "rejected",
           },
           ...prev, // Add to beginning for chronological display
         ]);
       }
     },
     []
   );
   ```

This detailed technical flow demonstrates the sophisticated data processing pipeline implemented in DataMaestro, combining AI capabilities with human expertise for optimal data cleaning and transformation outcomes.

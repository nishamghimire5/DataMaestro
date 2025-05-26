# DataMaestro: Data Processing Architecture & AI Workflow

This document explains the core data processing and AI functionality of DataMaestro, focusing on how data flows through the system and how AI models are leveraged for data enhancement.

## 1. Core Data Processing Architecture

DataMaestro processes data through a multi-stage pipeline:

```
[Raw Data] → [Data Preparation] → [AI Analysis] → [Transformation] → [Enhanced Data]
```

### 1.1 Data Ingestion & Preparation

When data enters the system (via CSV upload or direct input):

1. **Initial Parsing**:

   - CSV data is parsed into a structured format using PapaParse
   - Headers are extracted and normalized (case sensitivity, whitespace removal)
   - Data types are inferred from content patterns

2. **Data Sampling**:

   - For large datasets (>1000 rows), a strategic sampling occurs
   - System uses stratified sampling to capture representative data:
     - 40% from beginning of dataset
     - 20% from middle
     - 40% from end
   - This ensures AI models see diverse data without context window limitations

3. **Schema Inference**:
   - Data types are detected for each column
   - Pattern recognition identifies formats (dates, numbers, categorical data)
   - Quality metrics are calculated (missing value percentages, cardinality)

### 1.2 AI Processing Engines

DataMaestro leverages multiple AI processing engines:

1. **Model Selection & Orchestration**:

   - Primary: Google Gemini 2.0 Flash (cloud API)
   - Alternative: Local Ollama with Gemma3:4b model
   - Automatic fallback system if primary model fails
   - Model-specific optimization based on task complexity

2. **Processing Modes**:
   - **Analysis Mode**: AI examines data to find issues without making changes
   - **Suggestion Mode**: AI proposes specific corrections with confidence scores
   - **Direct Mode**: AI applies transformations based on natural language instructions
   - **SQL Mode**: AI interprets SQL-like queries for data manipulation

## 2. Data Enhancement Workflows

### 2.1 Data Cleaning Suggestion Workflow

```
[CSV Data] → [AI Analysis] → [Issue Detection] → [Suggestion Generation] → [User Verification] → [Transformation]
```

How it works behind the scenes:

1. **Data Analysis Phase**:

   - System samples representative data rows
   - AI analyzes patterns across columns and rows
   - Detects various issues:
     - Missing values (nulls, empty strings, placeholders like "N/A")
     - Format inconsistencies (date formats, number formats)
     - Outliers and anomalies
     - Typos and common errors

2. **Suggestion Generation**:

   - Each detected issue is converted to an actionable suggestion
   - System consolidates column-wide issues (e.g., all missing values in a column)
   - Each suggestion receives:
     - Confidence score (0.0-1.0)
     - Priority level (low/medium/high)
     - Action type classification
     - Affected row count estimate

3. **Action Classification**:

   - `FILL_MISSING`: Replace null/empty values with a constant
   - `FILL_MISSING_NUMERIC`: Replace missing numbers with statistical value
   - `MODIFY_CELL`: Correct specific cell values
   - `STANDARDIZE_FORMAT`: Apply consistent formatting
   - `REMOVE_ROW`: Delete problematic rows
   - `REVIEW_CONSISTENCY`: Flag potential issues needing human review

4. **Statistical Analysis** (for numeric fields):
   - System calculates mean, median, and mode for numeric columns
   - These values become options for filling missing numeric data
   - Example: Column "Age" missing values could be filled with mean=35.2 or median=33

### 2.2 Direct Command Processing Workflow

```
[Command Input] → [Command Analysis] → [Action Determination] → [Data Transformation]
```

How it works behind the scenes:

1. **Command Interpretation**:

   - Natural language commands are parsed (e.g., "fill missing values in 'Age' with 50")
   - System first attempts pattern matching with specialized regex patterns
   - If pattern matching fails, AI interprets the command intent

2. **Hybrid Processing Strategy**:

   - **Fast Path**: Direct rule-based execution for common operations
     - Examples: fill missing values, find/replace, column deletion
     - Uses regex patterns for speed and consistency
   - **AI Path**: Complex or ambiguous commands are processed by AI
     - Used for commands requiring context understanding
     - Handles natural language variation and ambiguity

3. **Execution Flow**:
   - Command is classified by type (fill, replace, filter, etc.)
   - Parameters are extracted (column names, values, conditions)
   - Validation ensures referenced columns exist
   - Appropriate transformation is applied to data
   - Result metrics are tracked (rows affected, changes made)

### 2.3 SQL-Like Query Processing

```
[SQL Query] → [Query Parsing] → [Schema Mapping] → [Execution] → [Result Generation]
```

How it works behind the scenes:

1. **Query Analysis**:

   - SQL or SQL-like query is parsed to extract:
     - Target columns (SELECT)
     - Filtering conditions (WHERE)
     - Grouping/aggregation (GROUP BY)
     - Sorting (ORDER BY)
   - Column names are validated against actual CSV headers

2. **Execution Strategy**:

   - **Standard SQL**: Direct execution through a lightweight SQL engine
   - **Natural SQL**: AI interpretation for complex or natural language queries
   - **Hybrid**: Combination of direct execution with AI assistance

3. **Result Generation**:
   - Query results are formatted as a new CSV dataset
   - Performance metrics are calculated (execution time, rows processed)
   - Error handling provides targeted feedback on syntax issues

## 3. Advanced Data Processing Features

### 3.1 Anomaly Detection

DataMaestro uses sophisticated anomaly detection:

1. **Multi-faceted Detection**:

   - **Statistical Anomalies**: Values outside statistical norms (z-scores > threshold)
   - **Pattern Anomalies**: Values not matching expected patterns
   - **Context Anomalies**: Values inconsistent with related data

2. **Type-Specific Analysis**:

   - **Numeric Fields**: Statistical outlier detection using z-scores
   - **Date Fields**: Validation against expected formats and ranges
   - **Categorical Fields**: Frequency analysis to identify rare categories
   - **Text Fields**: Pattern matching and semantic analysis

3. **Confidence Scoring**:
   - Each potential anomaly receives a confidence score
   - Higher scores indicate higher likelihood of being a true anomaly
   - Factors influencing scores:
     - Distance from mean (for numeric)
     - Rarity of value
     - Context incongruity

### 3.2 Data Standardization

Standardization process works through:

1. **Format Detection**:

   - System identifies various formats present in each column
   - Calculates frequency distribution of different formats
   - Determines dominant format as standardization target

2. **Transformation Rules**:

   - For each non-standard format, transformation rules are generated
   - Examples:
     - Date conversions: "12/31/2023" → "2023-12-31"
     - Unit standardization: "1,234.56" → "1234.56"
     - Text normalization: "NEW YORK" → "New York"

3. **Confidence-Based Application**:
   - Transformations with high confidence are suggested first
   - Edge cases with low confidence are flagged for human review
   - Transformation rules are reusable across similar datasets

## 4. AI Integration Architecture

### 4.1 AI Model Integration

```
[Data] → [Prompt Construction] → [Model Selection] → [AI Processing] → [Response Parsing] → [Result Validation]
```

How it works behind the scenes:

1. **Prompt Engineering**:

   - Specialized prompts are crafted for each data task
   - Prompts include:
     - Task-specific instructions
     - Examples and constraints
     - Error handling guidance
     - Output format specifications
   - Context window optimization ensures efficient use of token limits

2. **Model Routing**:

   - Tasks are routed to appropriate models based on:
     - Complexity requirements
     - Performance characteristics
     - Cost considerations
   - Model-specific parameters are tuned per task

3. **Fallback Mechanisms**:
   - Primary model failure triggers fallback to alternative models
   - If all AI models fail, rule-based processing takes over
   - Graceful degradation ensures processing continues with reduced capabilities

### 4.2 Performance Optimization

DataMaestro employs several techniques to optimize data processing:

1. **Data Optimization**:

   - **Chunking**: Large datasets are processed in manageable chunks
   - **Sampling**: Representative samples for initial analysis
   - **Stratified Selection**: Ensures diverse data representation

2. **Processing Optimization**:

   - **Batched Operations**: Similar operations are grouped for efficiency
   - **Columnar Processing**: Column-wide operations processed together
   - **Prioritized Execution**: High-impact transformations first

3. **AI Optimization**:
   - **Context Window Management**: Efficient prompt design
   - **Response Caching**: Similar queries reuse previous results
   - **Parallel Processing**: Independent operations run concurrently

## 5. Data Flow Example: End-to-End Processing

To illustrate how data flows through the system, consider this example of processing a CSV file with missing values:

### Phase 1: Data Ingestion

- User uploads CSV file
- System parses CSV using PapaParse
- Headers and data types are identified
- For large files, representative sampling occurs

### Phase 2: Initial Analysis

#### For Suggestion Mode:

1. **Sample Construction**:

   - System selects representative data rows (stratified sampling)
   - Trims data to fit LLM context window
   - Preserves both problematic and clean rows for contrast

2. **AI Analysis**:

   - Data is sent to LLM (primarily Gemini 2.0 Flash)
   - AI examines patterns across columns using specialized prompt
   - Detects various issues: missing values, format inconsistencies, outliers
   - Each issue is scored for confidence (0.0-1.0) and priority (low/medium/high)

3. **Suggestion Consolidation**:
   - AI consolidates multiple instances of same issue type in a column
   - Example: 5 missing values in "Age" become ONE suggestion with affectedRows=5
   - Each suggestion gets unique ID and action type (FILL_MISSING, MODIFY_CELL, etc.)

#### For Command Mode:

1. **Command Parsing**:

   - System first attempts regex pattern matching on command
   - Regular expressions identify common operation patterns (e.g., "fill missing values with X")
   - If pattern matching fails, command is sent to LLM for interpretation

2. **Command Translation**:

   - Command is converted to structured operation plan with:
     - Target columns
     - Operation type (fill, replace, transform, etc.)
     - Values and conditions
     - Expected row impact

3. **Validation & Planning**:
   - System validates column names exist in dataset
   - For numeric operations, data type compatibility is checked
   - A technical execution plan is created with specific transformation steps

#### For SQL Mode:

1. **Query Analysis**:

   - System parses SQL or SQL-like query syntax
   - Identifies operation type (SELECT, UPDATE, DELETE, etc.)
   - Extracts column references, conditions, and functions

2. **Schema Mapping**:

   - CSV column headers are mapped to SQL table schema
   - Data types are inferred from content
   - In-memory data structure is created for query execution

3. **Execution Planning**:
   - Query is analyzed for optimization opportunities
   - For complex operations, execution is broken into sequential steps
   - Required transformations are identified

### Phase 3: User Decision

- User reviews suggestions/preview and approves/confirms operation
- For missing numeric values, user selects imputation method (mean, median, mode)
- System calculates statistics from existing values (e.g., median=33)
- For commands and SQL, users can view preview of affected rows before applying

### Phase 4: Transformation

#### Technical Implementation:

1. **Operation Application**:

   - System iterates through CSV rows (batched for large files)
   - Each row is processed according to approved plan
   - For suggestion mode: Missing "Age" values are filled with median value (33)
   - For command mode: Specified transformations are applied row-by-row
   - For SQL mode: Query is executed against in-memory table

2. **Performance Optimization**:

   - Large datasets use chunked processing
   - Operations on same columns are batched
   - In-memory processing avoids unnecessary parsing/serialization

3. **Error Handling**:
   - Each transformation tracks success/failure status
   - Row-level errors are isolated to prevent entire process failure
   - Error details are captured for reporting

### Phase 5: Results & Feedback

- Transformed CSV is produced with all approved changes applied
- Processing statistics are recorded:
  - Success rate percentage
  - Rows affected count
  - Operation time
  - Error counts by type
- Rejected suggestions are logged for system improvement
- Operation history is maintained for audit and reproducibility

This workflow combines AI intelligence with human judgment to achieve optimal data cleaning results with full transparency and control.

# DataMaestro: Intelligent Data Cleansing and Processing Tool

**DataMaestro** is a powerful, AI-enhanced application designed to streamline the process of cleaning, standardizing, and profiling data, primarily focusing on CSV files. It leverages modern AI models like Google's Gemini and local Ollama instances, alongside traditional data processing techniques, to offer a comprehensive suite of tools for data quality improvement. The application features a human-in-the-loop validation system, allowing users to review and approve or reject AI-driven suggestions, ensuring data integrity and accuracy.

## Table of Contents

1.  [Overview](#overview)
2.  [Features](#features)
3.  [Project Structure](#project-structure)
4.  [Installation and Setup](#installation-and-setup)
    - [Prerequisites](#prerequisites)
    - [Environment Variables](#environment-variables)
    - [Running the Application](#running-the-application)
5.  [Code Flow and Processing Logic](#code-flow-and-processing-logic)
    - [Core AI Integration (`ai-instance.ts`)](#core-ai-integration-ai-instancets)
    - [CSV Processing (`csv-processing.tsx`)](#csv-processing-csv-processingtsx)
      - [Cleaning Suggestions (`csv-cleaning-suggestions.ts`)](#cleaning-suggestions-csv-cleaning-suggestionsts)
      - [Applying Changes (`apply-csv-changes.ts`)](#applying-changes-apply-csv-changests)
      - [Direct Commands (`csv-direct-commands.ts`)](#direct-commands-csv-direct-commandsts)
      - [SQL Mode (`csv-direct-sql-processor.ts` & `csv-sql-processing.ts`)](#sql-mode-csv-direct-sql-processorts--csv-sql-processingts)
      - [Pandas-like Processing (`csv-pandas-processor.ts`)](#pandas-like-processing-csv-pandas-processorts)
      - [Pattern-Based Processing (`csv-direct-processor.ts`)](#pattern-based-processing-csv-direct-processorts)
    - [Data Profiling (`data-profiling.ts` & `data-profiling.tsx`)](#data-profiling-data-profilingts--data-profilingtsx)
    - [Data Anomaly Detection (`data-anomaly-detection.ts` & `data-anomaly-detection.tsx`)](#data-anomaly-detection-data-anomaly-detectionts--data-anomaly-detectiontsx)
    - [Data Standardization (`data-standardization.ts` & `data-standardization.tsx`)](#data-standardization-data-standardizationts--data-standardizationtsx)
    - [Error Handling](#error-handling)
    - [PapaParse Usage](#papaparse-usage)
6.  [Key Components and UI](#key-components-and-ui)
7.  [Complex Aspects and Design Choices](#complex-aspects-and-design-choices)
8.  [Limitations](#limitations)
9.  [Future Explorations](#future-explorations)
10. [Style Guidelines](#style-guidelines)

## Overview

DataMaestro aims to simplify complex data quality tasks. Users can upload CSV files, receive AI-generated cleaning suggestions, apply transformations using natural language commands or SQL-like queries, and profile their datasets to gain insights. The application is built with Next.js, TypeScript, and Genkit for AI flow management, utilizing Shadcn UI for a modern user interface.

## Features

- **AI-Powered CSV Cleaning:**
  - Generates suggestions for fixing typos, standardizing formats, handling missing values, identifying duplicates, and outliers.
  - Supports user-provided instructions to guide the AI.
  - Allows selection between different LLMs (Default/Gemini, Ollama).
- **Iterative Processing:** Users can apply changes incrementally and re-process the data.
- **Direct Command Mode:** Modify CSV data using natural language commands (e.g., "replace 'N/A' with 'Unknown' in column 'Status'").
  - Uses LLMs for command interpretation.
  - Fallback to regex/pattern-based processing for simpler commands.
- **SQL Mode:**
  - Process CSV data using SQL-like queries (supports basic UPDATE, DELETE).
  - AI-assisted SQL interpretation and execution on CSV.
  - Direct SQL-like processor for non-AI based operations.
- **Pandas-like Processing (Experimental):**
  - Leverage LLMs to generate and apply pandas-style operations from natural language.
- **Data Profiling:**
  - Generates a comprehensive profile for CSV or JSON data.
  - Includes record/field counts, data type inference, missing/unique value analysis, value distributions, numeric stats, common formats, and potential issues.
- **Data Anomaly Detection:**
  - Identifies anomalies in JSON customer data, provides descriptions, and suggests corrections.
- **Data Standardization:**
  - Standardizes data formats (date, address, text) based on field type and optional hints.
- **Human-in-the-Loop Validation:**
  - All AI suggestions and processing results can be reviewed, approved, or rejected by the user.
  - `SuggestionItem` component for detailed review of CSV cleaning suggestions.
- **Evaluation Dashboard:** Tracks accuracy statistics for anomaly detection and standardization based on user validation.
- **Issue Log:** Logs rejected suggestions for review and improvement.
- **Responsive UI:** Adapts to different screen sizes using `use-mobile.tsx` hook.
- **Toast Notifications:** Provides user feedback for actions and errors using `use-toast.ts`.

## Project Structure

```
n:\DataMaestro2
├── docs/
│   └── blueprint.md        # Initial design and style guidelines
├── public/                 # Static assets
├── src/
│   ├── ai/
│   │   ├── flows/
│   │   │   ├── schemas/
│   │   │   │   ├── csv-processor-types.ts # Type definitions for CSV processing
│   │   │   │   └── csv-schemas.ts         # Zod schema for CleaningSuggestion
│   │   │   ├── apply-csv-changes.ts       # Logic to apply cleaning suggestions to CSV
│   │   │   ├── csv-cleaning-suggestions.ts# AI flow for generating CSV cleaning suggestions
│   │   │   ├── csv-direct-commands.ts     # AI flow for processing natural language commands on CSV
│   │   │   ├── csv-direct-processor.ts    # Non-AI pattern-based CSV command processor
│   │   │   ├── csv-direct-sql-processor.ts# Non-AI SQL-like processor for CSV
│   │   │   ├── csv-pandas-processor.ts    # AI flow for pandas-style CSV processing (experimental)
│   │   │   ├── csv-pandas-processor.orig.ts # Older version of pandas processor
│   │   │   ├── csv-processor-helpers.ts   # Helper functions for LLM calls, code gen, CSV utils
│   │   │   ├── csv-sql-processing.ts      # AI flow for SQL-like processing on CSV
│   │   │   ├── data-anomaly-detection.ts  # AI flow for detecting anomalies in JSON data
│   │   │   ├── data-profiling.ts          # AI flow for generating data profiles
│   │   │   └── data-standardization.ts    # AI flow for standardizing data formats
│   │   ├── ai-instance.ts        # Genkit AI setup (Gemini, Ollama plugins)
│   │   └── dev.ts                # Imports AI flows, likely for dev/testing
│   ├── app/
│   │   ├── layout.tsx            # Main HTML structure, global styles
│   │   └── page.tsx              # Main page, orchestrates features and components
│   ├── components/
│   │   ├── ui/                   # Shadcn UI components (auto-generated)
│   │   ├── csv-processing.tsx    # Main UI for CSV upload, suggestions, and processing
│   │   ├── data-anomaly-detection.tsx # UI for data anomaly detection feature
│   │   ├── data-profiling.tsx    # UI for data profiling feature
│   │   ├── data-standardization.tsx# UI for data standardization feature
│   │   ├── evaluation-dashboard.tsx# UI for displaying validation accuracy
│   │   ├── issue-log.tsx         # UI for displaying rejected issues
│   │   └── suggestion-item.tsx   # UI for individual CSV cleaning suggestions
│   ├── hooks/
│   │   ├── use-mobile.tsx        # Hook to detect mobile viewport
│   │   └── use-toast.ts          # Custom hook for toast notifications
│   ├── lib/
│   │   └── utils.ts              # Utility functions (e.g., `cn` for classnames)
├── .env.local.example      # Example environment variables
├── .eslintrc.json          # ESLint configuration
├── .gitignore              # Git ignore file
├── next-env.d.ts           # Next.js TypeScript declarations
├── next.config.mjs         # Next.js configuration
├── package.json            # Project dependencies and scripts
├── postcss.config.js       # PostCSS configuration
├── README.md               # This file
└── tsconfig.json           # TypeScript configuration
```

## Installation and Setup

### Prerequisites

- Node.js (version specified in `package.json` or latest LTS)
- npm or yarn
- Access to Google AI (Gemini) API and/or a running Ollama instance.

### Environment Variables

Create a `.env.local` file in the root directory by copying `.env.local.example` and fill in the necessary API keys and endpoint URLs:

```env
# Google AI (Gemini)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Ollama (if used)
OLLAMA_BASE_URL="http://localhost:11434" # Or your Ollama instance URL
```

### Running the Application

1.  **Install Dependencies:**

    ```bash
    npm install
    # or
    yarn install
    ```

2.  **Run the Development Server:**

    ```bash
    npm run dev
    # or
    yarn dev
    ```

    The application will be available at `http://localhost:3000`.

3.  **Build for Production:**

    ```bash
    npm run build
    # or
    yarn build
    ```

4.  **Start Production Server:**
    ```bash
    npm start
    # or
    yarn start
    ```

## Code Flow and Processing Logic

DataMaestro's functionality is orchestrated through a combination of Next.js frontend components and Genkit AI flows on the backend.

### Core AI Integration (`ai-instance.ts`)

This file initializes the Genkit AI instance. It configures plugins for:

- **Google AI (Gemini):** Using the `GEMINI_API_KEY` environment variable. The default model is `googleai/gemini-2.0-flash`.
- **Ollama:** Connects to a local or remote Ollama instance specified by `OLLAMA_BASE_URL`.

This setup allows various AI flows to utilize either Gemini or a model hosted via Ollama, providing flexibility.

### CSV Processing (`csv-processing.tsx`)

This is the central hub for CSV-related tasks.

1.  **File Upload:** Users upload a CSV file. PapaParse is used to parse the CSV data in the browser.
2.  **Mode Selection:** Users can choose between:
    - **Suggestions Mode:** Get AI-driven cleaning suggestions.
    - **Direct Command Mode:** Apply changes using natural language.
    - **SQL Mode:** Use SQL-like queries for transformations.
    - **Pandas Mode (Experimental):** Use natural language for pandas-like operations.
3.  **LLM Selection:** Users can select the LLM to use (Default/Gemini or Ollama) for AI-powered operations.
4.  **Interaction with AI Flows:** Based on the selected mode, this component invokes the relevant AI flows.
5.  **Suggestion Display & Validation:**
    - Cleaning suggestions are displayed using `suggestion-item.tsx`.
    - Users can approve/reject suggestions, provide custom values, or choose imputation methods.
6.  **Applying Changes:** Approved suggestions or command results are applied to the CSV data via `apply-csv-changes.ts` or other relevant processors.
7.  **Iterative Processing:** The processed CSV can be further cleaned or analyzed.

#### Cleaning Suggestions (`csv-cleaning-suggestions.ts`)

- **Input:** CSV data (as a string) and optional user instructions.
- **Process:**
  1.  Defines a detailed prompt for the selected LLM (Gemini or Ollama via `csv-processor-helpers.ts`).
  2.  The prompt instructs the AI to:
      - Identify various data quality issues (missing values, typos, standardization needs, duplicates, outliers).
      - Consolidate suggestions (column-wide vs. row-specific).
      - Prioritize user instructions.
      - Provide rationale, confidence, and action types for each suggestion.
  3.  The flow uses a Zod schema (`CleaningSuggestion` from `csv-schemas.ts`) to structure the AI's output.
  4.  Includes logic for de-duplicating and consolidating suggestions.
- **Output:** A list of `CleaningSuggestion` objects.

#### Applying Changes (`apply-csv-changes.ts`)

- **Input:** Original CSV data and a list of approved `CleaningSuggestion` objects.
- **Process:**
  1.  Parses the CSV data (again, using PapaParse, though this happens server-side within the flow).
  2.  Iterates through approved suggestions and applies changes based on `actionType`:
      - `MODIFY_CELL`: Updates a specific cell.
      - `REMOVE_ROW`: Deletes a row.
      - `STANDARDIZE_FORMAT`: Applies formatting changes.
      - `FILL_MISSING`, `FILL_MISSING_NUMERIC`: Fills missing values using provided methods (mean, median, mode, custom value). Calculates numeric stats (mean, median, mode) for imputation if needed.
      - `REVIEW_CONSISTENCY`: Applies user-validated changes for consistency issues.
  3.  Handles both row-specific and column-wide changes.
- **Output:** The cleaned CSV data as a string and a summary of changes.

#### Direct Commands (`csv-direct-commands.ts`)

- **Input:** CSV data, a natural language command, and the selected LLM.
- **Process:**
  1.  The user provides a natural language command via the UI (`csv-processing.tsx`).
  2.  This command, along with the CSV data (parsed into a JavaScript structure by PapaParse), is sent to the `csv-direct-commands.ts` AI flow.
  3.  The flow defines a prompt for the selected LLM to interpret the natural language command. The LLM's role is to understand the user's intent and translate it into a structured plan or set of instructions for data modification (e.g., identify target columns, values for fill/replace, operation type). It does **not** directly output PapaParse commands.
  4.  JavaScript/TypeScript code within the AI flow then takes this structured interpretation from the LLM and programmatically applies the changes to the PapaParse-d JavaScript data structure (e.g., an array of objects representing rows).
  5.  If AI processing fails to interpret the command or for very simple commands, the flow includes **fallback logic**. This typically involves using basic regex pattern matching (similar to `csv-direct-processor.ts`) for operations like fill/replace and case conversion directly on the JavaScript data structure.
  6.  After the data structure is modified (either by AI-driven logic or the fallback), PapaParse is used again to _unparse_ the JavaScript data structure back into a CSV formatted string.
- **Output:** Modified CSV data (as a string) and a summary of changes, which are then displayed in the UI.

#### SQL Mode (`csv-direct-sql-processor.ts` & `csv-sql-processing.ts`)

DataMaestro offers two ways to process CSVs with SQL-like syntax:

1.  **`csv-direct-sql-processor.ts` (Non-AI):**

    - **Input:** CSV data and a SQL-like query string.
    - **Process:**
      - Parses basic `UPDATE` and `DELETE` statements with simple `WHERE` clauses (equality, `IN` for UPDATE; equality, basic comparison for DELETE).
      - Directly manipulates the parsed CSV data (arrays of objects).
    - **Output:** Modified CSV data, column info, and error logs. This is a regex and string-manipulation based processor.

2.  **`csv-sql-processing.ts` (AI-Powered):**
    - **Input:** CSV data, a SQL-like query, and the selected LLM.
    - **Process:**
      - Defines a prompt for the LLM to interpret the SQL query in the context of the CSV data.
      - The AI is expected to understand the query and describe the transformations needed.
      - The actual execution logic based on AI's interpretation would then modify the CSV.
    - **Output:** Processed CSV data, summary, column info, and errors.

#### Pandas-like Processing (`csv-pandas-processor.ts`)

This feature is experimental and aims to allow users to perform complex data manipulations using natural language commands, which are then translated into pandas-like operations.

- **Input:** CSV data, natural language command, selected LLM.
- **Process:**
  1.  Uses helper functions from `csv-processor-helpers.ts` to:
      - Generate Python (Pandas) code or SQL queries from the natural language command using the selected LLM (Gemini or Ollama).
      - Extract the generated code from the LLM's response.
  2.  The intention is to execute this generated code (e.g., Python code using a suitable environment, or SQL via a query engine on the CSV). _The actual execution mechanism for generated Python code is not fully detailed in the provided files but is a common pattern for such features._
  3.  The older `csv-pandas-processor.orig.ts` shows more explicit logic for initializing LLM clients and includes default (pattern-based) implementations for generating SQL and Python if an LLM is not used.
- **Output:** Processed CSV data, summary, column info, generated Python code/SQL query, and error logs.

#### Pattern-Based Processing (`csv-direct-processor.ts`)

This flow provides a simpler, non-AI based approach for CSV processing using direct pattern matching (regex).

- **Input:** CSV data and a command.
- **Process:** Implements logic for commands like:
  - Find/replace
  - Fill missing/null/empty values
  - Standardize values (e.g., "Low Fat" to "LF")
  - Case conversion
  - Sorting
  - Filtering
- **Output:** Modified CSV data. This serves as a fallback or an alternative for simpler, well-defined operations where AI overhead is not necessary.

### Data Profiling (`data-profiling.ts` & `data-profiling.tsx`)

- **UI (`data-profiling.tsx`):**
  - Allows users to input raw data (JSON or CSV).
  - Uses PapaParse to attempt CSV detection if JSON parsing fails.
  - Calls the `profileData` AI flow.
  - Displays results: overall summary, record/field counts, and detailed field-level analysis.
- **AI Flow (`data-profiling.ts`):**
  - **Input:** Data (JSON or CSV string) and format hint (`json` or `csv`).
  - **Process:**
    - Defines a prompt for the LLM.
    - Instructs the AI to: determine record/field counts, infer data types, calculate missing/unique values, analyze value distributions, identify common formats, list potential issues for each field, and provide an overall summary and general observations.
  - **Output:** A `ProfileDataOutput` object containing the detailed profile.

### Data Anomaly Detection (`data-anomaly-detection.ts` & `data-anomaly-detection.tsx`)

- **UI (`data-anomaly-detection.tsx`):**
  - Users input JSON data.
  - Calls the `detectDataAnomaly` AI flow.
  - Displays detected anomalies, allowing users to approve/reject them.
  - Handles state for loading, results, errors, and anomaly status.
  - Sends validation results (approved/rejected) to `page.tsx` for logging and dashboard updates.
- **AI Flow (`data-anomaly-detection.ts`):**
  - **Input:** Customer data as a JSON string.
  - **Process:**
    - Defines a prompt for the LLM.
    - Instructs the AI to analyze the JSON data, identify anomalies/inconsistencies/errors, describe them, and suggest corrections.
  - **Output:** A list of anomalies with descriptions and suggested corrections, and a summary.

### Data Standardization (`data-standardization.ts` & `data-standardization.tsx`)

- **UI (`data-standardization.tsx`):**
  - Users input field name, value, type (date, address, text), and an optional format hint.
  - Calls the `standardizeData` AI flow.
  - Displays original and standardized values, allowing approval/rejection.
  - Sends validation results to `page.tsx`.
- **AI Flow (`data-standardization.ts`):**
  - **Input:** Field name, value, type, and optional format hint.
  - **Process:**
    - Defines a prompt for the LLM.
    - Instructs the AI to standardize the value according to its type and the provided hint (if any) and explain the process.
  - **Output:** The standardized value and an explanation.

### Error Handling

- **Component-Level:** React components use `try-catch` blocks for API calls, display error messages in Alerts, and use toast notifications (`use-toast.ts`) for user feedback. Specific error messages are provided for issues like invalid JSON format.
- **AI Flow Level:** AI flows can include error logging. For instance, `csv-pandas-processor.ts` logs errors if LLM client initialization fails and can fall back to default processing.
- **Input Validation:** Basic input validation is performed on the client-side (e.g., checking for empty inputs before calling AI flows).

### PapaParse Usage

- **Client-Side (`csv-processing.tsx`, `data-profiling.tsx`):** Used to parse uploaded CSV files directly in the browser. This allows for immediate feedback and reduces server load for initial parsing. Options like `header: true`, `skipEmptyLines: true`, and `dynamicTyping: true` are often used.
- **Server-Side (within AI Flows like `apply-csv-changes.ts`, `suggestion-item.tsx` for stats calculation):** PapaParse is also used within Genkit flows (which run server-side) to process CSV strings passed from the client or generated by other steps.

## Key Components and UI

- **`page.tsx`:** The main entry point of the application. It manages the overall layout, state for different features (Anomaly Detection, Standardization, CSV Processing, Data Profiling), and orchestrates the Evaluation Dashboard and Issue Log. It collects validation data from child components to update session statistics and logged issues.
- **`csv-processing.tsx`:** The most complex component, handling CSV uploads, mode selection (suggestions, direct command, SQL, pandas), LLM choice, displaying suggestions via `suggestion-item.tsx`, and applying changes.
- **`suggestion-item.tsx`:** Renders individual cleaning suggestions within an accordion. It allows users to:
  - Approve/reject suggestions.
  - Change imputation methods for numeric fills (mean, median, mode), with stats calculated from current CSV data.
  - Provide custom replacement values.
- **`data-anomaly-detection.tsx`, `data-profiling.tsx`, `data-standardization.tsx`:** Dedicated components for their respective features, providing input fields and result displays.
- **`evaluation-dashboard.tsx`:** Displays accuracy statistics for features with human-in-the-loop validation.
- **`issue-log.tsx`:** Shows a table of suggestions/changes that were rejected by the user.
- **Shadcn UI & Tailwind CSS:** Used for building the user interface, providing a modern look and feel with pre-built components. `cn` utility from `lib/utils.ts` (using `clsx` and `tailwind-merge`) helps manage conditional class names.

## Complex Aspects and Design Choices

- **Multi-Modal AI Interaction:** The system is designed to work with different LLMs (Gemini, Ollama) and different modes of interaction (generating suggestions, interpreting commands, generating code). This is managed by `ai-instance.ts` and conditional logic within flows/components.
- **Hybrid Processing (AI + Regex/Pattern):** For CSV direct commands and pandas processing, the system employs a hybrid approach. LLMs are used for complex natural language understanding, but there's fallback logic to simpler regex/pattern-based processors (`csv-direct-processor.ts`, default implementations in `csv-pandas-processor.orig.ts`) for efficiency or when AI fails. This is a good design choice for balancing power and performance/reliability.
- **Schema-Defined AI Outputs:** Using Zod schemas (e.g., `CleaningSuggestion` in `csv-schemas.ts`, output schemas in various AI flows) to define the expected structure of LLM responses. This makes AI output more predictable and easier to work with. Genkit's `definePrompt` and `defineFlow` heavily rely on these schemas.
- **Iterative and Stateful Client:** The `csv-processing.tsx` component maintains the state of the CSV data, applied changes, and suggestions, allowing for an iterative workflow.
- **Client-Side CSV Parsing:** Initial CSV parsing with PapaParse on the client improves responsiveness for file uploads and some interactions.
- **Human-in-the-Loop as a Core Principle:** The UI components for reviewing and validating AI suggestions (`suggestion-item.tsx`, anomaly/standardization review buttons) are central to the application's design, ensuring user control over data modifications. The Evaluation Dashboard and Issue Log further support this by providing feedback on the AI's performance.
- **Modular AI Flows:** Genkit flows are well-defined for specific tasks (e.g., `csv-cleaning-suggestions`, `data-profiling`), promoting reusability and maintainability.
- **Dynamic Imputation Options:** `suggestion-item.tsx` dynamically calculates mean, median, and mode from the _current_ CSV data for numeric imputation suggestions, providing relevant context to the user.

## Limitations

- **Scalability for Very Large CSVs:** Client-side parsing and manipulation of very large CSV files might lead to performance issues in the browser. Server-side processing is used for AI flows, but the entire dataset is often passed as a string. Streaming or chunking mechanisms are not explicitly detailed for large file handling.
- **Complexity of Pandas Code Execution:** While the system can generate Python (Pandas) code, the secure and efficient execution of arbitrary AI-generated code within a web application context is a complex problem and its full implementation details (e.g., sandboxing, resource management) are not fully evident from the provided files. It's marked as experimental.
- **SQL Processor Capabilities:** The non-AI `csv-direct-sql-processor.ts` supports only basic UPDATE/DELETE operations with simple WHERE clauses. More complex SQL queries would rely on the AI-powered `csv-sql-processing.ts`, whose accuracy depends on the LLM's interpretation.
- **Error Propagation from AI:** While UI error handling exists, the nuances of handling diverse errors or unexpected outputs from LLMs (e.g., hallucinations, malformed JSON not caught by schemas) can be challenging.
- **Context Window Limitations:** LLMs have context window limits. Processing extremely wide or complex CSVs, or very long user instructions, might hit these limits, affecting the quality of AI suggestions or command interpretations.
- **No Database Backend:** The application appears to operate on data in-memory (for the current session) or by processing uploaded files directly. There's no persistent storage for processed data or user accounts beyond session-based logs in `page.tsx`.

## Future Explorations

- **Streaming for Large Files:** Implement streaming for CSV parsing and processing to handle larger datasets more efficiently.
- **Advanced Pandas/Code Execution:** Integrate a secure sandbox environment (e.g., WebAssembly-based Python runtime, or a dedicated microservice) for executing AI-generated Python/Pandas code.
- **More Sophisticated SQL Engine:** Integrate a lightweight in-memory SQL engine (like AlaSQL.js or a WASM-based SQLite) for more robust SQL query execution on CSV data, potentially guided by AI.
- **User Accounts and Project Persistence:** Allow users to save their work, processed files, and settings.
- **Schema Inference and Management:** More advanced schema detection and tools for managing data types and constraints.
- **Automated Data Quality Rules:** Allow users to define custom data quality rules that can be automatically checked.
- **Enhanced Visualization:** Integrate more charting and visualization options for data profiling and analysis.
- **Batch Processing:** Support for processing multiple files or running tasks in the background.
- **Fine-tuning Models:** Explore possibilities for fine-tuning smaller, open-source LLMs (via Ollama) on specific data cleaning tasks or user feedback for improved performance and cost-efficiency.
- **Collaborative Features:** Allow multiple users to collaborate on data cleaning projects.

## Style Guidelines

As outlined in `docs/blueprint.md`:

- **Primary color:** Deep blue (`#1A237E`) - for trust and reliability.
- **Secondary color:** Light gray (`#F5F5F5`) - for backgrounds, ensuring readability.
- **Accent color:** Teal (`#008080`) - to highlight important actions and insights.
- **Typography:** Clear and concise for data presentation.
- **Layout:** Clean and organized to facilitate data review.
- **Icons:** Used to represent data types and actions for easy recognition.

This README aims to provide a comprehensive understanding of the DataMaestro project.

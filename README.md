# DataMaestro - AI-Powered CSV Processing Tool

## About The Project

DataMaestro is a web application designed to help users clean, process, and analyze CSV (Comma Separated Values) files. It leverages the power of Large Language Models (LLMs) through Genkit to provide intelligent suggestions for data cleaning, enable complex data transformations via natural language commands or SQL queries, and offer data profiling capabilities. The goal is to make CSV data wrangling more intuitive, efficient, and accessible.

The application provides a user-friendly interface for:

- Uploading CSV files.
- Generating and applying AI-driven cleaning suggestions (e.g., handling missing values, correcting data types, ensuring consistency).
- Processing CSV data using direct commands (interpreted by an LLM).
- Transforming CSV data using SQL queries (with both direct execution and LLM-assisted execution).
- Profiling data to understand its structure, quality, and statistical properties.
- Iteratively cleaning and refining datasets.

## Getting Started

Follow these instructions to get a local copy up and running.

### Prerequisites

- **Node.js**: Make sure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/). (Check `package.json` for specific version compatibility if listed under `engines`, otherwise a recent LTS version should work).
- **npm** or **yarn**: These package managers come with Node.js. This project uses npm based on the `package.json`.
- **(Optional) Ollama**: If you intend to use local LLMs via Ollama, ensure Ollama is installed and running. You can find installation instructions at [ollama.com](https://ollama.com/). You will also need to pull the models specified in the application (e.g., `gemma3:4b`).

### Installation & Setup

1.  **Clone the repository:**

    ```powershell
    git clone <your-repository-url>
    cd DataMaestro
    ```

2.  **Install NPM packages:**

    ```powershell
    npm install
    ```

3.  **Environment Variables (if any):**
    If your project requires environment variables (e.g., API keys for Genkit providers like Google AI), create a `.env.local` file in the root directory and add them there. For example:
    ```
    GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
    # Add other environment variables as needed
    ```
    Consult `src/ai/ai-instance.ts` or related configuration files for required environment variables.

### Running the Application

1.  **Start the Genkit AI Flows (Development Mode):**
    This command starts the Genkit flows, often making them available for the Next.js frontend to call. It will typically watch for changes in your AI flow definitions.

    ```powershell
    npm run genkit:dev
    ```

    Alternatively, to have it watch for changes:

    ```powershell
    npm run genkit:watch
    ```

2.  **Start the Next.js Development Server:**
    This command starts the Next.js frontend application.
    ```powershell
    npm run dev
    ```
    The application should now be accessible at `http://localhost:9002` (or the port specified in your `dev` script).

### Other Useful Scripts

- **Build for production:**
  ```powershell
  npm run build
  ```
- **Start in production mode (after building):**
  ```powershell
  npm run start
  ```
- **Lint the code:**
  ```powershell
  npm run lint
  ```
- **Type check with TypeScript:**
  ```powershell
  npm run typecheck
  ```

## Project Structure & Workflow

Understanding the directory structure will help you navigate the codebase:

- `n:/DataMaestro/`
  - `package.json`: Lists project dependencies and scripts.
  - `next.config.ts`: Configuration for the Next.js framework.
  - `tsconfig.json`: TypeScript compiler options.
  - `tailwind.config.ts`: Configuration for Tailwind CSS.
  - `src/`: Contains all the source code.
    - `ai/`: Core of the AI functionalities.
      - `ai-instance.ts`: Likely initializes AI models and configurations (e.g., Genkit setup, model providers).
      - `dev.ts`: Entry point for running Genkit flows in development (used by `genkit:dev` script).
      - `flows/`: Contains the definitions for various AI-driven data processing flows.
        - `apply-csv-changes.ts`: Logic for applying approved cleaning suggestions to the CSV data.
        - `csv-cleaning-suggestions.ts`: Generates suggestions for cleaning the CSV data.
        - `csv-direct-commands.ts`: Processes CSV data based on natural language commands using an LLM. For this, the system sends CSV column headers and a sample of data rows (not the entire dataset) to the LLM for contextual understanding, balancing effectiveness with efficiency.
        - `csv-direct-processor.ts`: A more direct (potentially rule-based or simpler LLM) CSV command processor.
        - `csv-direct-sql-processor.ts`: Processes CSV data using SQL queries directly.
        - `csv-sql-processing.ts`: Processes CSV data using SQL queries, potentially with LLM assistance for query understanding or generation.
        - `data-profiling.ts`: Logic for analyzing and generating a profile of the CSV data.
        - `schemas/`: Defines data structures and schemas (using Zod) for AI inputs, outputs, and internal representations.
          - `csv-processor-types.ts`: Common types used across CSV processing flows.
          - `csv-schemas.ts`: Zod schemas specifically for CSV data and cleaning suggestions.
    - `app/`: Next.js specific application structure (routing, layouts, pages).
      - `layout.tsx`: Main layout component for the application.
      - `page.tsx`: The main page component, likely hosting the primary CSV processing interface.
      - `globals.css`: Global styles.
    - `components/`: Reusable React components used throughout the application.
      - `csv-processing.tsx`: The core UI component for handling CSV file uploads, displaying suggestions, applying changes, and interacting with various processing modes (suggestions, SQL, commands). This is a central piece of the user interface.
      - `data-profiling.tsx`: UI component for displaying data profiling results.
      - `suggestion-item.tsx`: Component for rendering individual cleaning suggestions.
      - `ui/`: Contains Shadcn UI components (Button, Card, Input, etc.) that form the building blocks of the interface.
    - `hooks/`: Custom React hooks.
      - `use-toast.ts`: Hook for displaying toast notifications.
    - `lib/`: Utility functions.
      - `utils.ts`: General utility functions.
  - `docs/`: Contains documentation like `blueprint.md`.

### General Workflow Example

1.  **Upload:** User uploads a CSV file via the interface in `csv-processing.tsx`.
2.  **Initial State:** The data is loaded, and a preview might be shown.
3.  **User Action (Choose one or more):**
    - **Get Suggestions:** User requests cleaning suggestions. `csv-processing.tsx` calls an AI flow (e.g., `suggestCsvCleaningActions` from `csv-cleaning-suggestions.ts`). The LLM analyzes the data and returns potential cleaning actions.
    - **Profile Data:** User requests a data profile. `csv-processing.tsx` calls a flow like `profileData` from `data-profiling.ts`. Results are displayed using `data-profiling.tsx`.
    - **Direct Commands:** User enters natural language commands (e.g., "remove rows where column X is empty"). `csv-processing.tsx` sends this to a flow like `processCsvWithCommands` (from `csv-direct-commands.ts`) or `processDirectCsv` (from `csv-direct-processor.ts`).
    - **SQL Processing:** User enters a SQL query. `csv-processing.tsx` sends this to a flow like `processCsvWithSql` (from `csv-sql-processing.ts`) or `processDirectSql` (from `csv-direct-sql-processor.ts`).
4.  **Review & Approve (for suggestions):** Suggestions are displayed using `suggestion-item.tsx`. User reviews, modifies, and approves/rejects them.
5.  **Apply Changes:**
    - For suggestions: `csv-processing.tsx` calls `applyCsvApprovedChanges` (from `apply-csv-changes.ts`) with the approved actions.
    - For commands/SQL: The respective flow directly returns the processed CSV data.
6.  **Update & Iterate:** The `currentCsvData` state in `csv-processing.tsx` is updated. The user can then download the processed data or perform further actions (profiling the cleaned data, applying more suggestions, etc.), enabling an iterative data cleaning process.

## Technologies Used

This project is built with the following core technologies:

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend/AI Flows:** Genkit, Google AI (Vertex AI / Gemini), Ollama (for local models)
- **Data Handling:** PapaParse (for CSV parsing), Zod (for schema validation)
- **Development:** Node.js, npm

## Why AI/LLMs for CSV Processing?

Traditional CSV processing tools often require users to write complex scripts (e.g., Python with Pandas) or manually perform repetitive tasks. LLMs offer several advantages in this domain:

1.  **Natural Language Understanding:** Users can specify data cleaning or transformation tasks using plain English (or other languages), lowering the barrier to entry for non-programmers. For example, instead of writing a regex, a user might say "make all email addresses lowercase."
2.  **Intelligent Suggestions:** LLMs can analyze the data contextually and provide relevant suggestions for cleaning and improvement that might not be immediately obvious (e.g., identifying inconsistent date formats, suggesting imputation methods for missing data based on column semantics).
3.  **Handling Ambiguity & Complexity:** LLMs can often interpret ambiguous instructions and handle more complex, multi-step transformations that would be cumbersome to define with traditional rules or scripts.
4.  **Flexibility:** They can adapt to a wide variety of CSV structures and data quality issues without needing pre-defined rules for every scenario.
5.  **Efficiency for Exploratory Data Cleaning:** LLMs can accelerate the initial stages of data cleaning by quickly identifying common issues and proposing solutions, allowing data analysts to focus on more nuanced problems.
6.  **Contextual Data Imputation:** When filling missing values, LLMs can potentially make more informed decisions based on the surrounding data and the inferred meaning of the column, rather than just statistical measures like mean or median.
7.  **Advanced Data Operations:** The system supports a wide range of data processing capabilities including conditional operations with numeric comparisons and pattern matching, date/time operations, statistical transformations, text processing, data classification/binning, and dataset structure operations.

While LLMs are powerful, this project also incorporates direct processors (for commands and SQL) which can be more efficient and deterministic for well-defined tasks, offering a hybrid approach.

## Supported Natural Language Commands

DataMaestro supports an extensive range of data processing operations through natural language commands:

### Basic Operations

- Find and replace text values
- Standardize column values
- Fill missing values
- Convert case (uppercase/lowercase)
- Sort data
- Filter rows based on conditions
- Remove duplicate rows

### Advanced Operations

#### Conditional Operations

- Numeric comparisons (less than, greater than, equal to)
- Wildcard pattern matching (like "big %", "% big")
- Percentage-based operations (e.g., "top 10%", "bottom 5%")

#### Date and Time Operations

- Format conversion (e.g., "Convert dates in 'Order_Date' to YYYY-MM-DD format")
- Date extraction (e.g., "Extract month from 'Transaction_Date'")
- Date-based filtering and comparison

#### Statistical Transformations

- Z-score calculations
- Normalization
- Moving averages
- Outlier detection and handling
- Statistical imputation (mean, median, etc.)

#### Text Processing and Extraction

- Character extraction
- String splitting
- Text concatenation
- Pattern extraction (e.g., email domains)
- Special character handling

#### Data Classification and Binning

- Numeric binning (e.g., age groups, price ranges)
- Quartile-based classification
- Multi-condition classification

#### Dataset Structure Operations

- Pivot tables
- Melt operations (wide to long format)
- Transpose operations

## Supported SQL Processing Operations

DataMaestro offers a comprehensive SQL processing mode for more direct and structured data manipulation:

### SELECT Operations

- Select all columns: `SELECT * FROM data`
- Select specific columns: `SELECT Column1, Column2 FROM data`
- Select with filtering: `SELECT * FROM data WHERE Column = 'Value'`

SELECT queries display filtered results without modifying the original data. The UI provides:

- A preview of filtered data (first 5 rows)
- Options to apply the filtered results to the current dataset
- A download button to save the filtered results as a new CSV file
- Information about how many rows were returned by the query

### UPDATE Operations

- Update all rows: `UPDATE data SET Column = 'New Value'`
- Update with conditions: `UPDATE data SET Column = 'New Value' WHERE Column2 = 'Condition'`
- Update with IN clause: `UPDATE data SET Column = 'New Value' WHERE Column2 IN ('Value1', 'Value2')`

### DELETE Operations

- Delete rows with conditions: `DELETE FROM data WHERE Column = 'Value'`
- Delete with numeric comparisons: `DELETE FROM data WHERE Column > 100`
- Note: DELETE without WHERE clause is not supported for safety

### WHERE Clause Conditions

- Equality operations: `WHERE Column = 'Value'`
- Numeric comparisons: `WHERE Column > 100`, `WHERE Column <= 50`, `WHERE Column != 0`
- Pattern matching with LIKE: `WHERE Column LIKE '%pattern%'`, `WHERE Column LIKE 'start%'`, `WHERE Column LIKE '%end'`
  - `%` is a wildcard for any number of characters
  - `_` is a wildcard for a single character
- IN clause for multiple values: `WHERE Column IN ('Value1', 'Value2', 'Value3')`

The SQL processor implementation handles these operations efficiently without relying on external database engines, processing the data directly in memory and providing detailed summaries of the changes made.

## Future Enhancements (Example Ideas)

- Advanced anomaly detection.
- Automated data standardization against predefined schemas.
- Visualizations for data profiling results.
- Support for more complex data transformation recipes.
- Integration with more data sources or destinations.

---

## Troubleshooting

- **Ollama Model Not Found (e.g., `Error: Model 'model-name' not found`):**
  - Ensure Ollama is running.
  - Verify the model name and tag are correct. You can list your locally available Ollama models using `ollama list` in your terminal.
  - If the model is not present locally, pull it using `ollama pull model-name:tag`.
  - Update the `ollamaModel` state in `src/components/csv-processing.tsx` if you are using a different model name/tag than the default.
- **Genkit Flows Not Starting:**
  - Check the console output when running `npm run genkit:dev` or `npm run genkit:watch` for any error messages.
  - Ensure any required environment variables (like API keys) are correctly set in your `.env.local` file.

## Contributing

We welcome contributions! If you'd like to contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature-name`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add some feature'`).
5. Push to the branch (`git push origin feature/your-feature-name`).
6. Open a Pull Request.

Please make sure your code adheres to the existing style and that all tests pass.

## License

This project is licensed under the Nisham_license.

# DataMaestro

## Project Overview

DataMaestro is a Next.js application designed to enhance data quality within a Customer Data Platform (CDP) using the power of Large Language Models (LLMs). It provides a suite of tools for cleaning, standardizing, profiling, and analyzing data, aiming to improve data reliability, consistency, and the ability to derive valuable insights.

The platform leverages Genkit to interact with LLMs (currently configured for Google Gemini) to perform complex data manipulation tasks, complemented by a user-friendly interface featuring human-in-the-loop validation and iterative refinement capabilities.

## Key Features

*   **Unified Data Analysis:** Input data via text area or file upload (JSON/CSV) to trigger multiple analyses:
    *   **AI-Powered Data Profiling:** Automatically analyzes datasets (JSON or CSV) to infer data types, identify distributions, detect missing values, find common formats, and flag potential quality issues.
    *   **AI-Powered Anomaly Detection:** Utilizes LLMs to identify outliers and inconsistencies in JSON data, providing descriptions and suggested corrections.
    *   **AI-Powered CSV Cleaning:** Cleans and standardizes data within uploaded CSV files based on general best practices or specific instructions.
*   **Continuous Prompting (Chat):** An interactive chat interface allowing users to iteratively refine data or ask questions about the dataset using the LLM.
*   **Human-in-the-Loop Validation:** (Implicit in Anomaly Detection/Standardization flows) Allows users to review and approve/reject suggestions made by the LLM (currently integrated within the individual flows, logs rejections).
*   **Issue Log:** Tracks items (anomalies, standardizations) that were rejected by the user during validation, providing insights for model/prompt improvement.
*   **Modular AI Flows:** Uses Genkit flows for distinct AI tasks, making the system extensible.

## Technology Stack

*   **Frontend:** Next.js (App Router), React, TypeScript
*   **Styling:** Tailwind CSS, ShadCN UI Components
*   **AI Integration:** Genkit, Google Gemini (via `@genkit-ai/googleai`)
*   **Data Handling:** PapaParse (for CSV parsing)
*   **Utilities:** Lucide React (Icons), date-fns (Date formatting)

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended)
*   npm, yarn, or pnpm package manager

### Installation

1.  Clone the repository:
    ```bash
    git clone <your-repository-url>
    cd DataMaestro
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

### Environment Setup

1.  Create a `.env` file in the root of the project.
2.  Add your Google Generative AI API key to the `.env` file:
    ```dotenv
    GOOGLE_GENAI_API_KEY=YOUR_API_KEY_HERE
    ```
    *Note: The application currently relies on the Google Gemini model available through the `@genkit-ai/googleai` plugin. Ensure your API key has access to the required models (e.g., `gemini-1.5-flash`).*

### Running the Development Server

1.  Start the Next.js development server:
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```
2.  Open your browser and navigate to [http://localhost:9002](http://localhost:9002).

### Running the Genkit Development Server (Optional)

For debugging and inspecting Genkit flows:

```bash
npm run genkit:dev
# or for watching changes
npm run genkit:watch
```
This usually starts the Genkit UI on `http://localhost:4000`.

## Usage

1.  **Data Analysis:**
    *   Navigate to the "Unified Data Analysis" card.
    *   Either paste JSON or CSV data directly into the text area OR upload a `.json` or `.csv` file.
    *   Click "Analyze Data".
    *   The application will automatically detect the format and run relevant analyses (Profiling, Anomaly Detection for JSON, CSV Cleaning for CSV).
    *   Results for each analysis step will be displayed in separate cards below the input.
2.  **Continuous Prompting:**
    *   Go to the "Continuous Prompting (Chat)" card.
    *   Enter your prompts or questions about the data in the chat input.
    *   The LLM will respond based on the conversation history and its capabilities. Use this for iterative refinement or asking specific data questions.
3.  **Issue Log:**
    *   Rejected suggestions from anomaly detection or standardization (if re-enabled) will appear in the "Issue Log" card, showing the context and the rejected suggestion.

## Project Structure

```
DataMaestro/
├── public/               # Static assets
├── src/
│   ├── ai/               # Genkit AI configuration and flows
│   │   ├── flows/        # Specific AI task flows (profiling, anomaly, csv, chat)
│   │   └── ai-instance.ts # Genkit initialization and model config
│   ├── app/              # Next.js App Router pages and layout
│   │   ├── (main)/       # Main application layout route group (if used)
│   │   ├── api/          # API routes (Genkit integration)
│   │   ├── globals.css   # Global styles and Tailwind directives
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Main application page component
│   ├── components/       # React components
│   │   ├── ui/           # ShadCN UI components
│   │   └── *.tsx         # Application-specific components (DataAnalysis, IssueLog, etc.)
│   ├── hooks/            # Custom React hooks (use-toast, use-mobile)
│   └── lib/              # Utility functions (cn)
├── .env                  # Environment variables (API Keys) - **DO NOT COMMIT SENSITIVE KEYS**
├── next.config.mjs       # Next.js configuration
├── package.json          # Project dependencies and scripts
├── tailwind.config.ts    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Future Enhancements (Based on Research Goals)

*   **Model Comparison:** Integrate UI elements to select and compare different LLMs (e.g., other Gemini versions, potentially Claude, open-source models via APIs if free tiers allow).
*   **Evaluation Dashboard:** Implement a dedicated dashboard to evaluate LLM performance based on accuracy (user validation), efficiency (processing time), and potentially compare against baseline methods.
*   **Advanced Error Handling:** Improve error messages and potentially implement retry logic or more sophisticated error analysis within the flows.
*   **Bias Detection & Mitigation:** Research and implement techniques to identify and address potential biases in LLM outputs.
*   **Scalability Testing:** Evaluate performance with larger datasets.
*   **Refined Human-in-the-Loop:** Enhance the UI for reviewing and acting upon LLM suggestions across all relevant features.

## License

[Specify License Here - e.g., MIT]
```
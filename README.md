# DataMaestro

## Overview

DataMaestro is a web-based platform that helps business analysts and data professionals clean, transform, and analyze CSV data quickly—without writing code. By combining AI-powered suggestions, natural language commands, and familiar SQL, DataMaestro streamlines data preparation so you can focus on insights, not wrangling.

**Business Value:**

- Reduce manual data cleaning time
- Improve data quality and consistency
- Empower non-technical users to prepare data for analysis
- Accelerate reporting and decision-making

## Technology Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, Shadcn UI
- **AI/Backend:** Genkit, Google AI (Vertex AI/Gemini), Ollama (optional for local models)
- **Data Handling:** PapaParse (CSV), Zod (validation)
- **Dev Tools:** Node.js, npm

## Key Features

- **AI Suggestions:** Get actionable recommendations for cleaning and standardizing your data
- **Natural Language Commands:** Describe changes in plain English (e.g., "Fill missing values in Revenue with 0")
- **SQL Mode:** Use simple SQL queries for filtering, updating, or deleting rows
- **Data Profiling:** Instantly see column types, missing values, and summary stats
- **Anomaly Detection:** Identify outliers and inconsistencies
- **English Correction:** Improve grammar and clarity in text columns

## Typical Workflow

1. **Upload CSV**: Drag and drop your file
2. **Preview & Profile**: Review data structure and quality
3. **Choose Mode**: Select AI Suggestions, Command, or SQL
4. **Apply Changes**: Approve or reject suggested or requested changes
5. **Download**: Export the cleaned CSV for further analysis

For a detailed workflow and architecture diagrams, see [docs/README_DATA_PROCESSING.md](./docs/README_DATA_PROCESSING.md) and [docs/CSV_PROCESSING_FLOWCHARTS.md](./docs/CSV_PROCESSING_FLOWCHARTS.md).

## Example Usage

- **AI Suggestion:**
  - "Fill missing values in 'Age' with the median"
- **Command Mode:**
  - "Standardize dates in 'OrderDate' to YYYY-MM-DD"
- **SQL Mode:**
  - `SELECT Name, Revenue FROM data WHERE Revenue > 1000`

(For more examples, see [docs/CSV_PROCESSING_FLOWS.md](./docs/CSV_PROCESSING_FLOWS.md))

## Troubleshooting

- **Ollama Model Not Found:**
  - Ensure Ollama is running and the model is installed (`ollama list`)
- **Genkit Flows Not Starting:**
  - Check environment variables and run `npm install` to ensure dependencies
- **Unexpected Results:**
  - Try rephrasing commands, use a different mode, or break complex tasks into steps
- **Large Files (>5MB):**
  - Performance may degrade; consider splitting large files

## Roadmap / Future Enhancements

- Support for more complex transformation recipes
- Improved local AI model integration
- Enhanced data visualization and reporting
- Integration with more data sources/destinations
- Expanded direct (non-AI) processing for common tasks

## Documentation

- [Data Processing Architecture](./docs/README_DATA_PROCESSING.md)
- [CSV Processing Flows](./docs/CSV_PROCESSING_FLOWS.md)
- [Processing Flowcharts](./docs/CSV_PROCESSING_FLOWCHARTS.md)
- [Detailed Feature Docs](./docs/Readme_detailed.md)

## License

See project for license details.

---

_For questions or feedback, please open an issue or see the documentation above._

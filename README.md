<div align="center">
  
# 🧠 DataMaestro

<img src="https://img.shields.io/badge/version-1.0.0-success?style=for-the-badge" alt="Version 1.0.0"/>
<a href="https://data-maestro.vercel.app/"><img src="https://img.shields.io/badge/Live_Demo-data--maestro.vercel.app-blue?style=for-the-badge&logo=vercel" alt="Live Demo"/></a>
<img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
<img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"/>

<h3>AI-Powered CSV Processing Platform with Intelligent Workflow Tools</h3>

<kbd>
  <img src="https://img.shields.io/badge/AI_Driven-2962FF?style=flat-square&logo=openai&logoColor=white" alt="AI Driven"/>
  <img src="https://img.shields.io/badge/CSV_Processing-00A98F?style=flat-square&logo=databricks&logoColor=white" alt="CSV Processing"/>
  <img src="https://img.shields.io/badge/SQL_Mode-0078D7?style=flat-square&logo=sql&logoColor=white" alt="SQL Mode"/>
  <img src="https://img.shields.io/badge/Command_Mode-FF6C37?style=flat-square&logo=terminal&logoColor=white" alt="Command Mode"/>
  <img src="https://img.shields.io/badge/Suggestion_Mode-2ECB68?style=flat-square&logo=checkmarx&logoColor=white" alt="Suggestion Mode"/>
</kbd>

</div>

## 📋 Table of Contents

- [About The Project](#about-the-project)
- [Core Processing Modes](#-core-processing-modes)
- [Advanced Features](#-advanced-features)
- [User-Friendly Interface](#-user-friendly-interface)
- [Getting Started](#getting-started)
- [CSV Processing Workflow](#csv-processing-workflow)
- [Project Structure & Workflow](#project-structure--workflow)
- [General Workflow](#-general-workflow)
- [Detailed Feature Descriptions](#-detailed-feature-descriptions)
- [Technologies Used](#-technologies-used)
- [Why AI/LLMs for CSV Processing](#why-aillms-for-csv-processing)
- [Supported Natural Language Commands](#-supported-natural-language-commands)
- [Supported SQL Processing Operations](#-supported-sql-processing-operations)
- [Key Features](#-key-features)
- [Limitations and Known Issues](#-limitations-and-known-issues)
- [Future Enhancements](#future-enhancements)
- [Usage Notes and Reliability](#-usage-notes-and-reliability)
- [Troubleshooting](#-troubleshooting)
- [Data Processing Architecture](#-data-processing-architecture)
- [Contributing](#-contributing)
- [License](#-license)

## About The Project

<div class="project-card" style="padding: 20px; border-radius: 8px; background-color: #f8f9fa; margin-bottom: 20px;">
<p>DataMaestro is an intelligent web application designed to revolutionize how users clean, process, and analyze CSV (Comma Separated Values) files. By combining the power of Large Language Models (LLMs) with purpose-built data processing engines, it offers a comprehensive suite of tools for modern data management:</p>

<table>
<tr>
<td align="center" width="60"><img src="https://img.shields.io/badge/UI-2962FF?style=flat-square&logo=material-ui&logoColor=white" alt="UI"/></td>
<td><b>Intuitive Interface</b>: User-friendly design for data professionals of all skill levels</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/AI-FF6C37?style=flat-square&logo=openai&logoColor=white" alt="AI"/></td>
<td><b>AI-Driven Processing</b>: Smart data cleaning suggestions and natural language command execution</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/Mode-00A98F?style=flat-square&logo=databricks&logoColor=white" alt="Mode"/></td>
<td><b>Multi-Modal Approach</b>: Process data via AI suggestions, natural language commands, or SQL queries</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/Analytics-0078D7?style=flat-square&logo=analytics&logoColor=white" alt="Analytics"/></td>
<td><b>Advanced Analytics</b>: In-depth data profiling, standardization, and anomaly detection</td>
</tr>
</table>
</div>

### 🔄 Core Processing Modes

<table>
<tr>
  <td width="33%" align="center"><b>🔍 Suggestion Mode</b></td>
  <td width="33%" align="center"><b>💬 Command Mode</b></td>
  <td width="33%" align="center"><b>🔢 SQL Mode</b></td>
</tr>
<tr>
  <td>
    Leverages Large Language Models (LLMs) through Genkit to provide intelligent suggestions for data cleaning (e.g., handling missing values, correcting data types).<br><br>
    <code>src/ai/flows/csv-cleaning-suggestions.ts</code><br>
    <code>src/ai/flows/apply-csv-changes.ts</code>
  </td>
  <td>
    Allows users to manipulate data using natural language commands, processed primarily by an LLM with an alternative direct processor available for simpler operations.<br><br>
    <code>src/ai/flows/csv-direct-commands.ts</code><br>
    <code>src/ai/flows/csv-direct-processor.ts</code>
  </td>
  <td>
    Enables data transformation using SQL queries, with simpler operations handled by a custom parser for direct execution and complex queries processed with AI assistance.<br><br>
    <code>src/ai/flows/csv-direct-sql-processor.ts</code><br>
    <code>src/ai/flows/csv-sql-processing.ts</code>
  </td>
</tr>
</table>

### 🚀 Advanced Features

<details>
<summary><b>📊 Data Profiling</b></summary>
<p>Analyzes CSV data to provide comprehensive insights about its structure, quality, and statistical properties, helping users understand their data before transformation.</p>
<p><code>src/ai/flows/data-profiling.ts</code></p>
</details>

<details>
<summary><b>🔄 Data Standardization</b></summary>
<p>Ensures consistency across data formats like dates, addresses, and text, maintaining data quality standards.</p>
<p><code>src/ai/flows/data-standardization.ts</code></p>
</details>

<details>
<summary><b>🔍 Data Anomaly Detection</b></summary>
<p>Identifies outliers, inconsistencies, and errors in data, helping maintain data integrity by flagging potential issues.</p>
<p><code>src/ai/flows/data-anomaly-detection.ts</code></p>
</details>

<details>
<summary><b>✏️ English Language Correction</b></summary>
<p>Enhances text by correcting grammar, adjusting tone/style, and formatting for different use cases.</p>
<p><code>src/ai/flows/english-correction.ts</code></p>

- **Correction Mode:** Improves existing text with different tones and styles
- **Generation Mode:** Creates new text from simple instructions (emails, tweets, etc.)
- **Smart Formatting:** Options for emails, tweets (including thread creation with character limits), and formal writing
- **Style Options:** Various tones (casual, professional, funny, etc.) and grammar styles (including Gen Z casual)
- **Integrated Translation:** Translation instructions can be included directly in the text prompt:
  - Supports translating to numerous languages through natural language instructions
  - Can provide native script and optional romanization based on the user's prompt
  - Example prompts: "translate to Spanish" or "translate to Chinese and include romanization"
  </details>

<details>
<summary><b>📈 Evaluation Dashboard</b></summary>
<p>Provides metrics on accuracy and performance of data processing operations, helping track the effectiveness of AI-generated suggestions.</p>
<p><code>src/components/evaluation-dashboard.tsx</code></p>
</details>

The overall goal is to make CSV data wrangling more intuitive, efficient, and accessible by combining the strengths of direct processing and AI.

### 💻 User-Friendly Interface

DataMaestro provides an intuitive interface for:

<div align="center">
<table>
<tr>
<td align="center"><b>📤</b></td>
<td><b>Upload CSV Files</b></td>
<td>Simply drag & drop or select files to begin processing</td>
</tr>
<tr>
<td align="center"><b>🧹</b></td>
<td><b>AI-Driven Cleaning</b></td>
<td>Generate and apply intelligent suggestions for missing values, data types, and consistency issues</td>
</tr>
<tr>
<td align="center"><b>💬</b></td>
<td><b>Natural Language Commands</b></td>
<td>Process CSV data using plain English instructions</td>
</tr>
<tr>
<td align="center"><b>🔢</b></td>
<td><b>SQL Transformations</b></td>
<td>Use familiar SQL syntax for powerful data manipulation</td>
</tr>
<tr>
<td align="center"><b>📊</b></td>
<td><b>Data Profiling</b></td>
<td>Understand your data's structure, quality, and statistical properties</td>
</tr>
<tr>
<td align="center"><b>🔄</b></td>
<td><b>Iterative Refinement</b></td>
<td>Clean and improve datasets through step-by-step processing</td>
</tr>
</table>
</div>

## Getting Started

<div align="center">
  <a href="https://data-maestro.vercel.app/"><img src="https://img.shields.io/badge/🌐_Live_Demo_Available-data--maestro.vercel.app-2962FF?style=for-the-badge" alt="Live Demo"/></a>
</div>

### ⚡ Quick Start

<div class="quick-start-card" style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
<table>
<tr>
<td align="center" width="80"><img src="https://img.shields.io/badge/1-2962FF?style=flat-square&logoColor=white" alt="1"/></td>
<td><b>Visit Live Demo:</b> Go to <a href="https://data-maestro.vercel.app/">data-maestro.vercel.app</a></td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/2-2962FF?style=flat-square&logoColor=white" alt="2"/></td>
<td><b>Upload CSV:</b> Drag & drop or select a CSV file</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/3-2962FF?style=flat-square&logoColor=white" alt="3"/></td>
<td><b>Choose Mode:</b> Select Suggestion, Command, or SQL mode</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/4-2962FF?style=flat-square&logoColor=white" alt="4"/></td>
<td><b>Process Data:</b> Let AI clean and transform your data</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/5-2962FF?style=flat-square&logoColor=white" alt="5"/></td>
<td><b>Download Results:</b> Save your cleaned CSV data</td>
</tr>
</table>
</div>

For local development, follow these instructions to get a local copy up and running.

### 🔧 Prerequisites

<div class="prerequisites-card">
<table>
<tr>
<td align="center" width="15%"><img src="https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white" alt="Node.js"/></td>
<td width="85%">Make sure you have Node.js installed. Download from <a href="https://nodejs.org/">nodejs.org</a>. A recent LTS version is recommended.</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/npm-CB3837?style=flat-square&logo=npm&logoColor=white" alt="npm"/></td>
<td>This package manager comes with Node.js. DataMaestro uses npm based on the package.json configuration.</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/Ollama-optional-5A29E4?style=flat-square&logoColor=white" alt="Ollama"/></td>
<td><b>(Optional)</b> For local LLMs via Ollama, ensure Ollama is installed and running. Get it from <a href="https://ollama.com/">ollama.com</a>. You'll need to pull the models specified in the application (e.g., <code>gemma3:4b</code>).</td>
</tr>
</table>
</div>

### 🛠️ Installation & Setup

<div class="setup-card">
<table>
<tr>
<td align="center" width="10%">1️⃣</td>
<td width="90%">
<b>Clone the repository:</b>

```powershell
git clone <your-repository-url>
cd DataMaestro
```

</td>
</tr>

<tr>
<td align="center">2️⃣</td>
<td>
<b>Install NPM packages:</b>

```powershell
npm install
```

</td>
</tr>

<tr>
<td align="center">3️⃣</td>
<td>
<b>Environment Variables (if any):</b>

If your project requires environment variables (e.g., API keys for Genkit providers like Google AI), create a <code>.env.local</code> file in the root directory and add them there:

```
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
# Add other environment variables as needed
```

Consult <code>src/ai/ai-instance.ts</code> for required environment variables.

</td>
</tr>
</table>
</div>

### 🚀 Running the Application

<div class="running-card">
<table>
<tr>
<td align="center" width="10%">1️⃣</td>
<td width="90%">
<b>Start the Genkit AI Flows (Development Mode):</b>
<p>This command starts the Genkit flows, making them available for the Next.js frontend to call.</p>

```powershell
npm run genkit:dev
```

<p>Alternatively, to have it watch for changes:</p>

```powershell
npm run genkit:watch
```

</td>
</tr>

<tr>
<td align="center">2️⃣</td>
<td>
<b>Start the Next.js Development Server:</b>
<p>This command starts the Next.js frontend application.</p>

```powershell
npm run dev
```

<p>The application should now be accessible at <code>http://localhost:9002</code> (or the port specified in your <code>dev</code> script).</p>
</td>
</tr>
</table>
</div>

### ⚙️ Other Useful Scripts

<div align="center">
<table>
<tr>
<td width="50%">
<b>Build for production:</b>

```powershell
npm run build
```

</td>
<td width="50%">
<b>Start in production mode:</b>

```powershell
npm run start
```

</td>
</tr>

<tr>
<td width="50%">
<b>Lint the code:</b>

```powershell
npm run lint
```

</td>
<td width="50%">
<b>Type check with TypeScript:</b>

```powershell
npm run typecheck
```

</td>
</tr>
</table>
</div>

## 🖼️ Demo

<div class="demo-section" style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
<p align="center">Experience DataMaestro in action with these screenshots:</p>

<div align="center">
<table>
<tr>
<td width="50%" align="center">
  <p><b>📤 CSV Upload & Preview</b></p>
  <kbd>
    <img src="https://via.placeholder.com/400x250?text=CSV+Upload+Screenshot" alt="CSV Upload Interface" width="400"/>
  </kbd>
  <p><small>Intuitive drag & drop interface for CSV files</small></p>
</td>
<td width="50%" align="center">
  <p><b>🔍 Suggestion Mode</b></p>
  <kbd>
    <img src="https://via.placeholder.com/400x250?text=Suggestion+Mode+Screenshot" alt="Suggestion Mode Interface" width="400"/>
  </kbd>
  <p><small>AI-generated suggestions for data cleaning</small></p>
</td>
</tr>
<tr>
<td width="50%" align="center">
  <p><b>💬 Command Mode</b></p>
  <kbd>
    <img src="https://via.placeholder.com/400x250?text=Command+Mode+Screenshot" alt="Command Mode Interface" width="400"/>
  </kbd>
  <p><small>Natural language command processing</small></p>
</td>
<td width="50%" align="center">
  <p><b>🔢 SQL Mode</b></p>
  <kbd>
    <img src="https://via.placeholder.com/400x250?text=SQL+Mode+Screenshot" alt="SQL Mode Interface" width="400"/>
  </kbd>
  <p><small>SQL-based data transformation</small></p>
</td>
</tr>
</table>
</div>

<p align="center">
  <a href="https://data-maestro.vercel.app/"><img src="https://img.shields.io/badge/Try_It_Yourself-data--maestro.vercel.app-2962FF?style=for-the-badge&logo=vercel" alt="Try It Yourself"/></a>
</p>
</div>

## CSV Processing Workflow

DataMaestro provides three powerful approaches to process your CSV data:

### Data Processing Flow

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

### 1. Suggestion Mode

AI examines your data and generates intelligent suggestions:

1. **Data Analysis**: System samples your data and detects issues
2. **Suggestion Generation**: AI creates actionable suggestions with confidence scores
3. **User Control**: You review and approve/reject each suggestion
4. **Transformation**: System applies only your approved changes

**Example**: AI detects missing values in the "Age" column and suggests filling them with the median value of 33, which you can approve or reject.

### 2. Command Mode

Transform data using natural language instructions:

1. **Command Entry**: You enter instructions like "standardize dates in 'Date' column to YYYY-MM-DD"
2. **Pattern Recognition**: System identifies common operation patterns
3. **AI Processing**: For complex commands, AI interprets your intent
4. **Execution**: System applies transformations based on your instructions

**Example**: "Fill all missing values in 'Revenue' column with 0" is processed and applied to your data.

### 3. SQL Mode

Use SQL queries with AI assistance:

1. **Query Input**: Enter SQL or SQL-like queries
2. **Processing**: System executes queries directly or with AI assistance for complex ones
3. **Result Generation**: Transformed data is presented with statistics

**Example**: `SELECT Product, Region, SUM(Sales) FROM data GROUP BY Product, Region ORDER BY SUM(Sales) DESC`

For detailed technical information about the data processing architecture, see:

- [Data Processing Architecture](./docs/README_DATA_PROCESSING.md) - Detailed explanation of data processing
- [CSV Processing Flows](./docs/CSV_PROCESSING_FLOWS.md) - In-depth technical flow documentation
- [Processing Flowcharts](./docs/CSV_PROCESSING_FLOWCHARTS.md) - Visual flowcharts of processing pathways## Project Structure & Workflow

<div class="directory-structure" style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
<p>Understanding the directory structure will help you navigate the codebase:</p>

```
📂 DataMaestro2/
├── 📄 package.json         # Dependencies and scripts
├── 📄 next.config.ts       # Next.js configuration
├── 📄 tsconfig.json        # TypeScript compiler options
├── 📄 tailwind.config.ts   # Tailwind CSS configuration
├── 📂 docs/
│   ├── 📄 blueprint.md               # Project planning docs
│   ├── 📄 CSV_PROCESSING_FLOWCHARTS.md  # Visual flow representations
│   ├── 📄 CSV_PROCESSING_FLOWS.md       # Technical flow documentation
│   └── 📄 README_DATA_PROCESSING.md     # Data processing documentation
└── 📂 src/
    ├── 📂 ai/                        # Core AI functionality
    │   ├── 📄 ai-instance.ts         # AI models initialization
    │   ├── 📄 dev.ts                 # Development entry point
    │   ├── 📂 flows/                 # AI processing flows
    │   │   ├── 📄 apply-csv-changes.ts       # Apply cleaning suggestions
    │   │   ├── 📄 csv-cleaning-suggestions.ts # Generate cleaning suggestions
    │   │   ├── 📄 csv-direct-commands.ts     # Natural language processing
    │   │   ├── 📄 csv-direct-processor.ts    # Direct command processor
    │   │   ├── 📄 csv-direct-sql-processor.ts # SQL processor
    │   │   ├── 📄 csv-pandas-processor.ts    # Pandas-like operations
    │   │   ├── 📄 csv-processor-helpers.ts   # Helper functions
    │   │   ├── 📄 csv-sql-processing.ts      # SQL with LLM assistance
    │   │   ├── 📄 data-anomaly-detection.ts  # Anomaly detection
    │   │   ├── 📄 data-profiling.ts          # Data profiling
    │   │   ├── 📄 data-standardization.ts    # Data standardization
    │   │   └── 📄 english-correction.ts      # Text correction
    │   └── 📂 schemas/               # Data structures & schemas
    │       ├── 📄 csv-processor-types.ts     # Common types
    │       └── 📄 csv-schemas.ts             # Zod schemas
    ├── 📂 app/                      # Next.js app structure
    │   ├── 📄 layout.tsx             # Main layout
    │   ├── 📄 page.tsx               # Main page
    │   └── 📄 globals.css            # Global styles
    ├── 📂 components/               # React components
    │   ├── 📄 csv-processing.tsx     # CSV upload & processing
    │   ├── 📄 data-anomaly-detection.tsx # Anomaly detection UI
    │   ├── 📄 data-profiling.tsx     # Data profiling UI
    │   ├── 📄 data-standardization.tsx # Standardization UI
    │   ├── 📄 english-correction.tsx # Text correction UI
    │   ├── 📄 evaluation-dashboard.tsx # Performance metrics
    │   ├── 📄 issue-log.tsx          # Processing issues log
    │   ├── 📄 suggestion-item.tsx    # Cleaning suggestion component
    │   └── 📂 ui/                    # Shadcn UI components
    ├── 📂 hooks/                    # Custom React hooks
    │   ├── 📄 use-mobile.tsx         # Mobile detection
    │   └── 📄 use-toast.ts           # Toast notifications
    └── 📂 lib/                      # Utility functions
        └── 📄 utils.ts               # General utilities
```

</div>

## 🔄 General Workflow

<div align="center">
<table>
<tr>
<th align="center">Step</th>
<th align="center">Action</th>
<th align="center">Description</th>
</tr>
<tr>
<td align="center">1️⃣</td>
<td><b>Upload CSV File</b></td>
<td>Start by uploading your CSV file through the intuitive drag-and-drop interface</td>
</tr>
<tr>
<td align="center">2️⃣</td>
<td><b>Review Preview</b></td>
<td>System automatically shows a preview of your data with basic statistics</td>
</tr>
<tr>
<td align="center">3️⃣</td>
<td><b>Choose Processing Mode</b></td>
<td>
  <ul>
    <li>🔍 <b>Suggestion Mode</b>: Get AI-generated cleaning suggestions</li>
    <li>💬 <b>Command Mode</b>: Enter natural language instructions</li>
    <li>🔢 <b>SQL Mode</b>: Write SQL queries to transform data</li>
  </ul>
</td>
</tr>
<tr>
<td align="center">4️⃣</td>
<td><b>Process & Review</b></td>
<td>System processes your data and shows results with detailed explanations</td>
</tr>
<tr>
<td align="center">5️⃣</td>
<td><b>Approve Changes</b></td>
<td>Review and approve changes before they're applied to your dataset</td>
</tr>
<tr>
<td align="center">6️⃣</td>
<td><b>Download or Continue</b></td>
<td>Download the processed CSV or continue refining with additional operations</td>
</tr>
</table>
</div>

This iterative approach allows you to clean and transform your data step-by-step, with full control over each change.

## 🔍 Detailed Feature Descriptions

<div align="center">
  <img src="https://img.shields.io/badge/AI_Powered-2962FF?style=flat-square&logo=openai&logoColor=white" alt="AI Powered"/>
  <img src="https://img.shields.io/badge/Multiple_Processing_Modes-00A98F?style=flat-square&logo=databricks&logoColor=white" alt="Multiple Processing Modes"/>
</div>

DataMaestro provides robust CSV data processing capabilities through multiple approaches:

<table>
<tr>
  <td width="33%" align="center"><b>✨ CSV Cleaning Suggestions</b></td>
  <td>
    <p>Uses advanced AI models to analyze CSV data and suggest appropriate cleaning actions. The system identifies issues like inconsistent formatting, missing values, or incorrect data types and provides contextual suggestions for fixing them.</p>
    <p><em>Processed with AI via Genkit</em></p>
  </td>
</tr>
<tr>
  <td width="33%" align="center"><b>🔢 SQL Processing</b></td>
  <td>
    <p>Supports two complementary processing methods:</p>
    <ul>
      <li><b>Custom SQL Parser (regex-based)</b>: For simpler queries like basic SELECT, UPDATE, DELETE operations with conditions using LIKE, IN, and standard comparisons.</li>
      <li><b>AI-assisted SQL Processing</b>: For handling complex queries when the direct parser can't interpret them, providing more flexibility.</li>
    </ul>
  </td>
</tr>
<tr>
  <td width="33%" align="center"><b>💬 Command Processing</b></td>
  <td>
    <p>Offers intuitive data transformation options:</p>
    <ul>
      <li><b>Natural Language Commands</b>: Allows users to describe data transformations in plain English. Processed with AI.</li>
      <li><b>Direct Command Processing</b>: For handling common operations through rule-based processing with custom parsers.</li>
    </ul>
  </td>
</tr>
</table>

### 📊 Data Profiling

<div class="feature-card">
<table>
<tr>
<td width="25%"><img src="https://img.shields.io/badge/AI_Powered-2962FF?style=flat-square&logo=openai&logoColor=white" alt="AI Powered"/></td>
<td>The data profiling system provides comprehensive insights about your CSV data:</td>
</tr>
</table>

- 📋 **Column Analytics**: Analyzes each column for data type, missing values percentage, unique values count, and statistical measures
- 📊 **Distribution Analysis**: Identifies and visualizes value distributions for categorical fields
- 🔍 **Pattern Recognition**: Detects common formats and patterns within the data
- ⚠️ **Quality Assessment**: Flags potential data quality issues with clear explanations
- 📈 **Statistical Summaries**: Provides detailed statistical measures for numerical fields
</div>

### 🔄 Data Standardization

<div class="feature-card">
<table>
<tr>
<td width="25%"><img src="https://img.shields.io/badge/Format_Consistency-00A98F?style=flat-square&logo=databricks&logoColor=white" alt="Format Consistency"/></td>
<td>The data standardization feature ensures consistency across your data:</td>
</tr>
</table>

- 📅 **Format Standardization**: Converts dates, addresses, and text values to consistent formats
- 🧠 **Format Detection**: Intelligently recognizes various input formats and standardizes them
- ⚙️ **Custom Format Support**: Allows specifying target formats through format hints
- 💬 **Explanation**: Provides clear explanations of standardization decisions
</div>

### 🔍 Data Anomaly Detection

<div class="feature-card">
<table>
<tr>
<td width="25%"><img src="https://img.shields.io/badge/Anomaly_Detection-FF6C37?style=flat-square&logo=alert&logoColor=white" alt="Anomaly Detection"/></td>
<td>The anomaly detection system identifies data issues that might otherwise go unnoticed:</td>
</tr>
</table>

- 📏 **Pattern-based Detection**: Identifies values that deviate from expected patterns
- 🔄 **Inconsistency Identification**: Flags inconsistent data entries across records
- 📊 **Impact Analysis**: Assesses potential impact of detected anomalies
- 🔧 **Correction Suggestions**: Offers potential fixes for identified anomalies
</div>

### 📈 Evaluation Dashboard

<div class="feature-card">
<table>
<tr>
<td width="25%"><img src="https://img.shields.io/badge/Performance_Metrics-2ECB68?style=flat-square&logo=chart&logoColor=white" alt="Performance Metrics"/></td>
<td>The evaluation dashboard provides metrics and insights on processing effectiveness:</td>
</tr>
</table>

- ✅ **Accuracy Tracking**: Monitors the accuracy of AI-generated suggestions based on user feedback
- 👤 **User Feedback Integration**: Incorporates user approvals/rejections to improve system performance
- ⏱️ **Performance Metrics**: Displays processing time and success rates for different operations
</div>

## 🛠️ Technologies Used

<div align="center">
<table>
<tr>
<td align="center"><b>🖥️ Frontend</b></td>
<td>Next.js, React, TypeScript, Tailwind CSS, Shadcn UI</td>
</tr>
<tr>
<td align="center"><b>🧠 AI/Backend</b></td>
<td>Genkit, Google AI (Vertex AI / Gemini), Ollama (for local models)</td>
</tr>
<tr>
<td align="center"><b>📊 Data Handling</b></td>
<td>PapaParse (for CSV parsing), Zod (for schema validation)</td>
</tr>
<tr>
<td align="center"><b>⚙️ Development</b></td>
<td>Node.js, npm</td>
</tr>
</table>
</div>

## Why AI/LLMs for CSV Processing?

<div class="ai-advantages-card" style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
<p>Traditional CSV processing tools often require users to write complex scripts (e.g., Python with Pandas) or manually perform repetitive tasks. LLMs offer several advantages in this domain:</p>

<table>
<tr>
<td align="center" width="60"><img src="https://img.shields.io/badge/1-FF6C37?style=flat-square&logoColor=white" alt="1"/></td>
<td><b>Natural Language Understanding:</b> Users can specify data cleaning or transformation tasks using plain English (or other languages), lowering the barrier to entry for non-programmers. For example, instead of writing a regex, a user might say "make all email addresses lowercase."</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/2-FF6C37?style=flat-square&logoColor=white" alt="2"/></td>
<td><b>Intelligent Suggestions:</b> LLMs can analyze the data contextually and provide relevant suggestions for cleaning and improvement that might not be immediately obvious (e.g., identifying inconsistent date formats, suggesting imputation methods for missing data based on column semantics).</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/3-FF6C37?style=flat-square&logoColor=white" alt="3"/></td>
<td><b>Handling Ambiguity & Complexity:</b> LLMs can often interpret ambiguous instructions and handle more complex, multi-step transformations that would be cumbersome to define with traditional rules or scripts.</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/4-FF6C37?style=flat-square&logoColor=white" alt="4"/></td>
<td><b>Flexibility:</b> They can adapt to a wide variety of CSV structures and data quality issues without needing pre-defined rules for every scenario.</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/5-FF6C37?style=flat-square&logoColor=white" alt="5"/></td>
<td><b>Efficiency for Exploratory Data Cleaning:</b> LLMs can accelerate the initial stages of data cleaning by quickly identifying common issues and proposing solutions, allowing data analysts to focus on more nuanced problems.</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/6-FF6C37?style=flat-square&logoColor=white" alt="6"/></td>
<td><b>Contextual Data Imputation:</b> When filling missing values, LLMs can potentially make more informed decisions based on the surrounding data and the inferred meaning of the column, rather than just statistical measures like mean or median.</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/7-FF6C37?style=flat-square&logoColor=white" alt="7"/></td>
<td><b>Advanced Data Operations:</b> The system supports a wide range of data processing capabilities including conditional operations with numeric comparisons and pattern matching, date/time operations, statistical transformations, text processing, data classification/binning, and dataset structure operations.</td>
</tr>
</table>

<p>While LLMs are powerful, this project also incorporates direct processors (for commands and SQL) which can be more efficient and deterministic for well-defined tasks, offering a hybrid approach.</p>
</div>

## 💬 Supported Natural Language Commands

<div align="center">
  <img src="https://img.shields.io/badge/Natural_Language-FF6C37?style=flat-square&logo=openai&logoColor=white" alt="Natural Language"/>
  <img src="https://img.shields.io/badge/Intuitive_Processing-00A98F?style=flat-square&logo=databricks&logoColor=white" alt="Intuitive Processing"/>
</div>

DataMaestro supports an extensive range of data processing operations through natural language commands:

### 🔧 Basic Operations

<table>
<tr>
<td width="50%">
  <ul>
    <li>🔄 <b>Find and replace text values</b></li>
    <li>📏 <b>Standardize column values</b></li>
    <li>🧩 <b>Fill missing values</b></li>
    <li>🔤 <b>Convert case (uppercase/lowercase)</b></li>
  </ul>
</td>
<td width="50%">
  <ul>
    <li>📊 <b>Sort data</b></li>
    <li>🔍 <b>Filter rows based on conditions</b></li>
    <li>🧹 <b>Remove duplicate rows</b></li>
  </ul>
</td>
</tr>
</table>

### 🚀 Advanced Operations

#### 🔢 Conditional Operations

<div class="command-examples">
<table>
<tr>
<td width="33%"><b>Numeric comparisons</b></td>
<td><code>"Filter rows where Price > 100"</code></td>
</tr>
<tr>
<td width="33%"><b>Wildcard pattern matching</b></td>
<td><code>"Find products starting with 'Apple'"</code></td>
</tr>
<tr>
<td width="33%"><b>Percentage-based operations</b></td>
<td><code>"Show me the top 10% of values in Sales column"</code></td>
</tr>
</table>
</div>

#### 📅 Date and Time Operations

<div class="command-examples">
<table>
<tr>
<td width="40%"><b>Format conversion</b></td>
<td><code>"Convert dates in 'Order_Date' to YYYY-MM-DD format"</code></td>
</tr>
<tr>
<td width="40%"><b>Date extraction</b></td>
<td><code>"Extract month from 'Transaction_Date'"</code></td>
</tr>
<tr>
<td width="40%"><b>Date-based filtering</b></td>
<td><code>"Show transactions between January 1 and March 31"</code></td>
</tr>
</table>
</div>

#### 📊 Statistical Transformations

<div class="command-examples">
<table>
<tr>
<td width="30%"><b>Z-score calculations</b></td>
<td><code>"Calculate z-scores for all values in the 'Score' column"</code></td>
</tr>
<tr>
<td width="30%"><b>Normalization</b></td>
<td><code>"Normalize 'Revenue' column to range 0-1"</code></td>
</tr>
<tr>
<td width="30%"><b>Moving averages</b></td>
<td><code>"Calculate 3-day moving average of 'Daily_Sales'"</code></td>
</tr>
<tr>
<td width="30%"><b>Outlier detection</b></td>
<td><code>"Find outliers in 'Price' column using IQR method"</code></td>
</tr>
<tr>
<td width="30%"><b>Statistical imputation</b></td>
<td><code>"Fill missing values in 'Income' with the median"</code></td>
</tr>
</table>
</div>

#### 🔤 Text Processing and Extraction

<div class="command-examples">
<table>
<tr>
<td width="33%"><b>Character extraction</b></td>
<td><code>"Extract first 3 characters from each value in 'Product_Code'"</code></td>
</tr>
<tr>
<td width="33%"><b>String operations</b></td>
<td><code>"Split 'Full_Name' into 'First_Name' and 'Last_Name'"</code></td>
</tr>
<tr>
<td width="33%"><b>Pattern extraction</b></td>
<td><code>"Extract email domains from 'Email' column"</code></td>
</tr>
</table>
</div>

#### 📏 Data Classification and Binning

<div class="command-examples">
<table>
<tr>
<td width="40%"><b>Numeric binning</b></td>
<td><code>"Create age groups: 0-18, 19-35, 36-50, 51+"</code></td>
</tr>
<tr>
<td width="40%"><b>Quartile-based classification</b></td>
<td><code>"Classify 'Income' into quartiles: Low, Medium-Low, Medium-High, High"</code></td>
</tr>
<tr>
<td width="40%"><b>Multi-condition classification</b></td>
<td><code>"Label customers as 'Premium' if spend > 1000 and visits > 10"</code></td>
</tr>
</table>
</div>

#### Dataset Structure Operations

- Pivot tables
- Melt operations (wide to long format)
- Transpose operations

## 🔢 Supported SQL Processing Operations

<div align="center">
  <img src="https://img.shields.io/badge/SQL_Based-0078D7?style=flat-square&logo=sql&logoColor=white" alt="SQL Based"/>
  <img src="https://img.shields.io/badge/Familiar_Syntax-FF6C37?style=flat-square&logo=sqlite&logoColor=white" alt="Familiar Syntax"/>
</div>

DataMaestro offers a comprehensive SQL processing mode for more direct and structured data manipulation:

### 🔍 SELECT Operations

<div class="sql-examples">
<table>
<tr>
<td width="40%"><b>Select all columns</b></td>
<td><code>SELECT * FROM data</code></td>
</tr>
<tr>
<td width="40%"><b>Select specific columns</b></td>
<td><code>SELECT Column1, Column2 FROM data</code></td>
</tr>
<tr>
<td width="40%"><b>Select with filtering</b></td>
<td><code>SELECT * FROM data WHERE Column = 'Value'</code></td>
</tr>
</table>
</div>

<div class="feature-card">
<p><b>SELECT queries display filtered results without modifying the original data. The UI provides:</b></p>
<ul>
  <li>📊 A preview of filtered data (first 5 rows)</li>
  <li>✅ Options to apply the filtered results to the current dataset</li>
  <li>📥 A download button to save the filtered results as a new CSV file</li>
  <li>📈 Information about how many rows were returned by the query</li>
</ul>
</div>

### 🔄 UPDATE Operations

<div class="sql-examples">
<table>
<tr>
<td width="40%"><b>Update all rows</b></td>
<td><code>UPDATE data SET Column = 'New Value'</code></td>
</tr>
<tr>
<td width="40%"><b>Update with conditions</b></td>
<td><code>UPDATE data SET Column = 'New Value' WHERE Column2 = 'Condition'</code></td>
</tr>
<tr>
<td width="40%"><b>Update with IN clause</b></td>
<td><code>UPDATE data SET Column = 'New Value' WHERE Column2 IN ('Value1', 'Value2')</code></td>
</tr>
</table>
</div>

### ❌ DELETE Operations

<div class="sql-examples">
<table>
<tr>
<td width="40%"><b>Delete with conditions</b></td>
<td><code>DELETE FROM data WHERE Column = 'Value'</code></td>
</tr>
<tr>
<td width="40%"><b>Delete with numeric comparisons</b></td>
<td><code>DELETE FROM data WHERE Column > 100</code></td>
</tr>
<tr>
<td width="40%"><b>Safety feature</b></td>
<td><span style="color: #e74c3c;">DELETE without WHERE clause is not supported for data safety</span></td>
</tr>
</table>
</div>

### 🔍 WHERE Clause Conditions

<div class="sql-examples">
<table>
<tr>
<td width="40%"><b>Equality operations</b></td>
<td><code>WHERE Column = 'Value'</code></td>
</tr>
<tr>
<td width="40%"><b>Numeric comparisons</b></td>
<td>
  <code>WHERE Column > 100</code><br>
  <code>WHERE Column <= 50</code><br>
  <code>WHERE Column != 0</code>
</td>
</tr>
<tr>
<td width="40%"><b>Pattern matching with LIKE</b></td>
<td>
  <code>WHERE Column LIKE '%pattern%'</code> (contains)<br>
  <code>WHERE Column LIKE 'start%'</code> (starts with)<br>
  <code>WHERE Column LIKE '%end'</code> (ends with)
</td>
</tr>
<tr>
<td width="40%"><b>Wildcards</b></td>
<td>
  <code>%</code> matches any number of characters<br>
  <code>_</code> matches exactly one character
</td>
</tr>
<tr>
<td width="40%"><b>IN clause</b></td>
<td><code>WHERE Column IN ('Value1', 'Value2', 'Value3')</code></td>
</tr>
</table>
</div>

<div class="feature-card">
<p>The SQL processor implementation handles these operations efficiently without relying on external database engines, processing the data directly in memory and providing detailed summaries of the changes made.</p>
</div>

## ✨ Key Features

<div align="center">
  <img src="https://img.shields.io/badge/Comprehensive-2962FF?style=flat-square&logo=databricks&logoColor=white" alt="Comprehensive"/>
  <img src="https://img.shields.io/badge/User_Friendly-00A98F?style=flat-square&logo=databricks&logoColor=white" alt="User Friendly"/>
  <img src="https://img.shields.io/badge/AI_Powered-FF6C37?style=flat-square&logo=openai&logoColor=white" alt="AI Powered"/>
</div>

### 📊 CSV Data Processing

<div class="feature-highlight">
<table>
<tr>
<td align="center" width="80"><img src="https://img.shields.io/badge/AI-2962FF?style=flat-square&logo=openai&logoColor=white" alt="AI"/></td>
<td><b>CSV Cleaning Suggestions</b>: Intelligently identifies issues in CSV data and suggests corrections with confidence scores. You decide which changes to apply.</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/SQL-0078D7?style=flat-square&logo=sql&logoColor=white" alt="SQL"/></td>
<td><b>SQL Processing</b>: Transform data using familiar SQL syntax with our custom parser and AI fallback for complex queries.</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/NL-FF6C37?style=flat-square&logo=openai&logoColor=white" alt="NL"/></td>
<td><b>Command Processing</b>: Simply describe what you want in plain English, and our AI will perform the transformations.</td>
</tr>
</table>
</div>

### 🔍 Data Profiling

<div class="feature-highlight">
<table>
<tr>
<td><b>Complete Analysis</b>: DataMaestro's AI-powered profiling examines your data to provide:</td>
</tr>
</table>

<ul>
  <li>📊 <b>Structural Analysis</b>: Understand the shape and organization of your data</li>
  <li>📈 <b>Statistical Summaries</b>: Get key metrics for each column (mean, median, mode, etc.)</li>
  <li>🔠 <b>Data Type Detection</b>: Automatically identify proper types for each column</li>
  <li>⚠️ <b>Quality Assessment</b>: Spot potential issues before they impact your analysis</li>  <li>📉 <b>Distribution Insights</b>: Visualize how categorical data is distributed</li>
</ul>
</div>

### 🔄 Data Standardization

<div class="feature-highlight">
<table>
<tr>
<td align="center" width="80"><img src="https://img.shields.io/badge/Format-00A98F?style=flat-square&logo=databricks&logoColor=white" alt="Format"/></td>
<td><b>Intelligent Formatting</b>: AI-powered standardization ensures your data follows consistent patterns:</td>
</tr>
</table>

<ul>
  <li>📅 <b>Date Normalization</b>: Convert dates to a standard format (YYYY-MM-DD, MM/DD/YYYY, etc.)</li>
  <li>🏠 <b>Address Standardization</b>: Format addresses consistently for better analysis</li>
  <li>🔤 <b>Text Consistency</b>: Standardize text fields (capitalization, abbreviations, etc.)</li>
  <li>⚙️ <b>Custom Formats</b>: Apply your preferred formatting rules</li>
  <li>💬 <b>Clear Explanations</b>: Understand why each change was made</li>
</ul>
</div>

### 🚨 Data Anomaly Detection

<div class="feature-highlight">
<table>
<tr>
<td align="center" width="80"><img src="https://img.shields.io/badge/Detect-FF6C37?style=flat-square&logo=alert&logoColor=white" alt="Detect"/></td>
<td><b>Find Hidden Issues</b>: Our AI-powered anomaly detection system finds problems that traditional methods miss:</td>
</tr>
</table>

<ul>
  <li>📊 <b>Outlier Detection</b>: Identify values that fall outside expected ranges</li>
  <li>🔄 <b>Inconsistency Finder</b>: Spot contradictory or inconsistent entries</li>
  <li>📈 <b>Impact Analysis</b>: Understand how anomalies affect your analysis</li>
  <li>🔧 <b>Correction Suggestions</b>: Get AI-powered recommendations to fix issues</li>
</ul>
</div>

### ✏️ English Language Correction

<div class="feature-highlight">
<table>
<tr>
<td align="center" width="80"><img src="https://img.shields.io/badge/Text-2962FF?style=flat-square&logo=openai&logoColor=white" alt="Text"/></td>
<td><b>Perfect Your Text</b>: Our AI-powered language tool enhances your writing:</td>
</tr>
</table>

<div align="center">
<code>[Text Input] → [Style Selection] → [AI Processing] → [Enhanced Text]</code>
</div>

<ul>
  <li>✅ <b>Correction Mode</b>: Fix grammar, spelling, and clarity in existing text</li>
  <li>✨ <b>Generation Mode</b>: Create new content from simple instructions</li>
  <li>🎭 <b>Style Options</b>: Choose from casual, professional, academic, funny, and more</li>
  <li>📱 <b>Smart Formatting</b>: Format content for emails, tweets (with character limits), or formal documents</li>
  <li>🌐 <b>Translation</b>: Add translation instructions in your prompt (e.g., "translate to Spanish")</li>
</ul>
</div>

- **Correction Mode**: Improves existing text by fixing grammar and enhancing clarity
- **Generation Mode**: Creates new text from simple instructions
- **Style Options**: Choose from various tones like casual, professional, funny, academic
- **Smart Formatting**: Options for emails, tweets (including thread creation), and formal writing
- **Translation**: Integrate translation instructions directly in your prompt (e.g., "translate to Spanish")

It's perfect for drafting emails, social media posts, or academic writing, as well as experimenting with different writing styles.

### Evaluation Dashboard

## ⚠️ Limitations and Known Issues

To provide complete transparency about DataMaestro's capabilities, here are the current limitations and known issues:

<details>
<summary><b>💾 Processing Limitations</b></summary>

<table>
<tr>
<td width="30%"><b>Large Datasets</b></td>
<td>Performance may degrade with very large CSV files (>10MB). For optimal performance, keep files under 5MB.</td>
</tr>
<tr>
<td width="30%"><b>Complex Nested Transformations</b></td>
<td>While the system can handle many transformations, extremely complex nested operations might require breaking into multiple steps.</td>
</tr>
<tr>
<td width="30%"><b>Command Interpretation</b></td>
<td>Natural language processing occasionally misinterprets commands with complex conditional logic or ambiguous wording.</td>
</tr>
<tr>
<td width="30%"><b>SQL Query Complexity</b></td>
<td>The direct SQL parser handles common operations but has limited support for advanced SQL features like complex JOINs or window functions.</td>
</tr>
</table>
</details>

<details>
<summary><b>🔍 Feature-Specific Limitations</b></summary>

<table>
<tr>
<td width="30%"><b>Data Profiling</b></td>
<td>Works best with well-structured data. Highly unstructured or inconsistent data may result in less insightful profiles.</td>
</tr>
<tr>
<td width="30%"><b>Anomaly Detection</b></td>
<td>Focuses on common anomaly patterns. Very domain-specific anomalies may require custom detection strategies.</td>
</tr>
<tr>
<td width="30%"><b>English Correction</b></td>
<td>While supporting multiple languages via translation, the core correction feature is optimized for English text.</td>
</tr>
<tr>
<td width="30%"><b>Data Standardization</b></td>
<td>May struggle with highly irregular or custom formatting in certain fields.</td>
</tr>
</table>
</details>

<details>
<summary><b>✅ Best Practices</b></summary>

<table>
<tr>
<td width="30%"><b>Iterative Approach</b></td>
<td>Break complex transformations into smaller, verifiable steps</td>
</tr>
<tr>
<td width="30%"><b>Verify Results</b></td>
<td>Always review the results of AI-generated operations, especially for critical data</td>
</tr>
<tr>
<td width="30%"><b>Command Clarity</b></td>
<td>Be specific and clear in command mode instructions</td>
</tr>
<tr>
<td width="30%"><b>Try Multiple Approaches</b></td>
<td>If one mode doesn't produce desired results, try an equivalent operation in another mode</td>
</tr>
</table>
</details>

## 🚀 Future Enhancements

<div class="future-enhancements" style="background-color: #f0f7ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
<table>
<tr>
<td align="center" width="60"><img src="https://img.shields.io/badge/🔄-2962FF?style=flat-square&logoColor=white" alt="Transform"/></td>
<td><b>Advanced Transformation Recipes</b>: Support for more complex data transformation recipes and workflows</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/💾-2962FF?style=flat-square&logoColor=white" alt="Data"/></td>
<td><b>Advanced Memory Management</b>: Implementation of techniques for storing data in dataframes or memory where AI can query iteratively</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/🖥️-2962FF?style=flat-square&logoColor=white" alt="Local"/></td>
<td><b>Local AI Integration</b>: Integration of high-performance local AI models to reduce latency and handle larger datasets</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/🔌-2962FF?style=flat-square&logoColor=white" alt="Integration"/></td>
<td><b>Data Source Integration</b>: Integration with more data sources or destinations</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/📊-2962FF?style=flat-square&logoColor=white" alt="Visualization"/></td>
<td><b>Enhanced Visualization</b>: Enhanced visualization capabilities for data analysis results</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/🛠️-2962FF?style=flat-square&logoColor=white" alt="Reliability"/></td>
<td><b>Processing Improvements</b>: Improvements to processing reliability and handling edge cases</td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/⚙️-2962FF?style=flat-square&logoColor=white" alt="Direct"/></td>
<td><b>Direct Processing</b>: Expanding direct processing capabilities to reduce dependency on AI for common operations</td>
</tr>
</table>
</div>

---

## 📝 Usage Notes and Reliability

DataMaestro performs complex operations on CSV data and while it's powerful, there are important usage considerations:

### Reliability of Processing Modes

<div class="reliability-card">
<table>
<tr>
<td width="35%"><b>Processing Mode Comparison</b></td>
<td>
  <ul>
    <li>💬 <b>Command Mode:</b> Best for natural language instructions but may occasionally misinterpret complex or ambiguous commands</li>
    <li>🔢 <b>SQL Mode:</b> Most reliable for standard SQL operations but may struggle with very complex queries</li>
    <li>🔍 <b>Suggestion Mode:</b> Good for identifying data issues but suggestions might not catch all edge cases</li>
  </ul>
</td>
</tr>

<tr>
<td width="35%"><b>When Something Doesn't Work</b></td>
<td>
  <ol>
    <li>🔄 <b>Modify Your Prompts:</b> Try rephrasing your command or query. Small changes in wording can significantly improve results</li>
    <li>🔀 <b>Switch Processing Modes:</b> If a command isn't working properly, try the equivalent operation in SQL mode or as suggestions</li>
    <li>📚 <b>Check Documentation Examples:</b> The examples in this README provide patterns for effective commands</li>
    <li>🧩 <b>Reduce Complexity:</b> Break complex operations into simpler steps</li>
  </ol>
</td>
</tr>

<tr>
<td width="35%"><b>Additional Considerations</b></td>
<td>
  <ul>
    <li>🤖 <b>AI Model Variation:</b> Results can vary slightly depending on the AI model being used (Gemini vs. local Ollama models)</li>
    <li>📊 <b>Data Size Considerations:</b> Very large datasets might impact processing performance and reliability</li>
  </ul>
</td>
</tr>
</table>
</div>

Remember that AI-based features are continually improving but may not achieve 100% accuracy in all scenarios. For critical data processing tasks, always verify results.

## 🔧 Troubleshooting

<details>
<summary><b>📱 Ollama Model Issues</b></summary>
<div class="troubleshooting-item">
<p><b>Error:</b> <code>Model 'model-name' not found</code></p>
<ul>
  <li>✅ Ensure Ollama is running on your machine</li>
  <li>✅ Verify the model name and tag using <code>ollama list</code> in your terminal</li>
  <li>✅ If the model is missing, pull it with: <code>ollama pull model-name:tag</code></li>
  <li>✅ Update the <code>ollamaModel</code> state in <code>src/components/csv-processing.tsx</code> if using a different model</li>
</ul>
</div>
</details>

<details>
<summary><b>🔄 Genkit Flows Not Starting</b></summary>
<div class="troubleshooting-item">
<ul>
  <li>✅ Check the console output when running <code>npm run genkit:dev</code> or <code>npm run genkit:watch</code></li>
  <li>✅ Verify that all required environment variables are correctly set in your <code>.env.local</code> file</li>
  <li>✅ Ensure all dependencies are properly installed with <code>npm install</code></li>
</ul>
</div>
</details>

<details>
<summary><b>📊 CSV Processing Inconsistencies</b></summary>
<div class="troubleshooting-item">
<ul>
  <li>✅ <b>Command Issues:</b> Try rephrasing your command with more explicit and specific wording</li>
  <li>✅ <b>SQL Problems:</b> Verify syntax and try breaking complex queries into simpler operations</li>
  <li>✅ <b>Multiple Failures:</b> If both command and SQL modes fail, switch to suggestion mode with specific constraints</li>
  <li>✅ <b>Large Files:</b> For better performance, ensure your CSV files are under 5MB</li>
</ul>
</div>
</details>

## 🏗️ Data Processing Architecture

DataMaestro employs a hybrid approach to data processing, combining the strengths of AI-powered analysis with custom parsers for specific operations:

<div align="center">
<table>
<tr>
<td align="center" width="40%"><h3>🧠 AI-Powered Processing</h3></td>
<td>
The application leverages Large Language Models to:

- Generate intelligent cleaning suggestions based on data patterns
- Process natural language commands for complex data transformations
- Handle complex SQL queries with contextual understanding
- Perform in-depth data profiling and anomaly detection
- Standardize data formats with contextual awareness
</td>
</tr>

<tr>
<td align="center" width="40%"><h3>⚙️ Direct Processing</h3></td>
<td>
For efficiency and reliability, DataMaestro uses custom parsers to:

- Execute common SQL operations (SELECT, UPDATE, DELETE) with standard conditions
- Process frequently used data commands through rule-based systems
- Handle high-volume data operations where direct processing is more efficient
</td>
</tr>
</table>
</div>

### Processing Flow

<div align="center">
<table>
<tr>
<td align="center" width="15%">1️⃣</td>
<td width="25%"><b>Input</b></td>
<td>User uploads CSV data or enters text input for processing</td>
</tr>
<tr>
<td align="center">2️⃣</td>
<td><b>Analysis</b></td>
<td>The system analyzes the input to determine the optimal processing approach</td>
</tr>
<tr>
<td align="center">3️⃣</td>
<td><b>Processing</b></td>
<td>Data is processed using the appropriate method (AI or direct)</td>
</tr>
<tr>
<td align="center">4️⃣</td>
<td><b>Validation</b></td>
<td>Results are presented for user review and approval</td>
</tr>
<tr>
<td align="center">5️⃣</td>
<td><b>Application</b></td>
<td>Approved changes are applied to the dataset</td>
</tr>
<tr>
<td align="center">6️⃣</td>
<td><b>Evaluation</b></td>
<td>Processing accuracy is tracked through the evaluation dashboard</td>
</tr>
</table>
</div>

## 👥 Contributing

<div align="center">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome"/>
  <img src="https://img.shields.io/badge/first--timers-friendly-blue.svg?style=flat-square" alt="First-timers Friendly"/>
</div>

We welcome contributions! If you'd like to contribute, please follow these steps:

<div class="contribution-steps">
<table>
<tr>
<td align="center">1️⃣</td>
<td><b>Fork</b> the repository</td>
</tr>
<tr>
<td align="center">2️⃣</td>
<td>Create a <b>new branch</b> (<code>git checkout -b feature/your-feature-name</code>)</td>
</tr>
<tr>
<td align="center">3️⃣</td>
<td>Make your <b>changes</b></td>
</tr>
<tr>
<td align="center">4️⃣</td>
<td><b>Commit</b> your changes (<code>git commit -m 'Add some feature'</code>)</td>
</tr>
<tr>
<td align="center">5️⃣</td>
<td><b>Push</b> to the branch (<code>git push origin feature/your-feature-name</code>)</td>
</tr>
<tr>
<td align="center">6️⃣</td>
<td>Open a <b>Pull Request</b></td>
</tr>
</table>
</div>

Please make sure your code adheres to the existing style and that all tests pass.

## 📄 License

<div class="license-card">
<p align="center">This project is licensed under the Nisham_license.</p>
<p align="center">© 2025 DataMaestro -TheNisham</p>
</div>

---

<div align="center" style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 40px;">
  <h3>🧠 DataMaestro</h3>
  <p>
    <img src="https://img.shields.io/badge/Made_with_❤️_by-DataMaestro_TheNisham-FF6C37?style=flat-square" alt="Made with love"/>
    <img src="https://img.shields.io/badge/Status-Active-success?style=flat-square" alt="Status"/>
    <img src="https://img.shields.io/badge/Version-1.0.0-informational?style=flat-square" alt="Version"/>
  </p>
  <p>
    <a href="https://data-maestro.vercel.app/"><img src="https://img.shields.io/badge/🌐_Website-2962FF?style=for-the-badge&logoColor=white" alt="Website"/></a>
    <a href="https://github.com/yourusername/DataMaestro/issues"><img src="https://img.shields.io/badge/🐛_Report_Bug-FF6C37?style=for-the-badge&logoColor=white" alt="Report Bug"/></a>
    <a href="https://github.com/yourusername/DataMaestro/issues"><img src="https://img.shields.io/badge/✨_Request_Feature-00A98F?style=for-the-badge&logoColor=white" alt="Request Feature"/></a>
  </p>
  <p>© 2025 DataMaestro -TheNisham • All Rights Reserved</p>
</div>

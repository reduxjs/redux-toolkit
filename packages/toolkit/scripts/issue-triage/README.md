# GitHub Issues Triage Tool

A TypeScript-based tool for automatically triaging and categorizing GitHub issues in the Redux Toolkit repository.

## Features

- Fetches open issues from GitHub API
- Categorizes issues based on labels, titles, and content
- Generates markdown reports with statistics
- Caches data to avoid API rate limiting
- Supports both Node.js and Bun runtimes

## Setup

1. Install dependencies:

```bash
npm install
```

2. Build the TypeScript code:

```bash
npm run build
```

## Usage

Run the triage tool:

```bash
npm start
```

Or for development (builds and runs):

```bash
npm run dev
```

## Project Structure

```
scripts/issue-triage/
├── src/           # TypeScript source files
├── dist/          # Compiled JavaScript output
├── cache/         # Cached JSON data from GitHub
├── reports/       # Generated triage reports
├── package.json   # Project dependencies
└── tsconfig.json  # TypeScript configuration
```

## Requirements

- Node.js 18+ or Bun 1.0+
- TypeScript 5.0+

## Development

This tool is built with TypeScript using ES modules (ESM). The configuration supports both Node.js and Bun runtimes for maximum flexibility.

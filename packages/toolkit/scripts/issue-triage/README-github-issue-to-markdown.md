# GitHub Issue to Markdown Converter

A standalone TypeScript script that converts GitHub issue JSON files (with comments) into readable Markdown format.

## Features

- Converts GitHub issue JSON to clean Markdown
- Includes issue metadata (author, date, comment count)
- Formats all comments with author and date information
- Highlights author associations (MEMBER, CONTRIBUTOR, etc.)
- Uses only built-in Node.js modules (no dependencies)
- Can be run with Bun, Node.js, or ts-node

## Usage

### With Bun (recommended)

```bash
bun run packages/toolkit/scripts/github-issue-to-markdown.ts <input-json-file> [output-md-file]
```

### With ts-node

```bash
npx ts-node packages/toolkit/scripts/github-issue-to-markdown.ts <input-json-file> [output-md-file]
```

### With Node.js (after compilation)

```bash
tsc packages/toolkit/scripts/github-issue-to-markdown.ts
node packages/toolkit/scripts/github-issue-to-markdown.js <input-json-file> [output-md-file]
```

## Arguments

- `<input-json-file>` (required): Path to the GitHub issue JSON file
- `[output-md-file]` (optional): Path for the output Markdown file. If not specified, uses the input filename with `.md` extension

## Examples

### Basic usage (auto-generate output filename)

```bash
bun run packages/toolkit/scripts/github-issue-to-markdown.ts docs/dev-plans/issue-3692-comments.json
# Creates: docs/dev-plans/issue-3692-comments.md
```

### Specify output filename

```bash
bun run packages/toolkit/scripts/github-issue-to-markdown.ts docs/dev-plans/issue-3692-comments.json docs/dev-plans/rtk-query-feedback.md
```

## Input Format

The script expects a JSON file with the following structure:

```json
{
  "number": 3692,
  "title": "Issue title",
  "user": {
    "login": "username",
    "id": 12345
  },
  "created_at": "2023-09-01T17:41:01Z",
  "updated_at": "2023-09-01T17:41:01Z",
  "body": "Issue description...",
  "author_association": "MEMBER",
  "comments": 106,
  "comments_data": [
    {
      "id": 1703237481,
      "user": {
        "login": "commenter",
        "id": 67890
      },
      "created_at": "2023-09-01T19:35:29Z",
      "updated_at": "2023-09-01T19:35:29Z",
      "body": "Comment text...",
      "author_association": "NONE"
    }
  ]
}
```

## Output Format

The script generates a Markdown file with:

1. Issue header with number and title
2. Issue metadata (author, date, comment count)
3. Issue description
4. All comments with:
   - Horizontal rule separator
   - Comment author and date
   - Author association badge (if not NONE)
   - Comment body text

## Notes

- Dates are formatted as YYYY-MM-DD
- The script preserves all Markdown formatting in issue/comment bodies
- Author associations like MEMBER, CONTRIBUTOR are displayed as emphasized text
- Comments are separated by horizontal rules (`---`) for readability

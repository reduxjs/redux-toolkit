#!/usr/bin/env node
/**
 * Converts a GitHub issue JSON file (with comments) to a readable Markdown format.
 *
 * Usage:
 *   bun run github-issue-to-markdown.ts <input-json-file> [output-md-file]
 *
 * If output file is not specified, it will use the input filename with .md extension
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname, basename, extname } from 'path'

interface GitHubUser {
  login: string
  id: number
}

interface GitHubComment {
  id: number
  user: GitHubUser
  created_at: string
  updated_at: string
  body: string
  author_association: string
}

interface GitHubIssue {
  number: number
  title: string
  user: GitHubUser
  created_at: string
  updated_at: string
  body: string
  author_association: string
  comments: number
  comments_data?: GitHubComment[]
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}

function convertIssueToMarkdown(issue: GitHubIssue): string {
  let markdown = ''

  // Issue header
  markdown += `# Issue #${issue.number}: ${issue.title}\n\n`

  // Issue metadata
  markdown += `**Author:** ${issue.user.login}\n`
  markdown += `**Date:** ${formatDate(issue.created_at)}\n`
  markdown += `**Comments:** ${issue.comments}\n\n`

  // Issue body
  markdown += `## Issue Description\n\n`
  markdown += `${issue.body}\n\n`

  // Comments section
  if (issue.comments_data && issue.comments_data.length > 0) {
    markdown += `## Comments (${issue.comments_data.length})\n\n`

    for (const comment of issue.comments_data) {
      markdown += `---\n\n`
      markdown += `### Comment by ${comment.user.login} on ${formatDate(comment.created_at)}\n\n`

      if (comment.author_association && comment.author_association !== 'NONE') {
        markdown += `_${comment.author_association}_\n\n`
      }

      markdown += `${comment.body}\n\n`
    }
  }

  return markdown
}

function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Error: No input file specified')
    console.error(
      'Usage: bun run github-issue-to-markdown.ts <input-json-file> [output-md-file]',
    )
    process.exit(1)
  }

  const inputFile = resolve(args[0])
  let outputFile: string

  if (args.length > 1) {
    outputFile = resolve(args[1])
  } else {
    // Generate output filename from input filename
    const dir = dirname(inputFile)
    const base = basename(inputFile, extname(inputFile))
    outputFile = resolve(dir, `${base}.md`)
  }

  try {
    // Read and parse JSON file
    console.log(`Reading ${inputFile}...`)
    const jsonContent = readFileSync(inputFile, 'utf-8')
    const issue: GitHubIssue = JSON.parse(jsonContent)

    // Convert to Markdown
    console.log('Converting to Markdown...')
    const markdown = convertIssueToMarkdown(issue)

    // Write output file
    console.log(`Writing to ${outputFile}...`)
    writeFileSync(outputFile, markdown, 'utf-8')

    console.log('✓ Conversion complete!')
    console.log(`  Input:  ${inputFile}`)
    console.log(`  Output: ${outputFile}`)
    console.log(`  Comments: ${issue.comments_data?.length || 0}`)
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
    } else {
      console.error('An unknown error occurred')
    }
    process.exit(1)
  }
}

main()

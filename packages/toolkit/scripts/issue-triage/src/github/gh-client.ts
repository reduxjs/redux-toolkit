/**
 * GitHub CLI client for fetching issues and PRs
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type {
  GhIssueResponse,
  GhPullRequestResponse,
  GhIssueDetailResponse,
  Issue,
  DetailedIssue,
} from './types.js'
import { GhCliError, GhApiError, GhParseError } from '../utils/errors.js'
import { transformIssue, transformDetailedIssue } from './transformers.js'

const execFileAsync = promisify(execFile)

// Configuration
const MAX_BUFFER = 10 * 1024 * 1024 // 10MB
const TIMEOUT = 30000 // 30 seconds
const REPO = 'reduxjs/redux-toolkit'

/**
 * Execute a gh CLI command and return stdout/stderr
 */
export async function executeGhCommand(
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execFileAsync('gh', args, {
      maxBuffer: MAX_BUFFER,
      timeout: TIMEOUT,
      encoding: 'utf8',
    })
    return result
  } catch (error: any) {
    // Handle specific error cases
    if (error.code === 'ENOENT') {
      throw new GhCliError(
        'GitHub CLI (gh) not found. Please install it from https://cli.github.com/',
        error,
      )
    }

    if (error.killed && error.signal === 'SIGTERM') {
      throw new GhApiError(
        `Command timed out after ${TIMEOUT / 1000} seconds`,
        undefined,
        error,
      )
    }

    // Check for authentication errors in stderr
    if (error.stderr && error.stderr.includes('authentication')) {
      throw new GhCliError(
        'Not authenticated with GitHub CLI. Run: gh auth login',
        error,
      )
    }

    // Check for API rate limit errors
    if (error.stderr && error.stderr.includes('rate limit')) {
      throw new GhApiError('GitHub API rate limit exceeded', 429, error)
    }

    // Generic API error
    throw new GhApiError(
      `GitHub CLI command failed: ${error.message}`,
      error.code,
      error,
    )
  }
}

/**
 * Check if gh CLI is installed and authenticated
 */
export async function checkGhCli(): Promise<void> {
  try {
    // Check if gh is installed and authenticated
    await executeGhCommand(['auth', 'status'])
  } catch (error) {
    if (error instanceof GhCliError || error instanceof GhApiError) {
      throw error
    }
    throw new GhCliError('Failed to verify GitHub CLI status', error)
  }
}

/**
 * GitHub client for fetching issues and PRs
 */
export class GitHubClient {
  /**
   * Fetch all open issues from the repository
   */
  async fetchOpenIssues(): Promise<Issue[]> {
    console.log('Fetching open issues...')

    const fields = [
      'number',
      'title',
      'state',
      'createdAt',
      'updatedAt',
      'closedAt',
      'url',
      'author',
      'labels',
      'assignees',
      'comments',
      'body',
    ]

    try {
      const { stdout } = await executeGhCommand([
        'issue',
        'list',
        '--repo',
        REPO,
        '--state',
        'open',
        '--limit',
        '1000',
        '--json',
        fields.join(','),
      ])

      const rawIssues: GhIssueResponse[] = JSON.parse(stdout)
      return rawIssues.map((issue) => transformIssue(issue, 'issue'))
    } catch (error) {
      if (error instanceof GhCliError || error instanceof GhApiError) {
        throw error
      }
      if (error instanceof SyntaxError) {
        throw new GhParseError(
          'Failed to parse issues JSON response',
          undefined,
          error,
        )
      }
      throw new GhApiError('Failed to fetch open issues', undefined, error)
    }
  }

  /**
   * Fetch all open PRs from the repository
   */
  async fetchOpenPRs(): Promise<Issue[]> {
    console.log('Fetching open PRs...')

    const fields = [
      'number',
      'title',
      'state',
      'createdAt',
      'updatedAt',
      'closedAt',
      'mergedAt',
      'url',
      'author',
      'labels',
      'assignees',
      'comments',
      'body',
      'isDraft',
      'reviewDecision',
    ]

    try {
      const { stdout } = await executeGhCommand([
        'pr',
        'list',
        '--repo',
        REPO,
        '--state',
        'open',
        '--limit',
        '1000',
        '--json',
        fields.join(','),
      ])

      const rawPRs: GhPullRequestResponse[] = JSON.parse(stdout)
      return rawPRs.map((pr) => transformIssue(pr, 'pr'))
    } catch (error) {
      if (error instanceof GhCliError || error instanceof GhApiError) {
        throw error
      }
      if (error instanceof SyntaxError) {
        throw new GhParseError(
          'Failed to parse PRs JSON response',
          undefined,
          error,
        )
      }
      throw new GhApiError('Failed to fetch open PRs', undefined, error)
    }
  }

  /**
   * Fetch detailed information for a specific issue including comments
   */
  async fetchIssueDetail(number: number): Promise<DetailedIssue> {
    console.log(`Fetching details for issue #${number}...`)

    const fields = [
      'number',
      'title',
      'state',
      'createdAt',
      'updatedAt',
      'closedAt',
      'url',
      'author',
      'labels',
      'assignees',
      'body',
      'comments',
    ]

    try {
      const { stdout } = await executeGhCommand([
        'issue',
        'view',
        number.toString(),
        '--repo',
        REPO,
        '--json',
        fields.join(','),
      ])

      const rawIssue: GhIssueDetailResponse = JSON.parse(stdout)
      return transformDetailedIssue(rawIssue)
    } catch (error) {
      if (error instanceof GhCliError || error instanceof GhApiError) {
        throw error
      }
      if (error instanceof SyntaxError) {
        throw new GhParseError(
          `Failed to parse issue #${number} JSON response`,
          undefined,
          error,
        )
      }
      throw new GhApiError(`Failed to fetch issue #${number}`, undefined, error)
    }
  }

  /**
   * Fetch all open issues and PRs
   */
  async fetchAll(): Promise<Issue[]> {
    console.log('Fetching all open issues and PRs...')

    const [issues, prs] = await Promise.all([
      this.fetchOpenIssues(),
      this.fetchOpenPRs(),
    ])

    return [...issues, ...prs]
  }
}

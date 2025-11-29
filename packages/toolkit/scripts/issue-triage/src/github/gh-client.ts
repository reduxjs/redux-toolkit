/**
 * GitHub CLI client for fetching issues and PRs
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { promises as fs } from 'node:fs'
import { join, dirname } from 'node:path'
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
const CACHE_FILE = 'cache/issues-data.json'

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
   * Save issues and PRs to cache file
   */
  async saveToCache(issues: Issue[], prs: Issue[]): Promise<void> {
    try {
      console.log('💾 Saving data to cache...')

      // Create cache directory if it doesn't exist
      const cacheDir = dirname(CACHE_FILE)
      await fs.mkdir(cacheDir, { recursive: true })

      // Write cache file with pretty-printed JSON
      const cacheData = { issues, prs }
      await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8')

      console.log(
        `✓ Saved ${issues.length} issues and ${prs.length} PRs to cache`,
      )
    } catch (error) {
      // Log warning but don't fail - caching is optional
      console.warn(
        '⚠️ Failed to save cache:',
        error instanceof Error ? error.message : error,
      )
    }
  }

  /**
   * Load issues and PRs from cache file
   */
  async loadFromCache(): Promise<{ issues: Issue[]; prs: Issue[] } | null> {
    try {
      const data = await fs.readFile(CACHE_FILE, 'utf8')
      const parsed = JSON.parse(data)

      // Validate cache structure
      if (
        !parsed.issues ||
        !parsed.prs ||
        !Array.isArray(parsed.issues) ||
        !Array.isArray(parsed.prs)
      ) {
        console.warn('⚠️ Cache file has invalid structure, fetching fresh data')
        return null
      }

      // Reconstruct Date objects from ISO strings
      const reconstructDates = (item: any): Issue => ({
        ...item,
        created_at: new Date(item.created_at),
        updated_at: new Date(item.updated_at),
        closed_at: item.closed_at ? new Date(item.closed_at) : null,
        merged_at: item.merged_at ? new Date(item.merged_at) : undefined,
      })

      return {
        issues: parsed.issues.map(reconstructDates),
        prs: parsed.prs.map(reconstructDates),
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('⚠️ Cache file not found, fetching fresh data')
      } else if (error instanceof SyntaxError) {
        console.warn('⚠️ Cache file corrupted, fetching fresh data')
      } else {
        console.warn(
          '⚠️ Failed to load cache:',
          error instanceof Error ? error.message : error,
        )
      }
      return null
    }
  }

  /**
   * Fetch all open issues and PRs
   */
  async fetchAll(options?: { useCache?: boolean }): Promise<Issue[]> {
    // Try to load from cache if requested
    if (options?.useCache) {
      console.log('📦 Attempting to use cached data...')
      const cached = await this.loadFromCache()

      if (cached) {
        console.log('📦 Using cached data')
        return [...cached.issues, ...cached.prs]
      }
    }

    // Fetch fresh data
    console.log('🔄 Fetching fresh data...')
    console.log('Fetching all open issues and PRs...')

    const [issues, prs] = await Promise.all([
      this.fetchOpenIssues(),
      this.fetchOpenPRs(),
    ])

    // Save to cache
    await this.saveToCache(issues, prs)

    return [...issues, ...prs]
  }
}

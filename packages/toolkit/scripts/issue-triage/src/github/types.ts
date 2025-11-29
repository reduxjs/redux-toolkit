/**
 * GitHub API response types and internal data models
 */

/**
 * Raw response from `gh issue list --json` command
 */
export interface GhIssueResponse {
  number: number
  title: string
  state: string
  createdAt: string
  updatedAt: string
  closedAt: string | null
  url: string
  author: {
    login: string
  }
  labels: Array<{
    name: string
    color: string
  }>
  assignees: Array<{
    login: string
  }>
  comments: number
  body: string
}

/**
 * Raw response from `gh pr list --json` command
 */
export interface GhPullRequestResponse {
  number: number
  title: string
  state: string
  createdAt: string
  updatedAt: string
  closedAt: string | null
  mergedAt: string | null
  url: string
  author: {
    login: string
  }
  labels: Array<{
    name: string
    color: string
  }>
  assignees: Array<{
    login: string
  }>
  comments: number
  body: string
  isDraft: boolean
  reviewDecision: string | null
}

/**
 * Detailed issue response with comments from `gh issue view --json`
 */
export interface GhIssueDetailResponse {
  number: number
  title: string
  state: string
  createdAt: string
  updatedAt: string
  closedAt: string | null
  url: string
  author: {
    login: string
  }
  labels: Array<{
    name: string
    color: string
  }>
  assignees: Array<{
    login: string
  }>
  body: string
  comments: Array<{
    author: {
      login: string
    }
    body: string
    createdAt: string
    updatedAt: string
  }>
}

/**
 * Normalized internal issue format
 */
export interface Issue {
  number: number
  title: string
  state: 'open' | 'closed'
  type: 'issue' | 'pr'
  created_at: Date
  updated_at: Date
  closed_at: Date | null
  url: string
  author: string
  labels: string[]
  assignees: string[]
  comment_count: number
  body: string
  // PR-specific fields
  is_draft?: boolean
  review_decision?: string | null
  merged_at?: Date | null
}

/**
 * Detailed issue with comments loaded
 */
export interface DetailedIssue extends Issue {
  comments: Array<{
    author: string
    body: string
    created_at: Date
    updated_at: Date
  }>
}

/**
 * GitHub API response types and internal data models
 */

/**
 * Comment object from GitHub API
 */
export interface GhComment {
  id: string
  author: {
    login: string
  }
  authorAssociation: string
  body: string
  createdAt: string
  includesCreatedEdit: boolean
  isMinimized: boolean
  minimizedReason: string
  reactionGroups: Array<{
    content: string
    users: {
      totalCount: number
    }
  }>
  url: string
  viewerDidAuthor: boolean
}

/**
 * Simplified comment for caching
 */
export interface SimplifiedComment {
  author: string
  authorAssociation: string
  body: string
  createdAt: string
}

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
  comments: number | GhComment[] // Can be count or full array
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
  comments: GhComment[]
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
  comment_count: number
  comments?: SimplifiedComment[] // Optional simplified comments for caching
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
  comments: SimplifiedComment[]
}

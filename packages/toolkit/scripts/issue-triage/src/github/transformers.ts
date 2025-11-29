/**
 * Data transformation functions for GitHub API responses
 */

import type {
  GhIssueResponse,
  GhPullRequestResponse,
  GhIssueDetailResponse,
  GhComment,
  SimplifiedComment,
  Issue,
  DetailedIssue,
} from './types.js'

/**
 * Simplify a comment object for caching by removing unnecessary fields
 */
function simplifyComment(comment: GhComment): SimplifiedComment {
  return {
    author: comment.author.login,
    authorAssociation: comment.authorAssociation,
    body: comment.body,
    createdAt: comment.createdAt,
  }
}

/**
 * Transform a raw GitHub issue or PR response to our internal format
 */
export function transformIssue(
  raw: GhIssueResponse | GhPullRequestResponse,
  type: 'issue' | 'pr',
): Issue {
  // Handle comments - can be either a count or full array
  const commentCount =
    typeof raw.comments === 'number' ? raw.comments : raw.comments.length

  const simplifiedComments = Array.isArray(raw.comments)
    ? raw.comments.map(simplifyComment)
    : undefined

  const base: Issue = {
    number: raw.number,
    title: raw.title,
    state: raw.state === 'OPEN' ? 'open' : 'closed',
    type,
    created_at: new Date(raw.createdAt),
    updated_at: new Date(raw.updatedAt),
    closed_at: raw.closedAt ? new Date(raw.closedAt) : null,
    url: raw.url,
    author: raw.author.login,
    labels: raw.labels.map((label) => label.name),
    comment_count: commentCount,
    comments: simplifiedComments,
    body: raw.body || '',
  }

  // Add PR-specific fields if this is a PR
  if (type === 'pr' && 'isDraft' in raw) {
    const pr = raw as GhPullRequestResponse
    base.is_draft = pr.isDraft
    base.review_decision = pr.reviewDecision
    base.merged_at = pr.mergedAt ? new Date(pr.mergedAt) : null
  }

  return base
}

/**
 * Transform a detailed GitHub issue response (with comments) to our internal format
 */
export function transformDetailedIssue(
  raw: GhIssueDetailResponse,
): DetailedIssue {
  // Transform the base issue data
  const baseIssue: Issue = {
    number: raw.number,
    title: raw.title,
    state: raw.state === 'OPEN' ? 'open' : 'closed',
    type: 'issue',
    created_at: new Date(raw.createdAt),
    updated_at: new Date(raw.updatedAt),
    closed_at: raw.closedAt ? new Date(raw.closedAt) : null,
    url: raw.url,
    author: raw.author.login,
    labels: raw.labels.map((label) => label.name),
    comment_count: raw.comments.length,
    body: raw.body || '',
  }

  // Transform comments to simplified format
  const comments = raw.comments.map(simplifyComment)

  return {
    ...baseIssue,
    comments,
  }
}

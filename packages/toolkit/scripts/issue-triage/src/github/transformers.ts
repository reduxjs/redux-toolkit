/**
 * Data transformation functions for GitHub API responses
 */

import type {
  GhIssueResponse,
  GhPullRequestResponse,
  GhIssueDetailResponse,
  Issue,
  DetailedIssue,
} from './types.js'

/**
 * Transform a raw GitHub issue or PR response to our internal format
 */
export function transformIssue(
  raw: GhIssueResponse | GhPullRequestResponse,
  type: 'issue' | 'pr',
): Issue {
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
    assignees: raw.assignees.map((assignee) => assignee.login),
    comment_count: raw.comments,
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
    assignees: raw.assignees.map((assignee) => assignee.login),
    comment_count: raw.comments.length,
    body: raw.body || '',
  }

  // Transform comments
  const comments = raw.comments.map((comment) => ({
    author: comment.author.login,
    body: comment.body,
    created_at: new Date(comment.createdAt),
    updated_at: new Date(comment.updatedAt),
  }))

  return {
    ...baseIssue,
    comments,
  }
}

/**
 * Flag detection for special issue conditions
 */

import type { Issue } from '../github/types.js'
import type { Categorization, Flags, Scores } from './types.js'

/**
 * Get age of issue in days
 */
function getAgeInDays(date: Date): number {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Detect if issue is urgent
 */
function isUrgent(issue: Issue, scores: Scores): boolean {
  // High urgency score
  if (scores.urgency >= 70) return true

  // Critical labels
  const labels = issue.labels.map((l) => l.toLowerCase())
  if (
    labels.includes('critical') ||
    labels.includes('severity: critical') ||
    labels.includes('security')
  ) {
    return true
  }

  // Critical keywords in title
  const title = issue.title.toLowerCase()
  if (
    title.includes('crash') ||
    title.includes('security') ||
    title.includes('data loss')
  ) {
    return true
  }

  return false
}

/**
 * Detect if issue is an easy fix
 */
function isEasyFix(issue: Issue, scores: Scores): boolean {
  // Low complexity
  if (scores.complexity < 30) return true

  // Easy fix labels
  const labels = issue.labels.map((l) => l.toLowerCase())
  if (
    labels.includes('good first issue') ||
    labels.includes('easy') ||
    labels.includes('beginner friendly')
  ) {
    return true
  }

  // Simple keywords
  const text = `${issue.title} ${issue.body}`.toLowerCase()
  const easyKeywords = ['typo', 'documentation', 'readme', 'simple fix']

  for (const keyword of easyKeywords) {
    if (text.includes(keyword)) {
      return true
    }
  }

  return false
}

/**
 * Detect if issue needs triage
 */
function needsTriage(issue: Issue, categorization: Categorization): boolean {
  // Uncategorized issues need triage
  if (categorization.primary === 'uncategorized') return true

  // Low confidence categorization
  if (categorization.confidence < 0.6) return true

  // No labels
  if (issue.labels.length === 0) return true

  // No type labels
  const labels = issue.labels.map((l) => l.toLowerCase())
  const hasTypeLabel = labels.some((l) =>
    ['bug', 'feature', 'enhancement', 'documentation', 'question'].includes(l),
  )

  if (!hasTypeLabel) return true

  return false
}

/**
 * Detect if issue is stale
 */
function isStale(issue: Issue): boolean {
  const daysSinceUpdate = getAgeInDays(issue.updated_at)

  // Open issue with no activity for 90+ days
  if (issue.state === 'open' && daysSinceUpdate > 90) {
    return true
  }

  // Open issue with no comments for 60+ days
  if (
    issue.state === 'open' &&
    issue.comment_count === 0 &&
    daysSinceUpdate > 60
  ) {
    return true
  }

  return false
}

/**
 * Detect if issue mentions breaking changes
 */
function hasBreakingChange(issue: Issue): boolean {
  const text = `${issue.title} ${issue.body}`.toLowerCase()

  const breakingKeywords = [
    'breaking change',
    'breaking',
    'major version',
    'backwards incompatible',
    'breaking api',
  ]

  for (const keyword of breakingKeywords) {
    if (text.includes(keyword)) {
      return true
    }
  }

  // Check labels
  const labels = issue.labels.map((l) => l.toLowerCase())
  if (labels.includes('breaking change') || labels.includes('breaking')) {
    return true
  }

  return false
}

/**
 * Detect if issue needs reproduction
 */
function needsRepro(issue: Issue): boolean {
  const text = `${issue.title} ${issue.body}`.toLowerCase()

  // Check for reproduction-related labels
  const labels = issue.labels.map((l) => l.toLowerCase())
  if (
    labels.includes('needs reproduction') ||
    labels.includes('needs repro') ||
    labels.includes('cannot reproduce')
  ) {
    return true
  }

  // Bug reports without code examples might need repro
  if (
    labels.includes('bug') &&
    !text.includes('```') &&
    !text.includes('codesandbox') &&
    !text.includes('stackblitz') &&
    !text.includes('reproduction')
  ) {
    return true
  }

  // Keywords indicating need for reproduction
  const needsReproKeywords = [
    'cannot reproduce',
    'need reproduction',
    'needs repro',
    'provide a reproduction',
  ]

  for (const keyword of needsReproKeywords) {
    if (text.includes(keyword)) {
      return true
    }
  }

  return false
}

/**
 * Detect all flags for an issue
 */
export function detectFlags(
  issue: Issue,
  scores: Scores,
  categorization: Categorization,
): Flags {
  return {
    isUrgent: isUrgent(issue, scores),
    isEasyFix: isEasyFix(issue, scores),
    needsTriage: needsTriage(issue, categorization),
    isStale: isStale(issue),
    hasBreakingChange: hasBreakingChange(issue),
    needsRepro: needsRepro(issue),
  }
}

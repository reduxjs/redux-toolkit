/**
 * Scoring algorithms for issues
 */

import type { Issue } from '../github/types.js'
import type { Scores } from './types.js'

/**
 * Get age of issue in days
 */
function getAgeInDays(date: Date): number {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Calculate urgency score (0-100)
 * Based on: severity indicators, reactions, comments, age
 */
export function calculateUrgencyScore(issue: Issue): number {
  let score = 0
  const text = `${issue.title} ${issue.body}`.toLowerCase()
  const age = getAgeInDays(issue.created_at)

  // Severity keywords (0-40 points)
  const criticalKeywords = [
    'crash',
    'critical',
    'security',
    'data loss',
    'breaking',
    'regression',
  ]
  const highKeywords = ['error', 'bug', 'broken', 'not working', 'fails']

  for (const keyword of criticalKeywords) {
    if (text.includes(keyword)) {
      score += 10
    }
  }

  for (const keyword of highKeywords) {
    if (text.includes(keyword)) {
      score += 5
    }
  }

  // Labels (0-20 points)
  const labels = issue.labels.map((l) => l.toLowerCase())
  if (labels.includes('critical') || labels.includes('severity: critical')) {
    score += 20
  } else if (labels.includes('high') || labels.includes('severity: high')) {
    score += 15
  } else if (labels.includes('bug') || labels.includes('type: bug')) {
    score += 10
  }

  // Community engagement (0-20 points)
  // More comments/reactions = more people affected
  if (issue.comment_count > 20) {
    score += 20
  } else if (issue.comment_count > 10) {
    score += 15
  } else if (issue.comment_count > 5) {
    score += 10
  } else if (issue.comment_count > 2) {
    score += 5
  }

  // Age factor (0-20 points)
  // Older issues that are still open might be more urgent
  if (age > 90) {
    score += 20
  } else if (age > 60) {
    score += 15
  } else if (age > 30) {
    score += 10
  } else if (age < 7) {
    // Very new issues get slight boost
    score += 5
  }

  return Math.min(100, score)
}

/**
 * Calculate complexity score (0-100)
 * Based on: indicators in content, length, technical depth
 */
export function calculateComplexityScore(issue: Issue): number {
  let score = 50 // Start at medium complexity
  const text = `${issue.title} ${issue.body}`.toLowerCase()

  // Simple indicators (reduce complexity)
  const simpleKeywords = [
    'typo',
    'documentation',
    'readme',
    'example',
    'simple',
    'quick',
  ]
  for (const keyword of simpleKeywords) {
    if (text.includes(keyword)) {
      score -= 10
    }
  }

  // Complex indicators (increase complexity)
  const complexKeywords = [
    'architecture',
    'refactor',
    'performance',
    'memory leak',
    'race condition',
    'typescript',
    'type inference',
    'breaking change',
  ]
  for (const keyword of complexKeywords) {
    if (text.includes(keyword)) {
      score += 10
    }
  }

  // Issue body length (longer = potentially more complex)
  const bodyLength = issue.body.length
  if (bodyLength > 2000) {
    score += 15
  } else if (bodyLength > 1000) {
    score += 10
  } else if (bodyLength < 200) {
    score -= 10
  }

  // Code blocks indicate technical depth
  const codeBlockCount = (issue.body.match(/```/g) || []).length / 2
  if (codeBlockCount > 3) {
    score += 15
  } else if (codeBlockCount > 1) {
    score += 10
  }

  // Multiple labels might indicate complexity
  if (issue.labels.length > 4) {
    score += 10
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Calculate engagement score (0-100)
 * Based on: reactions, comments, author reputation
 */
export function calculateEngagementScore(issue: Issue): number {
  let score = 0

  // Comment count (0-50 points)
  if (issue.comment_count > 30) {
    score += 50
  } else if (issue.comment_count > 20) {
    score += 40
  } else if (issue.comment_count > 10) {
    score += 30
  } else if (issue.comment_count > 5) {
    score += 20
  } else if (issue.comment_count > 0) {
    score += 10
  }

  // Recent activity (0-30 points)
  const daysSinceUpdate = getAgeInDays(issue.updated_at)
  if (daysSinceUpdate < 7) {
    score += 30
  } else if (daysSinceUpdate < 14) {
    score += 20
  } else if (daysSinceUpdate < 30) {
    score += 10
  }

  // Author activity (0-20 points)
  // If author is active in comments, it shows engagement
  // This is a proxy - we'd need comment data to be precise
  if (issue.comment_count > 0) {
    score += 10
  }

  return Math.min(100, score)
}

/**
 * Calculate all scores for an issue
 */
export function calculateScores(issue: Issue): Scores {
  return {
    urgency: calculateUrgencyScore(issue),
    complexity: calculateComplexityScore(issue),
    engagement: calculateEngagementScore(issue),
  }
}

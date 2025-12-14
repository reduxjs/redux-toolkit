import type { CategorizedIssue } from '../categorize/types.js'

/**
 * Format issue as markdown link
 */
export function formatIssueLink(issue: CategorizedIssue): string {
  const type = issue.type === 'pr' ? 'PR' : 'Issue'
  return `[${type} #${issue.number}](${issue.url}): ${issue.title}`
}

/**
 * Format date as relative time
 */
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const daysDiff = Math.floor(
    (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (daysDiff === 0) return 'today'
  if (daysDiff === 1) return 'yesterday'
  if (daysDiff < 7) return `${daysDiff} days ago`
  if (daysDiff < 30) return `${Math.floor(daysDiff / 7)} weeks ago`
  if (daysDiff < 365) return `${Math.floor(daysDiff / 30)} months ago`
  return `${Math.floor(daysDiff / 365)} years ago`
}

/**
 * Format score as visual indicator
 */
export function formatScoreBar(score: number, maxWidth: number = 10): string {
  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, score))
  const filled = Math.round((clampedScore / 100) * maxWidth)
  const empty = maxWidth - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

/**
 * Format confidence as emoji
 */
export function formatConfidence(
  confidence: 'high' | 'medium' | 'low',
): string {
  return {
    high: '🔴',
    medium: '🟡',
    low: '🟢',
  }[confidence]
}

/**
 * Format flags as badges
 */
export function formatFlags(issue: CategorizedIssue): string {
  const flags: string[] = []

  if (issue.flags.isUrgent) flags.push('🚨 urgent')
  if (issue.flags.isEasyFix) flags.push('✅ easy-fix')
  if (issue.flags.needsRepro) flags.push('🔍 needs-repro')
  if (issue.flags.isStale) flags.push('⏰ stale')
  if (issue.flags.hasBreakingChange) flags.push('⚠️ breaking-change')
  if (issue.flags.needsTriage) flags.push('🏷️ needs-triage')

  return flags.join(' ')
}

/**
 * Truncate text to max length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Group issues by category
 */
export function groupByCategory(
  issues: CategorizedIssue[],
): Record<string, CategorizedIssue[]> {
  return issues.reduce(
    (acc, issue) => {
      const key = issue.categorization.primary
      if (!acc[key]) acc[key] = []
      acc[key].push(issue)
      return acc
    },
    {} as Record<string, CategorizedIssue[]>,
  )
}

/**
 * Calculate priority score with time decay
 * Recent issues get higher priority, older issues decay
 */
export function calculatePriority(issue: CategorizedIssue): number {
  const now = new Date()
  const ageInDays = Math.floor(
    (now.getTime() - issue.created_at.getTime()) / (1000 * 60 * 60 * 24),
  )

  // Time decay factor: 1.0 for new issues, decays to ~0.1 after 2 years
  // Using exponential decay with half-life of ~180 days (6 months)
  const timeDecay = Math.exp(-ageInDays / 180)

  // Base priority from urgency and engagement
  const basePriority = issue.scores.urgency * issue.scores.engagement

  // Apply time decay
  return basePriority * timeDecay
}

/**
 * Sort issues by priority score (with time decay)
 */
export function sortByPriority(issues: CategorizedIssue[]): CategorizedIssue[] {
  return [...issues].sort((a, b) => {
    const priorityA = calculatePriority(a)
    const priorityB = calculatePriority(b)
    return priorityB - priorityA
  })
}

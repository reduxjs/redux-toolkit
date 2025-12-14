import type { CategorizedIssue } from '../categorize/types.js'
import type { DuplicateGroup, WorkCluster } from '../similarity/types.js'
import {
  formatIssueLink,
  formatRelativeDate,
  formatConfidence,
  formatFlags,
  sortByPriority,
  calculatePriority,
} from './utils.js'

/**
 * Generate priority issues section
 */
export function generatePrioritySection(
  issues: CategorizedIssue[],
  maxItems: number = 20,
): string {
  const sections: string[] = []

  sections.push('## 🔥 Priority Issues')
  sections.push('')
  sections.push(
    'Top issues ranked by urgency × engagement with time decay (recent issues prioritized).',
  )
  sections.push('')

  const priorityIssues = sortByPriority(issues).slice(0, maxItems)

  for (const issue of priorityIssues) {
    const priority = calculatePriority(issue)
    const flags = formatFlags(issue)

    sections.push(`### ${formatIssueLink(issue)}`)
    sections.push('')
    sections.push(
      `**Priority Score**: ${priority.toFixed(1)} (Urgency: ${issue.scores.urgency}, Engagement: ${issue.scores.engagement})`,
    )
    sections.push(
      `**Category**: ${issue.categorization.primary}${issue.categorization.secondary ? ` / ${issue.categorization.secondary}` : ''}`,
    )
    sections.push(`**Age**: ${formatRelativeDate(issue.created_at)}`)
    if (flags) sections.push(`**Flags**: ${flags}`)
    sections.push('')
    sections.push('---')
    sections.push('')
  }

  return sections.join('\n')
}

/**
 * Generate duplicates section
 */
export function generateDuplicatesSection(
  duplicates: DuplicateGroup[],
): string {
  if (duplicates.length === 0) {
    return '## 🔍 Potential Duplicates\n\nNo potential duplicates detected.\n\n'
  }

  const sections: string[] = []

  sections.push('## 🔍 Potential Duplicates')
  sections.push('')
  sections.push('Issues that may be duplicates or closely related.')
  sections.push('')

  for (const group of duplicates) {
    sections.push(`### Primary: ${formatIssueLink(group.primary)}`)
    sections.push('')
    sections.push('**Potential Duplicates:**')
    sections.push('')

    for (const dup of group.duplicates) {
      const confidence = formatConfidence(
        dup.confidence >= 0.75
          ? 'high'
          : dup.confidence >= 0.6
            ? 'medium'
            : 'low',
      )
      sections.push(
        `- ${confidence} ${formatIssueLink(dup.issue)} (${Math.round(dup.confidence * 100)}% similar)`,
      )
      sections.push(
        `  - Title: ${Math.round(dup.signals.titleSimilarity * 100)}% | Keywords: ${Math.round(dup.signals.keywordOverlap * 100)}% | Category: ${Math.round(dup.signals.categoryMatch * 100)}%`,
      )
    }

    sections.push('')
    sections.push('---')
    sections.push('')
  }

  return sections.join('\n')
}

/**
 * Generate work clusters section
 */
export function generateClustersSection(clusters: WorkCluster[]): string {
  if (clusters.length === 0) {
    return '## 🎯 Work Clusters\n\nNo work clusters identified.\n\n'
  }

  const sections: string[] = []

  sections.push('## 🎯 Work Clusters')
  sections.push('')
  sections.push('Groups of related issues that could be addressed together.')
  sections.push('')

  for (const cluster of clusters) {
    sections.push(
      `### ${cluster.id}: ${cluster.category}${cluster.subcategory ? ` / ${cluster.subcategory}` : ''}`,
    )
    sections.push('')
    sections.push(`**Priority Score**: ${cluster.priority.toFixed(1)}`)
    sections.push(`**Issues**: ${cluster.issues.length}`)
    sections.push(
      `**Estimated Effort**: ${cluster.metrics.estimatedEffort} days`,
    )
    sections.push('')
    sections.push(`**Metrics:**`)
    sections.push(
      `- Avg Complexity: ${cluster.metrics.avgComplexity.toFixed(1)}`,
    )
    sections.push(`- Avg Urgency: ${cluster.metrics.avgUrgency.toFixed(1)}`)
    sections.push(`- Total Engagement: ${cluster.metrics.totalEngagement}`)
    sections.push('')
    sections.push(`**Reasoning**: ${cluster.reasoning}`)
    sections.push('')
    sections.push('**Issues in Cluster:**')
    sections.push('')

    for (const issue of cluster.issues) {
      sections.push(`- ${formatIssueLink(issue)}`)
    }

    sections.push('')
    sections.push('---')
    sections.push('')
  }

  return sections.join('\n')
}

/**
 * Generate flagged issues section grouped by category/subcategory
 */
export function generateFlaggedSection(
  issues: CategorizedIssue[],
  flagName: keyof CategorizedIssue['flags'],
  title: string,
  description: string,
): string {
  const flaggedIssues = issues.filter((issue) => issue.flags[flagName])

  if (flaggedIssues.length === 0) {
    return `## ${title}\n\n${description}\n\nNo issues found.\n\n`
  }

  const sections: string[] = []

  sections.push(`## ${title}`)
  sections.push('')
  sections.push(description)
  sections.push('')
  sections.push(`Found ${flaggedIssues.length} issue(s).`)
  sections.push('')

  // Group by category and subcategory
  const grouped: Record<string, Record<string, CategorizedIssue[]>> = {}

  for (const issue of flaggedIssues) {
    const category = issue.categorization.primary
    const subcategory = issue.categorization.secondary || 'other'

    if (!grouped[category]) grouped[category] = {}
    if (!grouped[category][subcategory]) grouped[category][subcategory] = []
    grouped[category][subcategory].push(issue)
  }

  // Sort categories by issue count
  const sortedCategories = Object.entries(grouped).sort((a, b) => {
    const countA = Object.values(a[1]).reduce(
      (sum, items) => sum + items.length,
      0,
    )
    const countB = Object.values(b[1]).reduce(
      (sum, items) => sum + items.length,
      0,
    )
    return countB - countA
  })

  for (const [category, subcategories] of sortedCategories) {
    sections.push(`### ${category}`)
    sections.push('')

    // Sort subcategories by issue count
    const sortedSubcategories = Object.entries(subcategories).sort(
      (a, b) => b[1].length - a[1].length,
    )

    for (const [subcategory, subIssues] of sortedSubcategories) {
      sections.push(`#### ${subcategory}`)
      sections.push('')

      for (const issue of sortByPriority(subIssues)) {
        const age = formatRelativeDate(issue.created_at)
        sections.push(`- ${formatIssueLink(issue)} (${age})`)
      }

      sections.push('')
    }
  }

  return sections.join('\n')
}

/**
 * Generate category-specific section
 */
export function generateCategorySection(
  issues: CategorizedIssue[],
  category: string,
): string {
  const categoryIssues = issues.filter(
    (issue) => issue.categorization.primary === category,
  )

  if (categoryIssues.length === 0) {
    return `## ${category}\n\nNo issues in this category.\n\n`
  }

  const sections: string[] = []

  sections.push(`## ${category}`)
  sections.push('')
  sections.push(`${categoryIssues.length} issue(s) in this category.`)
  sections.push('')

  // Group by subcategory
  const bySubcategory: Record<string, CategorizedIssue[]> = {}
  for (const issue of categoryIssues) {
    const sub = issue.categorization.secondary || 'other'
    if (!bySubcategory[sub]) bySubcategory[sub] = []
    bySubcategory[sub].push(issue)
  }

  for (const [subcategory, subIssues] of Object.entries(bySubcategory).sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    sections.push(`### ${subcategory} (${subIssues.length})`)
    sections.push('')

    for (const issue of sortByPriority(subIssues)) {
      const flags = formatFlags(issue)
      sections.push(`- ${formatIssueLink(issue)} ${flags ? `- ${flags}` : ''}`)
    }

    sections.push('')
  }

  return sections.join('\n')
}

/**
 * Generate top bugs section (bugs only, not all issues)
 */
export function generateTopBugsSection(
  issues: CategorizedIssue[],
  maxItems: number = 20,
): string {
  const bugs = issues.filter(
    (issue) =>
      issue.type === 'issue' &&
      (issue.labels.some((l) => l.toLowerCase().includes('bug')) ||
        issue.title.toLowerCase().includes('bug') ||
        issue.flags.isUrgent),
  )

  if (bugs.length === 0) {
    return '## 🐛 Top Bugs\n\nNo bugs found.\n\n'
  }

  const sections: string[] = []

  sections.push('## 🐛 Top Bugs')
  sections.push('')
  sections.push(
    `Showing top ${Math.min(maxItems, bugs.length)} bugs by priority.`,
  )
  sections.push('')

  const topBugs = sortByPriority(bugs).slice(0, maxItems)

  for (const bug of topBugs) {
    const priority = calculatePriority(bug)
    const flags = formatFlags(bug)

    sections.push(
      `- ${formatIssueLink(bug)} (Priority: ${priority.toFixed(1)})`,
    )
    sections.push(
      `  - **Category**: ${bug.categorization.primary}${bug.categorization.secondary ? ` / ${bug.categorization.secondary}` : ''}`,
    )
    sections.push(`  - **Created**: ${formatRelativeDate(bug.created_at)}`)
    if (flags) sections.push(`  - **Flags**: ${flags}`)
  }

  sections.push('')

  return sections.join('\n')
}

/**
 * Generate quick wins section (easy + recent + engaged)
 */
export function generateQuickWinsSection(
  issues: CategorizedIssue[],
  maxItems: number = 15,
): string {
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

  const quickWins = issues.filter((issue) => {
    const isEasy = issue.flags.isEasyFix
    const isRecent = new Date(issue.created_at).getTime() > thirtyDaysAgo
    const hasEngagement = issue.scores.engagement >= 30

    return isEasy && isRecent && hasEngagement
  })

  if (quickWins.length === 0) {
    return '## ⚡ Quick Wins\n\nNo quick wins identified (easy + recent + engaged).\n\n'
  }

  const sections: string[] = []

  sections.push('## ⚡ Quick Wins')
  sections.push('')
  sections.push(
    'Easy fixes that are recent and have community engagement - best candidates for quick progress.',
  )
  sections.push('')

  const sorted = sortByPriority(quickWins).slice(0, maxItems)

  for (const issue of sorted) {
    const priority = calculatePriority(issue)
    sections.push(
      `- ${formatIssueLink(issue)} (Priority: ${priority.toFixed(1)})`,
    )
    sections.push(
      `  - **Category**: ${issue.categorization.primary}${issue.categorization.secondary ? ` / ${issue.categorization.secondary}` : ''}`,
    )
    sections.push(
      `  - **Engagement**: ${issue.scores.engagement} | **Complexity**: ${issue.scores.complexity}`,
    )
  }

  sections.push('')

  return sections.join('\n')
}

/**
 * Generate needs attention section (high engagement, no recent activity)
 */
export function generateNeedsAttentionSection(
  issues: CategorizedIssue[],
  maxItems: number = 10,
): string {
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

  const needsAttention = issues.filter((issue) => {
    const highEngagement = issue.scores.engagement >= 50
    const notRecent = new Date(issue.updated_at).getTime() < thirtyDaysAgo
    const notStale = !issue.flags.isStale

    return highEngagement && notRecent && notStale
  })

  if (needsAttention.length === 0) {
    return '## 👀 Needs Attention\n\nNo issues need attention.\n\n'
  }

  const sections: string[] = []

  sections.push('## 👀 Needs Attention')
  sections.push('')
  sections.push(
    'High engagement issues with no recent activity - community is waiting for response.',
  )
  sections.push('')

  const sorted = sortByPriority(needsAttention).slice(0, maxItems)

  for (const issue of sorted) {
    const daysSinceUpdate = Math.floor(
      (now - new Date(issue.updated_at).getTime()) / (24 * 60 * 60 * 1000),
    )
    sections.push(
      `- ${formatIssueLink(issue)} (${daysSinceUpdate} days since update)`,
    )
    sections.push(
      `  - **Category**: ${issue.categorization.primary}${issue.categorization.secondary ? ` / ${issue.categorization.secondary}` : ''}`,
    )
    sections.push(`  - **Engagement**: ${issue.scores.engagement}`)
  }

  sections.push('')

  return sections.join('\n')
}

/**
 * Generate improved easy fixes section with category grouping
 */
export function generateEasyFixesSection(issues: CategorizedIssue[]): string {
  const easyFixes = issues.filter((issue) => issue.flags.isEasyFix)

  if (easyFixes.length === 0) {
    return '## ✅ Easy Fixes\n\nNo easy fixes identified.\n\n'
  }

  const sections: string[] = []

  sections.push('## ✅ Easy Fixes')
  sections.push('')
  sections.push('Issues that should be quick to resolve, grouped by category.')
  sections.push('')

  // Group by category
  const byCategory: Record<string, CategorizedIssue[]> = {}
  for (const issue of easyFixes) {
    const category = issue.categorization.primary
    if (!byCategory[category]) byCategory[category] = []
    byCategory[category].push(issue)
  }

  // Sort categories by count
  const sortedCategories = Object.entries(byCategory).sort(
    (a, b) => b[1].length - a[1].length,
  )

  for (const [category, categoryIssues] of sortedCategories) {
    sections.push(`### ${category} (${categoryIssues.length})`)
    sections.push('')

    // Group by subcategory
    const bySubcategory: Record<string, CategorizedIssue[]> = {}
    for (const issue of categoryIssues) {
      const sub = issue.categorization.secondary || 'other'
      if (!bySubcategory[sub]) bySubcategory[sub] = []
      bySubcategory[sub].push(issue)
    }

    for (const [subcategory, subIssues] of Object.entries(bySubcategory).sort(
      (a, b) => b[1].length - a[1].length,
    )) {
      if (subcategory !== 'other') {
        sections.push(`**${subcategory}** (${subIssues.length}):`)
        sections.push('')
      }

      for (const issue of sortByPriority(subIssues)) {
        sections.push(`- ${formatIssueLink(issue)}`)
      }

      sections.push('')
    }
  }

  return sections.join('\n')
}

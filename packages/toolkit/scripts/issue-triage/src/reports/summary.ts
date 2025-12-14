import type { ReportData } from './types.js'
import type { CategorizedIssue } from '../categorize/types.js'
import { groupByCategory } from './utils.js'

export function generateSummary(data: ReportData): string {
  const { issues, duplicates, clusters, metadata } = data

  const sections: string[] = []

  // Header
  sections.push('# Redux Toolkit Issues Triage Report')
  sections.push('')
  sections.push(`Generated: ${new Date(metadata.generatedAt).toLocaleString()}`)
  sections.push('')

  // Overview stats
  sections.push('## 📊 Overview')
  sections.push('')
  sections.push(
    `- **Total Items**: ${metadata.totalIssues + metadata.totalPRs}`,
  )
  sections.push(`  - Issues: ${metadata.totalIssues}`)
  sections.push(`  - Pull Requests: ${metadata.totalPRs}`)
  sections.push(
    `- **Categorized**: ${metadata.categorizedIssues} (${Math.round((metadata.categorizedIssues / (metadata.totalIssues + metadata.totalPRs)) * 100)}%)`,
  )
  sections.push(`- **Uncategorized**: ${metadata.uncategorizedIssues}`)
  sections.push(`- **Potential Duplicates**: ${duplicates.length} groups`)
  sections.push(`- **Work Clusters**: ${clusters.length} clusters`)
  sections.push('')

  // Category breakdown
  const byCategory = groupByCategory(issues)
  sections.push('## 📁 Category Breakdown')
  sections.push('')

  // Build category > subcategory breakdown
  const categorySubcategoryStats: Array<{
    category: string
    subcategory: string
    count: number
  }> = []

  for (const [category, items] of Object.entries(byCategory)) {
    const bySubcategory: Record<string, number> = {}

    for (const item of items) {
      const sub = item.categorization.secondary || 'other'
      bySubcategory[sub] = (bySubcategory[sub] || 0) + 1
    }

    for (const [subcategory, count] of Object.entries(bySubcategory)) {
      categorySubcategoryStats.push({ category, subcategory, count })
    }
  }

  // Sort by category count (desc), then subcategory count (desc)
  const categoryCounts = Object.entries(byCategory)
    .map(([cat, items]) => ({ cat, count: items.length }))
    .reduce(
      (acc, { cat, count }) => {
        acc[cat] = count
        return acc
      },
      {} as Record<string, number>,
    )

  categorySubcategoryStats.sort((a, b) => {
    const catDiff = categoryCounts[b.category] - categoryCounts[a.category]
    if (catDiff !== 0) return catDiff
    return b.count - a.count
  })

  sections.push('| Category | Subcategory | Count |')
  sections.push('|----------|-------------|-------|')

  for (const stat of categorySubcategoryStats) {
    sections.push(`| ${stat.category} | ${stat.subcategory} | ${stat.count} |`)
  }

  sections.push('')

  // Flag statistics
  const flagCounts = countFlags(issues)
  if (Object.keys(flagCounts).length > 0) {
    sections.push('## 🏷️ Flag Statistics')
    sections.push('')

    for (const [flag, count] of Object.entries(flagCounts).sort(
      (a, b) => b[1] - a[1],
    )) {
      sections.push(`- **${flag}**: ${count}`)
    }

    sections.push('')
  }

  return sections.join('\n')
}

function countFlags(issues: CategorizedIssue[]): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const issue of issues) {
    if (issue.flags.isUrgent) counts['Urgent'] = (counts['Urgent'] || 0) + 1
    if (issue.flags.isEasyFix)
      counts['Easy Fix'] = (counts['Easy Fix'] || 0) + 1
    if (issue.flags.needsRepro)
      counts['Needs Reproduction'] = (counts['Needs Reproduction'] || 0) + 1
    if (issue.flags.isStale) counts['Stale'] = (counts['Stale'] || 0) + 1
    if (issue.flags.hasBreakingChange)
      counts['Breaking Change'] = (counts['Breaking Change'] || 0) + 1
    if (issue.flags.needsTriage)
      counts['Needs Triage'] = (counts['Needs Triage'] || 0) + 1
  }

  return counts
}

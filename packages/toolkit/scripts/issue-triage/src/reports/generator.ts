import type { ReportData, ReportOptions } from './types.js'
import { generateSummary } from './summary.js'
import {
  generatePrioritySection,
  generateDuplicatesSection,
  generateClustersSection,
  generateFlaggedSection,
  generateCategorySection,
  generateTopBugsSection,
  generateQuickWinsSection,
  generateNeedsAttentionSection,
  generateEasyFixesSection,
} from './sections.js'
import { groupByCategory } from './utils.js'

export function generateReport(
  data: ReportData,
  options: ReportOptions = { variant: 'full' },
): string {
  const sections: string[] = []

  // Always include summary
  sections.push(generateSummary(data))

  switch (options.variant) {
    case 'full':
      return generateFullReport(data, sections)

    case 'priority':
      return generatePriorityReport(data, sections, options)

    case 'category':
      return generateCategoryReport(data, sections, options)

    default:
      return generateFullReport(data, sections)
  }
}

function generateFullReport(data: ReportData, sections: string[]): string {
  // Priority issues
  sections.push(generatePrioritySection(data.issues, 20))

  // Top bugs (NEW)
  sections.push(generateTopBugsSection(data.issues, 20))

  // Quick wins (NEW)
  sections.push(generateQuickWinsSection(data.issues, 15))

  // Urgent bugs
  sections.push(
    generateFlaggedSection(
      data.issues,
      'isUrgent',
      '🚨 Urgent Bugs',
      'Critical bugs that need immediate attention.',
    ),
  )

  // Easy fixes (IMPROVED)
  sections.push(generateEasyFixesSection(data.issues))

  // Needs attention (NEW)
  sections.push(generateNeedsAttentionSection(data.issues, 10))

  // Duplicates
  sections.push(generateDuplicatesSection(data.duplicates))

  // Work clusters (with improved reasoning)
  sections.push(generateClustersSection(data.clusters))

  // Category breakdown
  const byCategory = groupByCategory(data.issues)
  sections.push('## 📂 All Categories')
  sections.push('')

  for (const [category, _issues] of Object.entries(byCategory).sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    sections.push(generateCategorySection(data.issues, category))
  }

  return sections.join('\n')
}

function generatePriorityReport(
  data: ReportData,
  sections: string[],
  options: ReportOptions,
): string {
  const maxItems = options.maxIssuesPerSection || 50

  sections.push(generatePrioritySection(data.issues, maxItems))
  sections.push(generateTopBugsSection(data.issues, 15))
  sections.push(generateQuickWinsSection(data.issues, 10))
  sections.push(
    generateFlaggedSection(
      data.issues,
      'isUrgent',
      '🚨 Urgent Bugs',
      'Critical bugs.',
    ),
  )
  sections.push(generateClustersSection(data.clusters.slice(0, 5)))

  return sections.join('\n')
}

function generateCategoryReport(
  data: ReportData,
  sections: string[],
  options: ReportOptions,
): string {
  if (!options.category) {
    throw new Error('Category must be specified for category report variant')
  }

  sections.push(generateCategorySection(data.issues, options.category))

  // Include relevant clusters
  const relevantClusters = data.clusters.filter(
    (c) => c.category === options.category,
  )
  if (relevantClusters.length > 0) {
    sections.push(generateClustersSection(relevantClusters))
  }

  return sections.join('\n')
}

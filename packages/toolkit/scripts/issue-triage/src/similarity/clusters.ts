import type { CategorizedIssue } from '../categorize/types.js'
import type { WorkCluster } from './types.js'
import { groupBy } from './utils.js'

/**
 * Create work clusters from categorized issues
 * Groups related issues that could be worked on together
 */
export function createWorkClusters(issues: CategorizedIssue[]): WorkCluster[] {
  // Group by subcategory
  const bySubcategory = groupBy(
    issues,
    (issue) =>
      `${issue.categorization.primary}/${issue.categorization.secondary || 'other'}`,
  )

  const clusters: WorkCluster[] = []

  for (const [category, groupIssues] of Object.entries(bySubcategory)) {
    if (groupIssues.length < 2) continue

    // Sort by priority (urgency × engagement)
    const sorted = groupIssues
      .map((issue) => ({
        issue,
        priority: issue.scores.urgency * issue.scores.engagement,
      }))
      .sort((a, b) => b.priority - a.priority)

    // Create clusters of 3-5 issues
    for (let i = 0; i < sorted.length; i += 4) {
      const clusterIssues = sorted.slice(i, i + 5).map((s) => s.issue)
      if (clusterIssues.length < 2) continue

      const metrics = calculateClusterMetrics(clusterIssues)

      // Skip clusters that are too easy or too hard
      if (metrics.avgComplexity < 30 || metrics.avgComplexity > 80) continue

      const [primary, secondary] = category.split('/')

      const cluster: WorkCluster = {
        id: `cluster-${clusters.length + 1}`,
        category: primary,
        subcategory: secondary !== 'other' ? secondary : undefined,
        issues: clusterIssues,
        metrics,
        reasoning: generateClusterReasoning(clusterIssues, category),
        priority: calculateClusterPriority(metrics),
      }

      clusters.push(cluster)
    }
  }

  return clusters.sort((a, b) => b.priority - a.priority).slice(0, 10) // Top 10 clusters
}

/**
 * Calculate aggregate metrics for a cluster of issues
 */
function calculateClusterMetrics(issues: CategorizedIssue[]) {
  const complexities = issues.map((i) => i.scores.complexity)
  const engagements = issues.map((i) => i.scores.engagement)
  const urgencies = issues.map((i) => i.scores.urgency)

  return {
    avgComplexity: average(complexities),
    totalEngagement: sum(engagements),
    avgUrgency: average(urgencies),
    estimatedEffort: estimateEffort(average(complexities), issues.length),
  }
}

/**
 * Generate reasoning text for why issues are clustered together
 */
function generateClusterReasoning(
  issues: CategorizedIssue[],
  category: string,
): string {
  const [primary, secondary] = category.split('/')
  return `All issues in ${primary}${secondary !== 'other' ? `/${secondary}` : ''} category with related functionality`
}

/**
 * Calculate priority score for a cluster
 * Higher scores indicate more important clusters to work on
 */
function calculateClusterPriority(metrics: {
  totalEngagement: number
  avgComplexity: number
  avgUrgency: number
}): number {
  return (
    (metrics.totalEngagement / 100) * 0.4 +
    (100 - Math.abs(metrics.avgComplexity - 55)) * 0.3 +
    metrics.avgUrgency * 0.2 +
    10 * 0.1
  )
}

/**
 * Calculate average of an array of numbers
 */
function average(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length
}

/**
 * Calculate sum of an array of numbers
 */
function sum(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0)
}

/**
 * Estimate effort in days based on complexity and issue count
 */
function estimateEffort(avgComplexity: number, issueCount: number): number {
  // Rough estimate: 50 complexity = 1 day
  const baseEffort = avgComplexity / 50
  return Math.round(baseEffort * issueCount * 10) / 10
}

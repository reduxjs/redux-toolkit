import type { CategorizedIssue } from '../categorize/types.js'
import type { DuplicateGroup, WorkCluster } from '../similarity/types.js'

export interface ReportData {
  issues: CategorizedIssue[]
  duplicates: DuplicateGroup[]
  clusters: WorkCluster[]
  metadata: {
    generatedAt: string
    totalIssues: number
    totalPRs: number
    categorizedIssues: number
    uncategorizedIssues: number
  }
}

export interface ReportOptions {
  variant: 'full' | 'priority' | 'category'
  category?: string
  includeUncategorized?: boolean
  maxIssuesPerSection?: number
}

export interface ReportSection {
  title: string
  content: string
  priority: number
}

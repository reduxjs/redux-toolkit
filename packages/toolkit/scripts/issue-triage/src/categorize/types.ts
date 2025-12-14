/**
 * Categorization types for issue analysis
 */

/**
 * Categorization result for an issue
 */
export interface Categorization {
  primary: string
  secondary?: string
  type: 'bug' | 'feature' | 'question' | 'docs'
  confidence: number
  method: 'label' | 'keyword' | 'pattern' | 'manual'
}

/**
 * Scoring metrics for an issue
 */
export interface Scores {
  urgency: number // 0-100
  complexity: number // 0-100
  engagement: number // 0-100
}

/**
 * Flags for special issue conditions
 */
export interface Flags {
  isUrgent: boolean
  isEasyFix: boolean
  needsTriage: boolean
  isStale: boolean
  hasBreakingChange: boolean
  needsRepro: boolean
}

/**
 * Issue with categorization, scores, and flags
 */
export interface CategorizedIssue {
  number: number
  title: string
  state: 'open' | 'closed'
  type: 'issue' | 'pr'
  created_at: Date
  updated_at: Date
  closed_at: Date | null
  url: string
  author: string
  labels: string[]
  comment_count: number
  body: string
  is_draft?: boolean
  review_decision?: string | null
  merged_at?: Date | null
  categorization: Categorization
  scores: Scores
  flags: Flags
}

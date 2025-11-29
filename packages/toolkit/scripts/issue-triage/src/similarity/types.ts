import type { CategorizedIssue } from '../categorize/types.js'

/**
 * Individual similarity signals between two issues
 */
export interface SimilaritySignals {
  /** Jaccard similarity of tokenized titles (0-1) */
  titleSimilarity: number
  /** Overlap of extracted technical keywords (0-1) */
  keywordOverlap: number
  /** Match score based on category/subcategory (0-1) */
  categoryMatch: number
  /** Match score for error patterns (0-1) */
  errorPatternMatch: number
  /** Proximity in time of creation (0-1) */
  temporalProximity: number
}

/**
 * Result of comparing two issues for similarity
 */
export interface SimilarityResult {
  /** Issue number of first issue */
  issue1: number
  /** Issue number of second issue */
  issue2: number
  /** Overall similarity score (0-1) */
  score: number
  /** Individual signal scores */
  signals: SimilaritySignals
  /** Confidence level in the similarity assessment */
  confidence: 'high' | 'medium' | 'low'
  /** Type of relationship between issues */
  relationship: 'duplicate' | 'related' | 'consolidation'
}

/**
 * A cluster of related issues that could be worked on together
 */
export interface WorkCluster {
  /** Unique cluster identifier */
  id: string
  /** Primary category */
  category: string
  /** Subcategory if applicable */
  subcategory?: string
  /** Issues in this cluster */
  issues: CategorizedIssue[]
  /** Aggregate metrics for the cluster */
  metrics: {
    /** Average complexity score */
    avgComplexity: number
    /** Total engagement across all issues */
    totalEngagement: number
    /** Average urgency score */
    avgUrgency: number
    /** Estimated effort in days */
    estimatedEffort: number
  }
  /** Explanation of why these issues are clustered */
  reasoning: string
  /** Priority score for this cluster */
  priority: number
}

/**
 * A group of duplicate issues
 */
export interface DuplicateGroup {
  /** The primary/canonical issue */
  primary: CategorizedIssue
  /** Potential duplicates of the primary issue */
  duplicates: Array<{
    /** The duplicate issue */
    issue: CategorizedIssue
    /** Confidence that this is a duplicate (0-1) */
    confidence: number
    /** Similarity signals that led to this match */
    signals: SimilaritySignals
  }>
}

import type { CategorizedIssue } from '../categorize/types.js'
import type { SimilarityResult, SimilaritySignals } from './types.js'
import {
  tokenize,
  extractKeywords,
  extractErrorMessage,
  normalizeErrorPattern,
} from './utils.js'

/**
 * Calculate Jaccard similarity between two titles
 * Returns a value between 0 (no similarity) and 1 (identical)
 */
export function calculateTitleSimilarity(
  title1: string,
  title2: string,
): number {
  const words1 = new Set(tokenize(title1))
  const words2 = new Set(tokenize(title2))

  if (words1.size === 0 || words2.size === 0) return 0

  const intersection = new Set([...words1].filter((w) => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size
}

/**
 * Calculate keyword overlap between two issues
 * Returns a value between 0 (no overlap) and 1 (complete overlap)
 */
export function calculateKeywordOverlap(
  issue1: CategorizedIssue,
  issue2: CategorizedIssue,
): number {
  const text1 = `${issue1.title} ${issue1.body || ''}`
  const text2 = `${issue2.title} ${issue2.body || ''}`

  const keywords1 = new Set(extractKeywords(text1))
  const keywords2 = new Set(extractKeywords(text2))

  if (keywords1.size === 0 || keywords2.size === 0) return 0

  const intersection = new Set([...keywords1].filter((k) => keywords2.has(k)))
  const union = new Set([...keywords1, ...keywords2])

  return intersection.size / union.size
}

/**
 * Calculate category match score
 * Returns 1.0 for same subcategory, 0.5 for same primary, 0 otherwise
 */
export function calculateCategoryMatch(
  issue1: CategorizedIssue,
  issue2: CategorizedIssue,
): number {
  if (
    issue1.categorization.secondary === issue2.categorization.secondary &&
    issue1.categorization.secondary !== null
  ) {
    return 1.0
  }
  if (issue1.categorization.primary === issue2.categorization.primary) {
    return 0.5
  }
  return 0
}

/**
 * Calculate error pattern match score
 * Returns 1.0 for exact match, 0.8 for normalized match, 0 otherwise
 */
export function calculateErrorPatternMatch(
  issue1: CategorizedIssue,
  issue2: CategorizedIssue,
): number {
  const error1 = extractErrorMessage(issue1.body || '')
  const error2 = extractErrorMessage(issue2.body || '')

  if (!error1 || !error2) return 0
  if (error1 === error2) return 1.0

  const pattern1 = normalizeErrorPattern(error1)
  const pattern2 = normalizeErrorPattern(error2)

  return pattern1 === pattern2 ? 0.8 : 0
}

/**
 * Calculate temporal proximity score
 * Returns higher scores for issues created closer in time
 */
export function calculateTemporalProximity(
  issue1: CategorizedIssue,
  issue2: CategorizedIssue,
): number {
  const date1 = new Date(issue1.created_at).getTime()
  const date2 = new Date(issue2.created_at).getTime()
  const daysDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24)

  if (daysDiff <= 1) return 1.0
  if (daysDiff <= 7) return 0.7
  if (daysDiff <= 30) return 0.3
  return 0
}

/**
 * Calculate overall similarity between two issues using weighted signals
 */
export function calculateSimilarity(
  issue1: CategorizedIssue,
  issue2: CategorizedIssue,
): SimilarityResult {
  const signals: SimilaritySignals = {
    titleSimilarity: calculateTitleSimilarity(issue1.title, issue2.title),
    keywordOverlap: calculateKeywordOverlap(issue1, issue2),
    categoryMatch: calculateCategoryMatch(issue1, issue2),
    errorPatternMatch: calculateErrorPatternMatch(issue1, issue2),
    temporalProximity: calculateTemporalProximity(issue1, issue2),
  }

  // Weighted score calculation
  const score =
    signals.titleSimilarity * 0.3 +
    signals.keywordOverlap * 0.25 +
    signals.categoryMatch * 0.25 +
    signals.errorPatternMatch * 0.15 +
    signals.temporalProximity * 0.05

  const confidence: 'high' | 'medium' | 'low' =
    score >= 0.75 ? 'high' : score >= 0.6 ? 'medium' : 'low'

  const relationship = determineRelationship(score, signals)

  return {
    issue1: issue1.number,
    issue2: issue2.number,
    score,
    signals,
    confidence,
    relationship,
  }
}

/**
 * Determine the type of relationship between issues based on signals
 */
function determineRelationship(
  score: number,
  signals: SimilaritySignals,
): 'duplicate' | 'related' | 'consolidation' {
  // High similarity + error match = likely duplicate
  if (score >= 0.75 && signals.errorPatternMatch > 0.8) {
    return 'duplicate'
  }

  // High similarity + same subcategory = consolidation opportunity
  if (score >= 0.65 && signals.categoryMatch === 1.0) {
    return 'consolidation'
  }

  // Otherwise, just related
  return 'related'
}

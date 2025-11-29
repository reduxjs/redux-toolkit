/**
 * Issue categorization logic
 */

import type { Issue } from '../github/types.js'
import type { Categorization } from './types.js'
import { CATEGORIES, type CategoryConfig } from './config.js'

/**
 * Normalize text for matching (lowercase, trim)
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim()
}

/**
 * Check if issue has any matching labels (Tier 1)
 */
function checkLabels(issue: Issue): Categorization | null {
  const issueLabels = issue.labels.map(normalizeText)

  for (const category of CATEGORIES) {
    if (category.name === 'uncategorized') continue

    const hasMatchingLabel = category.labels.some((label) =>
      issueLabels.includes(normalizeText(label)),
    )

    if (hasMatchingLabel) {
      const type = detectIssueType(issue)
      const subcategory = findSubcategory(issue, category)

      return {
        primary: category.name,
        secondary: subcategory,
        type,
        confidence: 0.95,
        method: 'label',
      }
    }
  }

  return null
}

/**
 * Calculate keyword scores for each category (Tier 2)
 */
function calculateKeywordScores(issue: Issue): Map<string, number> {
  const scores = new Map<string, number>()
  const text = normalizeText(`${issue.title} ${issue.body}`)

  for (const category of CATEGORIES) {
    if (category.name === 'uncategorized') continue

    let score = 0

    // Check keywords
    for (const keyword of category.keywords) {
      if (text.includes(normalizeText(keyword))) {
        score += category.weight
      }
    }

    // Check patterns (weighted higher)
    for (const pattern of category.patterns) {
      if (pattern.test(issue.title) || pattern.test(issue.body)) {
        score += category.weight * 1.5
      }
    }

    if (score > 0) {
      scores.set(category.name, score)
    }
  }

  return scores
}

/**
 * Detect patterns in issue content (Tier 3)
 */
function detectPatterns(issue: Issue): Categorization | null {
  const scores = calculateKeywordScores(issue)

  if (scores.size === 0) {
    return null
  }

  // Get the highest scoring category
  let maxScore = 0
  let topCategory = ''

  for (const [category, score] of scores.entries()) {
    if (score > maxScore) {
      maxScore = score
      topCategory = category
    }
  }

  // Require a minimum score threshold
  if (maxScore < 2.0) {
    return null
  }

  const categoryConfig = CATEGORIES.find((c) => c.name === topCategory)
  if (!categoryConfig) return null

  const type = detectIssueType(issue)
  const subcategory = findSubcategory(issue, categoryConfig)

  // Calculate confidence based on score
  const confidence = Math.min(0.85, 0.5 + maxScore * 0.1)

  return {
    primary: topCategory,
    secondary: subcategory,
    type,
    confidence,
    method: 'pattern',
  }
}

/**
 * Find subcategory within a primary category
 */
function findSubcategory(
  issue: Issue,
  category: CategoryConfig,
): string | undefined {
  if (!category.subcategories) return undefined

  const text = normalizeText(`${issue.title} ${issue.body}`)
  let maxScore = 0
  let topSubcategory = ''

  for (const subcategory of category.subcategories) {
    let score = 0

    // Check keywords
    for (const keyword of subcategory.keywords) {
      if (text.includes(normalizeText(keyword))) {
        score += 1
      }
    }

    // Check patterns
    for (const pattern of subcategory.patterns) {
      if (pattern.test(issue.title) || pattern.test(issue.body)) {
        score += 2
      }
    }

    if (score > maxScore) {
      maxScore = score
      topSubcategory = subcategory.name
    }
  }

  // Require minimum score for subcategory
  return maxScore >= 1 ? topSubcategory : undefined
}

/**
 * Detect issue type (bug, feature, question, docs)
 */
function detectIssueType(
  issue: Issue,
): 'bug' | 'feature' | 'question' | 'docs' {
  const labels = issue.labels.map(normalizeText)
  const text = normalizeText(`${issue.title} ${issue.body}`)

  // Check labels first
  if (
    labels.some((l) => ['bug', 'type: bug', 'regression', 'defect'].includes(l))
  ) {
    return 'bug'
  }

  if (
    labels.some((l) =>
      ['enhancement', 'feature', 'feature request', 'type: feature'].includes(
        l,
      ),
    )
  ) {
    return 'feature'
  }

  if (labels.some((l) => ['documentation', 'docs', 'type: docs'].includes(l))) {
    return 'docs'
  }

  if (
    labels.some((l) =>
      ['question', 'help wanted', 'type: question'].includes(l),
    )
  ) {
    return 'question'
  }

  // Check content patterns
  if (
    /\b(bug|error|issue|broken|not working|doesn't work|crash|fail)/i.test(text)
  ) {
    return 'bug'
  }

  if (
    /\b(feature|enhancement|add|support|would be nice|could we|suggestion)/i.test(
      text,
    )
  ) {
    return 'feature'
  }

  if (/\b(how|what|why|when|where|question|\?)/i.test(issue.title)) {
    return 'question'
  }

  if (/\b(docs|documentation|readme|guide|tutorial|example)/i.test(text)) {
    return 'docs'
  }

  // Default to question for unclear cases
  return 'question'
}

/**
 * Main categorization function using multi-tier approach
 */
export function categorizeIssue(issue: Issue): Categorization {
  // Tier 1: Label-based (highest confidence)
  const labelResult = checkLabels(issue)
  if (labelResult) {
    return labelResult
  }

  // Tier 2: Keyword matching
  const scores = calculateKeywordScores(issue)
  if (scores.size > 0) {
    let maxScore = 0
    let topCategory = ''

    for (const [category, score] of scores.entries()) {
      if (score > maxScore) {
        maxScore = score
        topCategory = category
      }
    }

    if (maxScore >= 2.0) {
      const categoryConfig = CATEGORIES.find((c) => c.name === topCategory)
      if (categoryConfig) {
        const type = detectIssueType(issue)
        const subcategory = findSubcategory(issue, categoryConfig)
        const confidence = Math.min(0.8, 0.5 + maxScore * 0.08)

        return {
          primary: topCategory,
          secondary: subcategory,
          type,
          confidence,
          method: 'keyword',
        }
      }
    }
  }

  // Tier 3: Pattern detection
  const patternResult = detectPatterns(issue)
  if (patternResult) {
    return patternResult
  }

  // Fallback: Uncategorized
  return {
    primary: 'uncategorized',
    type: detectIssueType(issue),
    confidence: 0.3,
    method: 'manual',
  }
}

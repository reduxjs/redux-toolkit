/**
 * Main categorization pipeline
 */

import type { Issue } from '../github/types.js'
import type { CategorizedIssue } from './types.js'
import { categorizeIssue } from './categorizer.js'
import { calculateScores } from './scoring.js'
import { detectFlags } from './flags.js'

/**
 * Categorize a single issue with scores and flags
 */
export function categorizeSingleIssue(issue: Issue): CategorizedIssue {
  // Step 1: Categorize the issue
  const categorization = categorizeIssue(issue)

  // Step 2: Calculate scores
  const scores = calculateScores(issue)

  // Step 3: Detect flags
  const flags = detectFlags(issue, scores, categorization)

  // Step 4: Combine into categorized issue
  return {
    ...issue,
    categorization,
    scores,
    flags,
  }
}

/**
 * Categorize multiple issues
 */
export function categorizeIssues(issues: Issue[]): CategorizedIssue[] {
  return issues.map((issue) => categorizeSingleIssue(issue))
}

// Re-export types for convenience
export type {
  CategorizedIssue,
  Categorization,
  Scores,
  Flags,
} from './types.js'
export { CATEGORIES, getCategoryByName, getAllCategoryNames } from './config.js'

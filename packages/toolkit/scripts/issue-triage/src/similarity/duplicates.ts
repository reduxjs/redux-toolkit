import type { CategorizedIssue } from '../categorize/types.js'
import type { DuplicateGroup, SimilarityResult } from './types.js'
import { calculateSimilarity } from './similarity.js'

/**
 * Find potential duplicates for all issues
 * Returns groups where each group has a primary issue and its duplicates
 */
export function findAllDuplicates(
  issues: CategorizedIssue[],
): DuplicateGroup[] {
  const duplicateGroups: DuplicateGroup[] = []
  const processed = new Set<number>()

  for (const issue of issues) {
    if (processed.has(issue.number)) continue

    const duplicates = findPotentialDuplicates(issue, issues).filter(
      (result) => result.confidence !== 'low',
    )

    if (duplicates.length > 0) {
      duplicateGroups.push({
        primary: issue,
        duplicates: duplicates.map((result) => ({
          issue: issues.find((i) => i.number === result.issue2)!,
          confidence: result.score,
          signals: result.signals,
        })),
      })

      // Mark all as processed
      processed.add(issue.number)
      duplicates.forEach((d) => processed.add(d.issue2))
    }
  }

  return duplicateGroups.sort(
    (a, b) => b.duplicates.length - a.duplicates.length,
  )
}

/**
 * Find potential duplicates for a single issue
 * Returns up to 5 most similar issues with medium or high confidence
 */
export function findPotentialDuplicates(
  issue: CategorizedIssue,
  allIssues: CategorizedIssue[],
): SimilarityResult[] {
  return allIssues
    .filter((other) => other.number !== issue.number)
    .map((other) => calculateSimilarity(issue, other))
    .filter((result) => result.score >= 0.6) // Medium confidence threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // Top 5 potential duplicates
}

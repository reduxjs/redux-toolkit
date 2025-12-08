/**
 * Common English stop words to filter out during tokenization
 */
const STOP_WORDS = new Set([
  'the',
  'is',
  'at',
  'which',
  'on',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'with',
  'to',
  'for',
  'of',
  'as',
  'by',
  'from',
  'that',
  'this',
])

/**
 * Tokenize text into words, removing stop words and short words
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .filter((word) => !STOP_WORDS.has(word))
}

/**
 * Extract technical keywords from text using pattern matching
 */
export function extractKeywords(text: string): string[] {
  const patterns = {
    // RTK Query specific patterns
    technical: /\b[a-z]+Query\b|\b[a-z]+Mutation\b|createApi|fetchBaseQuery/gi,
    // Error-related keywords
    errors: /\b(error|bug|issue|problem|fail|crash|broken)\b/gi,
    // Domain-specific keywords
    domain: /\b(polling|cache|invalidate|refetch|ssr|hydration|optimistic)\b/gi,
    // Function calls
    functions: /\b\w+\(\)/g,
  }

  const keywords: string[] = []
  for (const pattern of Object.values(patterns)) {
    const matches = text.match(pattern) || []
    keywords.push(...matches.map((k) => k.toLowerCase()))
  }

  return [...new Set(keywords)]
}

/**
 * Extract error message from issue body
 */
export function extractErrorMessage(body: string): string | null {
  const patterns = [
    /Error: (.+?)(?:\n|$)/i,
    /TypeError: (.+?)(?:\n|$)/i,
    /Exception: (.+?)(?:\n|$)/i,
    /Failed to (.+?)(?:\n|$)/i,
  ]

  for (const pattern of patterns) {
    const match = body.match(pattern)
    if (match) return match[1].trim()
  }

  return null
}

/**
 * Normalize error pattern for comparison by replacing specific values
 * with placeholders
 */
export function normalizeErrorPattern(error: string): string {
  return error
    .replace(/\d+/g, 'N') // Replace numbers with N
    .replace(/'[^']+'/g, 'STR') // Replace single-quoted strings
    .replace(/"[^"]+"/g, 'STR') // Replace double-quoted strings
}

/**
 * Group array by key function
 */
export function groupBy<T>(
  array: T[],
  keyFn: (item: T) => string,
): Record<string, T[]> {
  return array.reduce(
    (acc, item) => {
      const key = keyFn(item)
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    },
    {} as Record<string, T[]>,
  )
}

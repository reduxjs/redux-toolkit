/**
 * Custom error classes for GitHub operations
 */

/**
 * Base error class for GitHub-related errors
 */
export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'GitHubError'
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/**
 * Error thrown when gh CLI is not found or not authenticated
 */
export class GhCliError extends GitHubError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'GhCliError'
  }
}

/**
 * Error thrown for network or API errors
 */
export class GhApiError extends GitHubError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    cause?: unknown,
  ) {
    super(message, cause)
    this.name = 'GhApiError'
  }
}

/**
 * Error thrown when JSON response cannot be parsed
 */
export class GhParseError extends GitHubError {
  constructor(
    message: string,
    public readonly rawOutput?: string,
    cause?: unknown,
  ) {
    super(message, cause)
    this.name = 'GhParseError'
  }
}

/**
 * GitHub Issues Triage Tool
 *
 * Main entry point for the issue triage automation tool.
 */

import { GitHubClient, checkGhCli } from './github/gh-client.js'
import { GhCliError, GhApiError, GhParseError } from './utils/errors.js'

async function main() {
  console.log('GitHub Issues Triage Tool v1.0.0')
  console.log('==================================\n')

  try {
    // Step 1: Verify gh CLI is available and authenticated
    console.log('Checking GitHub CLI...')
    await checkGhCli()
    console.log('✓ GitHub CLI is installed and authenticated\n')

    // Step 2: Create GitHub client
    const client = new GitHubClient()

    // Step 3: Fetch all open issues and PRs
    console.log('Fetching data from reduxjs/redux-toolkit...\n')
    const allItems = await client.fetchAll()

    // Step 4: Display summary statistics
    const issues = allItems.filter((item) => item.type === 'issue')
    const prs = allItems.filter((item) => item.type === 'pr')

    console.log('\n📊 Summary Statistics')
    console.log('====================')
    console.log(`Total open issues: ${issues.length}`)
    console.log(`Total open PRs: ${prs.length}`)
    console.log(`Total items: ${allItems.length}\n`)

    // Step 5: Fetch details for a few sample issues
    if (issues.length > 0) {
      console.log('📝 Sample Issue Details')
      console.log('======================\n')

      const samplesToFetch = Math.min(3, issues.length)
      for (let i = 0; i < samplesToFetch; i++) {
        const issue = issues[i]
        console.log(`Fetching details for issue #${issue.number}...`)

        try {
          const detailed = await client.fetchIssueDetail(issue.number)

          console.log(`\nIssue #${detailed.number}: ${detailed.title}`)
          console.log(`Author: ${detailed.author}`)
          console.log(`Created: ${detailed.created_at.toISOString()}`)
          console.log(`Labels: ${detailed.labels.join(', ') || 'none'}`)
          console.log(`Comments: ${detailed.comments.length}`)

          if (detailed.comments.length > 0) {
            console.log(
              `Latest comment by: ${detailed.comments[detailed.comments.length - 1].author}`,
            )
          }

          console.log('')
        } catch (error) {
          console.error(
            `Failed to fetch details for issue #${issue.number}:`,
            error,
          )
        }
      }
    }

    console.log('\n✓ Data fetching complete!')
    console.log('\nNext steps:')
    console.log('- Implement categorization logic')
    console.log('- Generate triage reports')
    console.log('- Add caching for better performance')
  } catch (error) {
    // Handle specific error types with helpful messages
    if (error instanceof GhCliError) {
      console.error('\n❌ GitHub CLI Error:')
      console.error(error.message)
      console.error('\nPlease ensure:')
      console.error('1. GitHub CLI is installed: https://cli.github.com/')
      console.error('2. You are authenticated: gh auth login')
      process.exit(1)
    } else if (error instanceof GhApiError) {
      console.error('\n❌ GitHub API Error:')
      console.error(error.message)
      if (error.statusCode === 429) {
        console.error('\nYou have hit the GitHub API rate limit.')
        console.error('Please wait a while before trying again.')
      }
      process.exit(1)
    } else if (error instanceof GhParseError) {
      console.error('\n❌ Parse Error:')
      console.error(error.message)
      console.error('\nThe GitHub CLI returned unexpected data.')
      process.exit(1)
    } else {
      // Unknown error
      console.error('\n❌ Unexpected Error:')
      console.error(error)
      process.exit(1)
    }
  }
}

// Run the main function
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

export { main }

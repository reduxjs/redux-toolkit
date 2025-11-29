/**
 * GitHub Issues Triage Tool
 *
 * Main entry point for the issue triage automation tool.
 */

import { writeFile } from 'fs/promises'
import { GitHubClient, checkGhCli } from './github/gh-client.js'
import { GhCliError, GhApiError, GhParseError } from './utils/errors.js'
import { categorizeIssues, CATEGORIES } from './categorize/index.js'

async function main() {
  console.log('GitHub Issues Triage Tool v1.0.0')
  console.log('==================================\n')

  try {
    // Parse CLI arguments
    const useCache = process.argv.includes('--use-cache')

    // Step 1: Verify gh CLI is available and authenticated
    console.log('Checking GitHub CLI...')
    await checkGhCli()
    console.log('✓ GitHub CLI is installed and authenticated\n')

    // Step 2: Create GitHub client
    const client = new GitHubClient()

    // Step 3: Fetch all open issues and PRs
    console.log('Fetching data from reduxjs/redux-toolkit...\n')
    const allItems = await client.fetchAll({ useCache })

    // Step 4: Categorize all items
    console.log('Categorizing issues...\n')
    const categorizedItems = categorizeIssues(allItems)

    // Step 5: Display summary statistics
    const issues = categorizedItems.filter((item) => item.type === 'issue')
    const prs = categorizedItems.filter((item) => item.type === 'pr')

    console.log('\n📊 Summary Statistics')
    console.log('====================')
    console.log(`Total open issues: ${issues.length}`)
    console.log(`Total open PRs: ${prs.length}`)
    console.log(`Total items: ${allItems.length}\n`)

    // Step 6: Display categorization statistics
    console.log('📂 Categorization Breakdown')
    console.log('===========================')

    const categoryStats = new Map<string, number>()
    const typeStats = new Map<string, number>()
    let urgentCount = 0
    let easyFixCount = 0
    let needsTriageCount = 0

    for (const item of categorizedItems) {
      // Count by primary category
      const category = item.categorization.primary
      categoryStats.set(category, (categoryStats.get(category) || 0) + 1)

      // Count by type
      const type = item.categorization.type
      typeStats.set(type, (typeStats.get(type) || 0) + 1)

      // Count flags
      if (item.flags.isUrgent) urgentCount++
      if (item.flags.isEasyFix) easyFixCount++
      if (item.flags.needsTriage) needsTriageCount++
    }

    // Display category breakdown
    console.log('\nBy Category:')
    for (const category of CATEGORIES) {
      const count = categoryStats.get(category.name) || 0
      const percentage = ((count / categorizedItems.length) * 100).toFixed(1)
      console.log(`  ${category.displayName}: ${count} (${percentage}%)`)
    }

    // Display type breakdown
    console.log('\nBy Type:')
    for (const [type, count] of typeStats.entries()) {
      const percentage = ((count / categorizedItems.length) * 100).toFixed(1)
      console.log(`  ${type}: ${count} (${percentage}%)`)
    }

    // Display flags
    console.log('\nFlags:')
    console.log(`  🚨 Urgent: ${urgentCount}`)
    console.log(`  ✅ Easy Fix: ${easyFixCount}`)
    console.log(`  🏷️  Needs Triage: ${needsTriageCount}`)

    // Step 7: Display sample categorized issues
    if (issues.length > 0) {
      console.log('\n📝 Sample Categorized Issues')
      console.log('============================\n')

      const samplesToShow = Math.min(5, issues.length)
      for (let i = 0; i < samplesToShow; i++) {
        const issue = issues[i]
        const cat = issue.categorization
        const scores = issue.scores
        const flags = issue.flags

        console.log(`Issue #${issue.number}: ${issue.title}`)
        console.log(
          `  Category: ${cat.primary}${cat.secondary ? ` > ${cat.secondary}` : ''}`,
        )
        console.log(
          `  Type: ${cat.type} | Confidence: ${(cat.confidence * 100).toFixed(0)}% | Method: ${cat.method}`,
        )
        console.log(
          `  Scores: Urgency=${scores.urgency} Complexity=${scores.complexity} Engagement=${scores.engagement}`,
        )

        const activeFlags = []
        if (flags.isUrgent) activeFlags.push('🚨 Urgent')
        if (flags.isEasyFix) activeFlags.push('✅ Easy Fix')
        if (flags.needsTriage) activeFlags.push('🏷️ Needs Triage')
        if (flags.isStale) activeFlags.push('⏰ Stale')
        if (flags.hasBreakingChange) activeFlags.push('💥 Breaking')
        if (flags.needsRepro) activeFlags.push('🔍 Needs Repro')

        if (activeFlags.length > 0) {
          console.log(`  Flags: ${activeFlags.join(', ')}`)
        }
        console.log('')
      }
    }

    // Step 8: Export categorization results to JSON
    console.log('\n💾 Exporting categorization results...')
    const outputPath = 'cache/categorization-results.json'

    const exportData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalItems: categorizedItems.length,
        totalIssues: issues.length,
        totalPRs: prs.length,
      },
      statistics: {
        byCategory: Object.fromEntries(categoryStats),
        byType: Object.fromEntries(typeStats),
        flags: {
          urgent: urgentCount,
          easyFix: easyFixCount,
          needsTriage: needsTriageCount,
        },
      },
      items: categorizedItems.map((item) => ({
        number: item.number,
        title: item.title,
        body: item.body,
        state: item.state,
        type: item.type,
        url: item.url,
        author: item.author,
        labels: item.labels,
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
        comment_count: item.comment_count,
        categorization: item.categorization,
        scores: item.scores,
        flags: item.flags,
      })),
    }

    await writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf-8')
    console.log(`✓ Results exported to ${outputPath}`)

    console.log('\n✓ Categorization complete!')
    console.log('\nNext steps:')
    console.log(
      '- Review categorization results in cache/categorization-results.json',
    )
    console.log('- Use LLM to analyze categorization accuracy')
    console.log('- Generate detailed triage reports')
    console.log('- Add LLM-based categorization for ambiguous cases')
    console.log('- Implement trend analysis')
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

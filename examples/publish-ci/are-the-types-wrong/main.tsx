import path from 'path'
import fs from 'fs'
import util from 'util'

import { fileURLToPath } from 'node:url'
import {
  checkTgz,
  summarizeProblems,
  getProblems,
  Analysis,
  ProblemSummary,
  Problem,
  ResolutionKind,
  ProblemKind,
} from 'are-the-types-wrong-core'
import React from 'react'
import { render, Text, Box } from 'ink'

const allResolutionKinds: ResolutionKind[] = [
  'node10',
  'node16-cjs',
  'node16-esm',
  'bundler',
]

const problemEmoji: Record<ProblemKind, string> = {
  Wildcard: '❓',
  NoResolution: '💀',
  UntypedResolution: '❌',
  FalseCJS: '🎭',
  FalseESM: '👺',
  CJSResolvesToESM: '⚠️',
  FallbackCondition: '🐛',
  CJSOnlyExportsDefault: '🤨',
  FalseExportDefault: '❗️',
}

const problemShortDescriptions: Record<ProblemKind, string> = {
  Wildcard: `${problemEmoji.Wildcard} Unable to check`,
  NoResolution: `${problemEmoji.NoResolution} Failed to resolve`,
  UntypedResolution: `${problemEmoji.UntypedResolution} No types`,
  FalseCJS: `${problemEmoji.FalseCJS} Masquerading as CJS`,
  FalseESM: `${problemEmoji.FalseESM} Masquerading as ESM`,
  CJSResolvesToESM: `${problemEmoji.CJSResolvesToESM} ESM (dynamic import only)`,
  FallbackCondition: `${problemEmoji.FallbackCondition} Used fallback condition`,
  CJSOnlyExportsDefault: `${problemEmoji.CJSOnlyExportsDefault} CJS default export`,
  FalseExportDefault: `${problemEmoji.FalseExportDefault} Incorrect default export`,
}

const resolutionKinds: Record<ResolutionKind, string> = {
  node10: 'node10',
  'node16-cjs': 'node16 (from CJS)',
  'node16-esm': 'node16 (from ESM)',
  bundler: 'bundler',
}

const moduleKinds = {
  1: '(CJS)',
  99: '(ESM)',
  '': '',
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface Checks {
  analysis: Analysis
  problemSummaries?: ProblemSummary[]
  problems?: Problem[]
}

const rtkPackagePath = path.join(__dirname, './package.tgz')

const rtkPackageTgzBytes = fs.readFileSync(rtkPackagePath)

function Header({ text, width }: { text: string; width: number | string }) {
  return (
    <Box borderStyle="single" width={width}>
      <Text color="blue">{text}</Text>
    </Box>
  )
}

function ChecksTable(props: { checks?: Checks }) {
  if (!props.checks || !props.checks.analysis.containsTypes) {
    return null
  }

  const { analysis, problems, problemSummaries } = props.checks
  const subpaths = Object.keys(analysis.entrypointResolutions).filter(
    (key) => !key.includes('package.json')
  )
  const entrypoints = subpaths.map((s) =>
    s === '.'
      ? analysis.packageName
      : `${analysis.packageName}/${s.substring(2)}`
  )

  const numColumns = entrypoints.length + 1

  const columnWidth = `${100 / numColumns}%`

  return (
    <Box flexDirection="column" width="100%">
      <Box>
        <Header key={'empty'} text={''} width={columnWidth} />
        {entrypoints.map((text) => {
          return <Header key={text} text={text} width={columnWidth} />
        })}
      </Box>
      {allResolutionKinds.map((resolutionKind) => {
        return (
          <Box key={resolutionKind} width="100%">
            <Box borderStyle="single" width={columnWidth}>
              <Text>{resolutionKinds[resolutionKind]}</Text>
            </Box>
            {subpaths.map((subpath) => {
              const problemsForCell = problems?.filter(
                (problem) =>
                  problem.entrypoint === subpath &&
                  problem.resolutionKind === resolutionKind
              )
              const resolution =
                analysis.entrypointResolutions[subpath][resolutionKind]
                  .resolution

              let content: React.ReactNode

              if (problemsForCell?.length) {
                content = (
                  <Box flexDirection="column">
                    {problemsForCell.map((problem) => {
                      return (
                        <Box key={problem.kind}>
                          <Text>{problemShortDescriptions[problem.kind]}</Text>
                        </Box>
                      )
                    })}
                  </Box>
                )
              } else if (resolution?.isJson) {
                content = <Text>✅ (JSON)</Text>
              } else {
                content = (
                  <Text>
                    {'✅ ' + moduleKinds[resolution?.moduleKind || '']}
                  </Text>
                )
              }
              return (
                <Box key={subpath} width={columnWidth} borderStyle="single">
                  {content}
                </Box>
              )
            })}
          </Box>
        )
      })}
      {problemSummaries?.map((summary) => {
        return (
          <Box width="100%" key={summary.kind} flexDirection="column">
            <Text color="red" bold>
              {summary.kind}: {summary.title}
            </Text>
            {summary.messages.map((message) => {
              return (
                <Text key={message.messageText}>{message.messageText}</Text>
              )
            })}
          </Box>
        )
      })}
    </Box>
  )
}

;(async function main() {
  const analysis = await checkTgz(rtkPackageTgzBytes)
  if ('entrypointResolutions' in analysis) {
    const problems = analysis.containsTypes ? getProblems(analysis) : undefined

    // console.log(
    //   'Analysis: ',
    //   util.inspect(analysis.entrypointResolutions, { depth: 3 })
    // )
    if (problems) {
      // for (let problem of problems) {
      //   console.log('Problem: ', problem)
      // }
      const problemSummaries = analysis.containsTypes
        ? summarizeProblems(problems, analysis)
        : undefined
      // if (problemSummaries) {
      //   for (let summary of problemSummaries) {
      //     console.log('Summary: ', summary)
      //   }
      // }
      const checks: Checks = {
        analysis,
        problems,
        problemSummaries,
      }

      render(<ChecksTable checks={checks} />)
    }
  }
})()

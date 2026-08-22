#!/usr/bin/env node --import=tsx

import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const entryPointDirectories = ['', 'react', 'query', 'query/react']

const typeDefinitionEntryFiles = entryPointDirectories.flatMap(
  (filePath) =>
    [
      path.join(import.meta.dirname, '..', 'dist', filePath, 'index.d.ts'),
      path.join(import.meta.dirname, '..', 'dist', filePath, 'index.d.mts'),
    ] as const,
)

const filePathsToContentMap = new Map<string, string>(
  await Promise.all(
    typeDefinitionEntryFiles.map(
      async (filePath) =>
        [filePath, await fs.readFile(filePath, { encoding: 'utf-8' })] as const,
    ),
  ),
)

const main = async () => {
  filePathsToContentMap.forEach(async (content, filePath) => {
    const exportedUniqueSymbols = new Set<string>()

    console.log(`Fixing \`unique symbol\` exports in ${filePath}`)

    const lines = content.split('\n')

    const allUniqueSymbols = lines
      .filter((line) => /declare const (\w+): unique symbol;/.test(line))
      .map((line) => line.match(/declare const (\w+): unique symbol;/)?.[1])

    if (allUniqueSymbols.length === 0) {
      console.log(`${filePath} does not have any unique symbols.`)

      return
    }

    // Locate the named export statement by searching rather than by fixed
    // offset. tsup emitted a trailing newline, tsdown does not, so a
    // hardcoded `lines.at(-2)` silently misses it and leaves the unique
    // symbols unexported.
    const namedExportsLineIndex = lines.findLastIndex((line) =>
      /^export \{ (.*) \};$/.test(line),
    )

    const allNamedExports = lines[namedExportsLineIndex]
      ?.match(/^export \{ (.*) \};$/)?.[1]
      .split(', ')

    allNamedExports?.forEach((namedExport) => {
      if (allUniqueSymbols.includes(namedExport)) {
        exportedUniqueSymbols.add(namedExport)
      }
    })

    if (exportedUniqueSymbols.size === 0) {
      console.log(
        `${filePath} has unique symbols but none of them are exported.`,
      )

      return
    }

    let newContent = `${lines.slice(0, namedExportsLineIndex).join('\n')}\nexport { ${allNamedExports?.filter((namedExport) => !exportedUniqueSymbols.has(namedExport)).join(', ')} };\n`

    exportedUniqueSymbols.forEach((uniqueSymbol) => {
      console.log(`Exporting \`${uniqueSymbol}\` from ${filePath}`)

      newContent = newContent.replace(
        `declare const ${uniqueSymbol}`,
        `export declare const ${uniqueSymbol}`,
      )
    })

    await fs.writeFile(filePath, newContent, { encoding: 'utf-8' })
  })
}

void main()

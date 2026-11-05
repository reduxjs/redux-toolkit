#!/usr/bin/env node --import=tsx

import * as fs from 'node:fs/promises'
import * as path from 'node:path'

// The dts bundler renames a declaration to `Name$1` when another type in the
// same bundle uses the same name (for example `infer Slice`). The public
// export stays `Name`, but editor hovers and error messages show `Name$1`.

const entryPointDirectories = ['', 'react', 'query', 'query/react']

const typeDefinitionEntryFiles = entryPointDirectories.flatMap((filePath) => [
  path.join(import.meta.dirname, '..', 'dist', filePath, 'index.d.ts'),
  path.join(import.meta.dirname, '..', 'dist', filePath, 'index.d.mts'),
])

const renamedExportPattern = /^(\w+\$\d+) as (\w+)$/

const problems: string[] = []

for (const filePath of typeDefinitionEntryFiles) {
  const content = await fs.readFile(filePath, { encoding: 'utf-8' })

  const namedExports = content
    .split('\n')
    .flatMap(
      (line) => line.match(/^export \{ (.*) \};$/)?.[1].split(', ') ?? [],
    )

  for (const namedExport of namedExports) {
    const match = namedExport.replace(/^type /, '').match(renamedExportPattern)

    if (match) {
      problems.push(
        `${path.relative(process.cwd(), filePath)}: \`${match[2]}\` is declared as \`${match[1]}\``,
      )
    }
  }
}

if (problems.length > 0) {
  console.error(
    'Renamed type declarations found in the bundled types. Users will see these names in editor hovers.\n' +
      'Usually a local type or `infer` variable shadows a public type name. Rename the local one.\n',
  )
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  process.exit(1)
}

console.log('No renamed public type declarations found.')

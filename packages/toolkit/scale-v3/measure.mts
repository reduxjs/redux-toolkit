/**
 * Measures tsc --extendedDiagnostics per fixture, one isolated program each.
 * Writes tsconfig.scale.json (extends ../tsconfig.base.json for the paths
 * mapping) with a single `files` entry per run.
 *
 * Run from packages/toolkit: bun scale-v3/measure.mts [filter]
 */
import { execSync } from 'node:child_process'
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const scaleDir = import.meta.dirname
const toolkitDir = join(scaleDir, '..')
const filter = process.argv[2]

const fixtures = readdirSync(join(scaleDir, 'fixtures'))
  .filter((f) => f.endsWith('.ts'))
  .filter((f) => !filter || f.includes(filter))
  .sort((a, b) => {
    const size = (s: string) => Number(/-(\d+)\.ts$/.exec(s)?.[1] ?? 0)
    return size(a) - size(b) || a.localeCompare(b)
  })

interface Row {
  fixture: string
  types: number
  instantiations: number
  memoryK: number
  checkTime: number
  totalTime: number
}

const rows: Row[] = []

for (const fixture of fixtures) {
  writeFileSync(
    join(scaleDir, 'tsconfig.scale.json'),
    JSON.stringify(
      {
        extends: '../tsconfig.base.json',
        compilerOptions: {
          noEmit: true,
          types: ['node'],
          rootDir: '..',
        },
        files: [`fixtures/${fixture}`],
        include: [],
      },
      null,
      2,
    ),
  )

  let out = ''
  try {
    out = execSync(
      'node ../../node_modules/typescript/bin/tsc -p scale-v3/tsconfig.scale.json --extendedDiagnostics',
      { cwd: toolkitDir, encoding: 'utf8' },
    )
  } catch (err: any) {
    out = String(err.stdout ?? '')
    const diagStart = out.indexOf('Files:')
    const errors = diagStart >= 0 ? out.slice(0, diagStart) : out
    if (errors.trim()) {
      console.error(`ERRORS in ${fixture}:\n${errors.trim()}\n`)
    }
  }

  const num = (label: string) => {
    const m = new RegExp(`${label}:\\s+([\\d.]+)K?`).exec(out)
    return m ? Number(m[1]) : NaN
  }
  const row: Row = {
    fixture: fixture.replace('.ts', ''),
    types: num('Types'),
    instantiations: num('Instantiations'),
    memoryK: num('Memory used'),
    checkTime: num('Check time'),
    totalTime: num('Total time'),
  }
  rows.push(row)
  console.log(
    `${row.fixture.padEnd(24)} inst=${String(row.instantiations).padStart(9)} types=${String(row.types).padStart(7)} check=${row.checkTime}s total=${row.totalTime}s`,
  )
}

console.log('\n| fixture | instantiations | types | check (s) | total (s) |')
console.log('|---|---|---|---|---|')
for (const r of rows) {
  console.log(
    `| ${r.fixture} | ${r.instantiations.toLocaleString('en-US')} | ${r.types.toLocaleString('en-US')} | ${r.checkTime} | ${r.totalTime} |`,
  )
}

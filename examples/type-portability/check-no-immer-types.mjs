// Fails if emitted declarations reference types from `immer` instead of the
// `Draft` / `WritableDraft` / `Patch` types exported by `@reduxjs/toolkit`.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const distDir = process.argv[2] ?? 'dist'
const immerReference =
  /import\(["']immer["']\)|\bfrom\s+["']immer["']|require\(["']immer["']\)/

const failures = []

const visit = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      visit(fullPath)
    } else if (/\.d\.[cm]?ts$/.test(entry.name)) {
      readFileSync(fullPath, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (immerReference.test(line)) {
            failures.push(`${fullPath}:${index + 1}: ${line.trim()}`)
          }
        })
    }
  }
}

visit(distDir)

if (failures.length > 0) {
  console.error('Emitted declarations reference Immer types:')
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`No Immer type references found in ${distDir}`)

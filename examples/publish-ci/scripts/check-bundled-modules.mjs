#!/usr/bin/env node
/**
 * Asserts which build artifacts of RTK and its dependencies a bundler actually
 * pulled into an example's output.
 *
 * RTK publishes several builds of every entry point (`modern.mjs`,
 * `legacy-esm.js`, `browser.mjs`, `dist/cjs/*`) and picks between them through
 * the `exports` map. Nothing in the examples proved which one a given bundler
 * chose, so a regression in the conditions map could ship silently. This reads
 * the `sources` array out of each build's sourcemaps, keeps the entries that
 * belong to a Redux package, and compares the sorted list to a committed
 * snapshot.
 *
 * Usage:
 *   node ../scripts/check-bundled-modules.mjs <dir> [...dirs]
 *
 * Each <dir> is searched recursively for `.map` files. Run with
 * `UPDATE_SNAPSHOTS=1` to rewrite the snapshot instead of comparing.
 *
 * Deliberately depends on nothing outside `node:*`. The examples live outside
 * the root workspaces array and each carries its own lockfile, so a shared
 * script can only be called by path, not installed.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const TRACKED_PACKAGES = [
  '@reduxjs/toolkit',
  '@standard-schema/spec',
  '@standard-schema/utils',
  'immer',
  'react-redux',
  'redux',
  'redux-thunk',
  'reselect',
]

const SNAPSHOT_FILE = 'bundled-modules.snapshot.txt'
const NODE_MODULES = 'node_modules/'

/** @param {string} dir @returns {string[]} */
function findSourcemaps(dir) {
  if (!existsSync(dir)) return []
  /** @type {string[]} */
  const found = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      found.push(...findSourcemaps(full))
    } else if (entry.endsWith('.map')) {
      found.push(full)
    }
  }
  return found
}

/**
 * Sourcemap `sources` entries arrive in four shapes across the bundlers we
 * use: absolute Windows paths from Metro, `../../node_modules/...` from
 * Rolldown, `turbopack:///[project]/...` from Turbopack, and root-relative
 * `/node_modules/...` from Expo. Everything after the final `node_modules/`
 * segment is stable across all of them.
 *
 * Files inside a `cjs/` directory collapse to `cjs/*`. A package's CJS build
 * may be one file or an `index.js` that branches on `NODE_ENV` between a
 * development and a production file, and packages change between those two
 * layouts in minor releases. That layout is the dependency's own packaging
 * choice, not a resolution outcome, and CI re-resolves every transitive
 * dependency when it installs the freshly built RTK tarball. Recording exact
 * CJS filenames therefore fails unrelated PRs whenever a dependency ships a
 * minor. The modern / legacy-esm / browser filenames stay exact, since those
 * are the resolution outcomes this check exists to pin down.
 *
 * @param {string} source
 * @returns {string | null}
 */
function toPackagePath(source) {
  const normalized = source.split('\\').join('/')
  const index = normalized.lastIndexOf(NODE_MODULES)
  if (index === -1) return null
  const packagePath = normalized.slice(index + NODE_MODULES.length)
  const isTracked = TRACKED_PACKAGES.some(
    (name) => packagePath === name || packagePath.startsWith(`${name}/`),
  )
  if (!isTracked) return null
  return packagePath.replace(/\/cjs\/.+$/, '/cjs/*')
}

/** @param {string[]} dirs @returns {{ modules: string[], mapCount: number }} */
function collectModules(dirs) {
  /** @type {Set<string>} */
  const modules = new Set()
  let mapCount = 0

  for (const dir of dirs) {
    for (const mapFile of findSourcemaps(dir)) {
      /** @type {{ sources?: (string | null)[] }} */
      let parsed
      try {
        parsed = JSON.parse(readFileSync(mapFile, 'utf8'))
      } catch (error) {
        throw new Error(`Could not parse sourcemap ${mapFile}: ${error}`)
      }
      if (!Array.isArray(parsed.sources)) continue
      mapCount++
      for (const source of parsed.sources) {
        if (!source) continue
        const packagePath = toPackagePath(source)
        if (packagePath) modules.add(packagePath)
      }
    }
  }

  return { modules: [...modules].sort(), mapCount }
}

function main() {
  const dirs = process.argv.slice(2)
  if (dirs.length === 0) {
    console.error(
      'Usage: node ../scripts/check-bundled-modules.mjs <dir> [...dirs]',
    )
    process.exit(1)
  }

  const { modules, mapCount } = collectModules(dirs)

  if (mapCount === 0) {
    console.error(
      `No sourcemaps found under ${dirs.join(', ')}.\n` +
        'The build must emit sourcemaps for this check to mean anything.',
    )
    process.exit(1)
  }

  if (modules.length === 0) {
    console.error(
      `Found ${mapCount} sourcemap(s) but no Redux packages in them.\n` +
        'Either the build is broken or the sourcemaps do not name their inputs.',
    )
    process.exit(1)
  }

  const snapshotPath = resolve(process.cwd(), SNAPSHOT_FILE)
  const actual = `${modules.join('\n')}\n`

  if (process.env.UPDATE_SNAPSHOTS === '1' || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, actual)
    console.log(`Wrote ${SNAPSHOT_FILE} (${modules.length} modules)`)
    return
  }

  const expected = readFileSync(snapshotPath, 'utf8')
  if (expected === actual) {
    console.log(
      `Bundled modules match ${SNAPSHOT_FILE} (${modules.length} modules from ${mapCount} sourcemaps)`,
    )
    return
  }

  const expectedLines = new Set(expected.trim().split('\n'))
  const actualLines = new Set(modules)
  const added = modules.filter((line) => !expectedLines.has(line))
  const removed = [...expectedLines].filter((line) => !actualLines.has(line))

  console.error(`Bundled modules do not match ${SNAPSHOT_FILE}:`)
  for (const line of removed) console.error(`  - ${line}`)
  for (const line of added) console.error(`  + ${line}`)
  console.error(
    '\nIf this change is intended, re-run with UPDATE_SNAPSHOTS=1 and commit the snapshot.',
  )
  process.exit(1)
}

main()

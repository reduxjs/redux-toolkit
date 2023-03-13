import path from 'path'
import fs from 'fs'

import { fileURLToPath } from 'node:url'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const gitRev = process.argv[2]

const packagePath = path.join(__dirname, '../package.json')
const pkg = require(packagePath)

pkg.version = `${pkg.version}-${gitRev}`
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2))

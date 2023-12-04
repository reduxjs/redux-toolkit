// TODO This entire file doesn't work yet with RTK 1.9.3 master

import assert from 'node:assert'
import path from 'path'
import { importMetaResolve } from 'resolve-esm'

import { createSlice } from '@reduxjs/toolkit'
import { createApi as createApiPlain } from '@reduxjs/toolkit/query'
import { createApi as createApiReact } from '@reduxjs/toolkit/query/react'

console.log('Testing Node with ESM imports...')

function checkFunctionName(fn, name, category) {
  console.log(`Checking ${category} '${name}' === '${fn.name}'`)
  assert(
    fn.name === name,
    `${category} \`${name}\` did not import correctly (name: '${fn.name}')`
  )
}

const entries = [
  [createSlice, 'createSlice', 'Core'],
  [createApiPlain, 'baseCreateApi', 'RTKQ core'],
  [createApiReact, 'baseCreateApi', 'RTKQ React'],
]

for (let [fn, name, category] of entries) {
  try {
    checkFunctionName(fn, name, category)
  } catch (error) {
    console.error(error)
  }
}

const moduleNames = [
  ['@reduxjs/toolkit', 'dist/redux-toolkit.modern.mjs'],
  ['@reduxjs/toolkit/query', 'dist/query/rtk-query.modern.mjs'],
  [
    '@reduxjs/toolkit/query/react',
    'dist/query/react/rtk-query-react.modern.mjs',
  ],
]

;(async () => {
  for (let [moduleName, expectedFilename] of moduleNames) {
    const modulePath = await importMetaResolve(moduleName)
    const posixPath = modulePath.split(path.sep).join(path.posix.sep)
    console.log(`Module: ${moduleName}, path: ${posixPath}`)
    assert(posixPath.endsWith(expectedFilename))
  }
})()

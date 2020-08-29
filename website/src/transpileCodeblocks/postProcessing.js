/** @typedef {import('./plugin').VirtualFiles} VirtualFiles */

const prettier = require('prettier')

module.exports = {
  postProcessTs,
  postProcessTranspiledJs
}

/**
 * @param {VirtualFiles} files
 * @param {string|undefined} parentFile
 * @returns {VirtualFiles}
 */
function postProcessTs(files, parentFile) {
  return fromEntries(
    Object.entries(files).map(([name, file]) => {
      const prettyCode = prettify(file.code, name, parentFile || name)

      return [
        name,
        {
          ...file,
          code: prettyCode
        }
      ]
    })
  )
}

/**
 * @param {VirtualFiles} files
 * @param {string|undefined} parentFile
 * @returns {VirtualFiles}
 */
function postProcessTranspiledJs(files, parentFile) {
  return fromEntries(
    Object.entries(files).map(([name, file]) => {
      const mangledCode = file.code
        .replace(/(\n\s*|)\/\/ (@ts-ignore|@ts-expect-error).*$/gm, '')
        .trim()
      const prettyCode = prettify(mangledCode, name, parentFile || name)

      return [
        name,
        {
          ...file,
          code: prettyCode
        }
      ]
    })
  )
}

/** @type {import('prettier').Options | null} */
let lastConfig
/** @type {string} */
let lastParentFile

/**
 *
 * @param {string} sourceCode
 * @param {string} fileName
 * @param {string} parentFile
 */
function prettify(sourceCode, fileName, parentFile) {
  if (lastParentFile !== parentFile) {
    lastConfig = prettier.resolveConfig.sync(parentFile)
  }
  if (!lastConfig) {
    console.error(
      `no prettier config found for ${parentFile}, skipping prettier step`
    )
    return sourceCode
  }
  return prettier.format(sourceCode, {
    ...lastConfig,
    filepath: fileName
  })
}

/**
 * @param {Array<[string, any]>} entries
 * @returns {Record<string, any>}
 */
function fromEntries(entries) {
  /** @type {Record<string, any>} */
  const ret = {}
  for (const [key, value] of entries) {
    ret[key] = value
  }
  return ret
}

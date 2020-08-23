const visit = require('unist-util-visit')
// @ts-ignore
const flatMap = require('unist-util-flatmap')
const compile = require('./compiler')

module.exports = attacher

/** @typedef {Record<string,{ code: string, skip?: boolean }>} VirtualFiles */

function attacher() {
  return transformer

  /**
   *
   * @param {*} tree
   * @param {import('vfile').VFile} file
   */
  function transformer(tree, file) {
    if (file.extname !== '.mdx') {
      return tree
    }

    let hasTabsImport = false
    let hasTabItemImport = false

    visit(
      tree,
      'import',
      /**
       * @param {import('unist').Node & {value: string}} node
       */
      node => {
        if (/\bTabs\b/.test(node.value)) hasTabsImport = true
        if (/\bTabItem\b/.test(node.value)) hasTabItemImport = true
      }
    )

    visit(
      tree,
      'root',
      /**
       * @param {import('unist').Parent} node
       */
      (node, index) => {
        if (!hasTabsImport) {
          node.children.unshift({
            type: 'import',
            value: `import Tabs from '@theme/Tabs'`
          })
        }
        if (!hasTabItemImport) {
          node.children.unshift({
            type: 'import',
            value: `import TabItem from '@theme/TabItem'`
          })
        }
      }
    )

    let codeBlock = 0

    return flatMap(
      tree,
      /**
       * @param {import('unist').Node & { lang: string, meta: string, value: string, indent: number[]}} node
       * @return {import('unist').Node[]}
       */
      function mapper(node) {
        if (node.type === 'code') {
          codeBlock++
        }
        if (node.type === 'code' && node.lang === 'ts') {
          const tags = node.meta ? node.meta.split(' ') : []
          if (tags.includes('no-transpile')) {
            return [node]
          }

          const virtualFolder = `${file.path}/codeBlock_${codeBlock}`
          const virtualFiles = splitFiles(node.value, virtualFolder)

          //console.time(virtualFolder)
          const transpilationResult = compile(virtualFiles)
          //console.timeEnd(virtualFolder)

          for (const [fileName, result] of Object.entries(
            transpilationResult
          )) {
            for (const diagnostic of result.diagnostics) {
              if (diagnostic.line && node.position) {
                file.fail(
                  `
TypeScript error in code block in line ${diagnostic.line} of ${fileName}
${diagnostic.message}
            `,
                  {
                    line: diagnostic.line + node.position.start.line,
                    column: diagnostic.character
                  }
                )
              } else {
                file.fail(diagnostic.message, node)
              }
            }
          }

          return [
            {
              type: 'jsx',
              value: `
    <Tabs
      groupId="language"
      defaultValue="ts"
      values={[
        { label: 'TypeScript', value: 'ts', },
        { label: 'JavaScript', value: 'js', },
      ]}
    >        
        <TabItem value="ts">`
            },
            { ...node, value: rearrangeFiles(virtualFiles, virtualFolder) },
            {
              type: 'jsx',
              value: `
        </TabItem>
        <TabItem value="js">`
            },
            {
              ...node,
              lang: 'js',
              value: rearrangeFiles(transpilationResult, virtualFolder)
            },
            {
              type: 'jsx',
              value: `
        </TabItem>
    </Tabs>`
            }
          ]
        }

        return [node]
      }
    )
  }
}

/**
 * @param {string} fullCode
 * @param {string}  folder
 * @returns {VirtualFiles}
 */
function splitFiles(fullCode, folder) {
  const regex = /^\/\/ file: ([\w./]+)(?: (.*))?\s*$/gm
  let match = regex.exec(fullCode)

  /**
   * @type {VirtualFiles}
   */
  let files = {}

  do {
    const start = match ? match.index + match[0].length + 1 : 0
    const fileName = match ? match[1] : 'index.ts'
    const flags = (match ? match[2] || '' : '').split(' ')
    const skip = flags.includes('noEmit')
    match = regex.exec(fullCode)
    const end = match ? match.index : fullCode.length
    const code = fullCode.substring(start, end)
    files[`${folder}/${fileName}`] = { code, skip }
  } while (match)

  return files
}

/**
 * @param {VirtualFiles} files
 * @param {string} folder
 * @returns {string}
 */
function rearrangeFiles(files, folder) {
  const filteredFiles = Object.entries(files).filter(([, { skip }]) => !skip)

  if (filteredFiles.length === 1) {
    const [[, { code }]] = filteredFiles
    return code
  }

  return filteredFiles
    .map(
      ([fileName, { code }]) => `// file: ${fileName.replace(folder + '/', '')}
${code.trim()}`
    )
    .join('\n\n\n')
}

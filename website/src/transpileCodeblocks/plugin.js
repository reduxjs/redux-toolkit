const visit = require('unist-util-visit')
// @ts-ignore
const flatMap = require('unist-util-flatmap')
const compile = require('./compiler')

module.exports = attacher

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

    let currentBlockNumber = 0

    return flatMap(
      tree,
      /**
       * @param {import('unist').Node & { lang: string, meta: string, value: string, indent: number[]}} node
       * @return {import('unist').Node[]}
       */
      function mapper(node) {
        if (node.type === 'code' && node.lang === 'ts') {
          const tags = node.meta ? node.meta.split(' ') : []
          if (tags.includes('no-transpile')) {
            return [node]
          }

          const virtualFileName = `${file.path}_${currentBlockNumber++}.ts`

          //console.time(virtualFileName)
          const { transpiledCode, diagnostics } = compile(
            virtualFileName,
            node.value
          )
          //console.timeEnd(virtualFileName)

          for (const diagnostic of diagnostics) {
            if (diagnostic.line && node.position) {
              file.fail(
                `
TypeScript error in line (counting from after the front matter) ${diagnostic.line +
                  node.position.start.line}
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
            node,
            {
              type: 'jsx',
              value: `
        </TabItem>
        <TabItem value="js">`
            },
            { ...node, lang: 'js', value: transpiledCode },
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

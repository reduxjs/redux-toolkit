const visit = require('unist-util-visit')
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

    visit(tree, 'import', node => {
      if (/\bTabs\b/.test(node.value)) hasTabsImport = true
      if (/\bTabItem\b/.test(node.value)) hasTabItemImport = true
    })

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

    return flatMap(
      tree,
      /**
       * @param {import('unist').Node & { lang: string, meta: unknown, value: string, indent: number[]}} node
       * @return {import('unist').Node[]}
       */
      function mapper(node) {
        if (node.type === 'code' && node.lang === 'ts') {
          const tags = node.meta ? node.meta.split(' ') : []
          if (tags.includes('no-transpile')) {
            return [node]
          }
          const { transpiledCode, diagnostics } = compile(
            `${file.path}_${node.position.start.line}.ts`,
            node.value
          )

          for (const diagnostic of diagnostics) {
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

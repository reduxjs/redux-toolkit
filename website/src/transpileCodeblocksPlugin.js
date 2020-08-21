const visit = require('unist-util-visit')
const flatMap = require('unist-util-flatmap')
const fs = require('fs')
const path = require('path')

const typescript = require('typescript')
const { Server } = require('virtual-tsc')

module.exports = attacher

const fd = fs.openSync(__dirname + '/../log', 'w')

const basedir = path.resolve(__dirname, '../..')
const relativeBasedir = path.relative(process.env.PWD, basedir)

const config = typescript.readConfigFile(
  path.resolve(basedir, 'tsconfig.json'),
  typescript.sys.readFile
).config

// Create a new instance of the compiler with optional compiler options
const tsserver = new Server(
  {
    ...config,
    allowUnusedLabels: true,
    noErrorTruncation: true,
    target: 'es2018',
    module: 'es2015',
    jsx: 'preserve',
    noUnusedLocals: false,
    noUnusedParameters: false
  },
  x => fs.writeSync(fd, x + '\n')
)

// optionally provide ambient declarations
tsserver.provideAmbientDeclarations({
  'node_modules/@types/reduxjs__toolkit/index.d.ts': fs.readFileSync(
    path.resolve(basedir, 'dist/typings.d.ts'),
    { encoding: 'utf-8' }
  ),
  'node_modules/redux.d.ts': fs.readFileSync(
    path.resolve(basedir, 'node_modules/redux/index.d.ts'),
    { encoding: 'utf-8' }
  ),
  'node_modules/immer.d.ts': fs.readFileSync(
    path.resolve(basedir, 'node_modules/immer/dist/immer.d.ts'),
    { encoding: 'utf-8' }
  )
})

/*
let fd = 0
fs.open(__dirname + '/log', 'w', (err, _fd) => {
  fd = _fd
})
*/

function attacher() {
  return transformer

  /**
   *
   * @param {*} tree
   * @param {import('vfile').VFile} file
   */
  function transformer(tree, file) {
    if (file.extname === '.mdx') {
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
    }

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
          const transpiled = transpile(node.value, node)
          console.log(transpiled)

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
        <TabItem value="js">`
            },
            { ...node, lang: 'js', value: transpiled },
            {
              type: 'jsx',
              value: `
        </TabItem>
        <TabItem value="ts">`
            },
            node,
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

    function transpile(code, node) {
      const results = tsserver.compile('code.ts', code)

      if (results.diagnostics.length > 0) {
        file.fail(`encountered errors while parsing code block

--------------------------------------------------------------------------------

${code}

--------------------------------------------------------------------------------

${results.diagnostics
  .map(d => d.annotatedSource)
  .join('\n----------------------------------------\n')}`)
      }

      return results.result
    }
  }
}

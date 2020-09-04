const flatMap = require('unist-util-flatmap')
const { getComment, renderDocNode } = require('./extract')
const { URL } = require('url')
const { paragraph, text } = require('mdast-builder')
const { DocBlock } = require('@microsoft/tsdoc')

module.exports = attacher

/** @typedef {ReturnType<typeof getComment>} Comment */
/** @typedef {(c: Comment) => import('unist').Node[]} RenderFunction */

function attacher() {
  /**
   *
   * @param {string} markdown
   * @returns {import('unist').Node[]}
   */
  const parseNodes = markdown => {
    // @ts-ignore
    return this.parse(markdown).children
  }

  /**
   * @param {keyof Comment} key
   * @param {(before: string) => string} prepare
   */
  function renderAsMarkdown(key, prepare = x => x) {
    /**
     * @param {Comment} comment
     * @returns {import('unist').Parent[]}
     */
    function render(comment) {
      /** @type {import('@microsoft/tsdoc').DocBlock | import('@microsoft/tsdoc').DocBlock[]} */
      // @ts-ignore
      const docBlock = comment[key]
      const rendered = renderDocNode(docBlock)
      // @ts-ignore
      return parseNodes(prepare(rendered))
    }
    return render
  }

  /** @type {{[key: string]: RenderFunction}} */
  const sectionMapping = {
    summary: renderAsMarkdown('summarySection', s =>
      s.replace(/@summary/g, '')
    ),
    remarks: renderAsMarkdown('remarksBlock', s => s.replace(/@remarks/g, '')),
    overloadSummary: renderAsMarkdown('overloadSummary', s =>
      s.replace(/@overloadSummary/g, '')
    ),
    overloadRemarks: renderAsMarkdown('overloadRemarks', s =>
      s.replace(/@overloadRemarks/g, '')
    ),
    examples: renderAsMarkdown('examples', s => s.replace(/@example/g, '')),
    params: renderAsMarkdown(
      'params',
      s => '#### Parameters:\n' + s.replace(/@param (.*) -/g, '* **$1**')
    )
  }

  return transformer

  /**
   *
   * @param {*} tree
   * @param {import('vfile').VFile} file
   */
  function transformer(tree, file) {
    return flatMap(
      tree,
      /**
       * @param {import('unist').Parent} parent
       * @return {import('unist').Node[]}
       */
      function mapper(parent) {
        if (!(parent.type === 'paragraph' && parent.children.length === 1)) {
          return [parent]
        }

        /** @type {import('unist').Node & {url: string; children: [import('unist').Node & {value: string}]}} */
        // @ts-ignore
        const node = parent.children[0]

        if (node.type !== 'link' || !node.url.startsWith('docblock://')) {
          return [parent]
        }

        if (node.children.length !== 1 || node.children[0].type !== 'text') {
          throw new Error('invalid meta content for docblock link')
        }
        /** @type {string} */
        const meta = node.children[0].value
        const sections = meta.split(',').map(s => s.trim())

        const url = new URL(node.url)
        const fileName = url.host + url.pathname
        const args = url.searchParams

        const token = args.get('token')
        const overload = Number.parseInt(args.get('overload') || '0')

        const comment = getComment(token, fileName, overload)

        const retVal = sections.reduce(
          /** @param {import('unist').Node[]} acc */
          (acc, section) => {
            if (!(section in sectionMapping)) {
              throw new Error(
                `invalid comment section reference. valid references are ${Object.keys(
                  sectionMapping
                ).concat(',')}`
              )
            }
            acc.push(...sectionMapping[section](comment))
            return acc
          },
          []
        )

        //console.dir({ retVal }, { depth: 5 })
        return retVal
      }
    )
  }
}

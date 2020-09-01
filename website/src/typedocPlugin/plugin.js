const flatMap = require('unist-util-flatmap')
const { getComment, renderDocNode } = require('./extract')
const { URL } = require('url')
module.exports = attacher

/** @typedef {ReturnType<typeof getComment>} Comment */
/** @typedef {(c: Comment) => import('unist').Node[]} RenderFunction */

function attacher() {
  console.log(this)

  /**
   *
   * @param {string} markdown
   * @returns {import('unist').Node[]}
   */
  const parseNodes = (markdown) => {
    console.log(markdown)

    // @ts-ignore
    return this.parse(markdown).children
  }

  /** @type {{[key: string]: RenderFunction}} */
  const sectionMapping = {
    summary: renderAsText('summarySection'),
    remarks: renderAsText('remarksBlock'),
    overloadSummary: renderAsText('overloadSummary'),
    overloadRemarks: renderAsText('overloadRemarks'),
    examples(comment) {
      const plain = renderDocNode(comment.examples).replace(/^@example/, '')
      const examples = parseNodes(plain)
      console.dir({ examples, plain }, { depth: 6 })
      return parseNodes(renderDocNode(comment.examples))
    },
    params: renderAsText('params'),
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

        console.log({ replacing: parent })

        if (node.children.length !== 1 || node.children[0].type !== 'text') {
          throw new Error('invalid meta content for docblock link')
        }
        /** @type {string} */
        const meta = node.children[0].value
        const sections = meta.split(',').map((s) => s.trim())

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

        console.dir({ retVal }, { depth: 5 })
        return retVal
      }
    )
  }
}

const { paragraph, text } = require('mdast-builder')

/**
 * @param {keyof Comment} key
 */
function renderAsText(key) {
  /**
   * @param {Comment} comment
   * @returns {import('unist').Parent[]}
   */
  function render(comment) {
    // @ts-ignore
    const value = renderDocNode(comment[key])

    return [paragraph(text(value))]
  }

  return render
}

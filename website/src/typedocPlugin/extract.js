const ts = require('typescript')
const path = require('path')
const tsdoc = require('@microsoft/tsdoc')
const { isDeclarationKind, getJSDocCommentRanges } = require('./utils')

const basedir = path.resolve(__dirname, '../../..')

const configFileName = ts.findConfigFile(
  basedir,
  ts.sys.fileExists,
  'tsconfig.json'
)
if (!configFileName) {
  throw new Error('tsconfig not found!')
}

const configFile = ts.readConfigFile(configFileName, ts.sys.readFile)
const compilerOptions = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  './'
).options

const compilerHost = ts.createCompilerHost(compilerOptions)

const program = ts.createProgram(
  [path.resolve(basedir, 'src/index.ts')],
  compilerOptions,
  compilerHost
)

// console.log(getComment('createReducer', 'createReducer.ts'))

module.exports = {
  getComment,
  renderDocNode,
}

/**
 * @param {string} token
 * @param {ts.Node} node
 */
function findTokens(token, node) {
  const [lookFor, ...tail] = token.split('.')
  /** @type {ts.Node[]} */
  const found = []
  node.forEachChild(
    /** @param {ts.Node & { name?: ts.Node}} child */ (child) => {
      const name = child.name
      if (name && ts.isIdentifier(name) && name.escapedText === lookFor) {
        if (lookFor === token) {
          found.push(child)
        } else {
          found.push(...findTokens(tail.join('.'), child))
        }
      }
    }
  )
  return found
}

/**
 *
 * @param {string} token
 * @param {string} fileName
 * @param {number} overload
 */
function getComment(token, fileName = 'index.ts', overload = 0) {
  const inputFileName = path.resolve(basedir, 'src', fileName)
  const sourceFile = program.getSourceFile(inputFileName)
  if (!sourceFile) {
    throw new Error('Error retrieving source file')
  }

  const foundComments = []

  const buffer = sourceFile.getFullText()

  for (const node of findTokens(token, sourceFile)) {
    const comments = getJSDocCommentRanges(node, buffer)

    if (comments.length > 0) {
      for (const comment of comments) {
        foundComments.push({
          compilerNode: node,
          textRange: tsdoc.TextRange.fromStringRange(
            buffer,
            comment.pos,
            comment.end
          ),
        })
      }
    }
  }

  const customConfiguration = new tsdoc.TSDocConfiguration()

  customConfiguration.addTagDefinition(
    new tsdoc.TSDocTagDefinition({
      tagName: '@overloadSummary',
      syntaxKind: tsdoc.TSDocTagSyntaxKind.BlockTag,
    })
  )

  customConfiguration.addTagDefinition(
    new tsdoc.TSDocTagDefinition({
      tagName: '@overloadRemarks',
      syntaxKind: tsdoc.TSDocTagSyntaxKind.BlockTag,
    })
  )

  const tsdocParser = new tsdoc.TSDocParser(customConfiguration)

  const selectedOverload = foundComments[overload]

  const parserContext = tsdocParser.parseRange(selectedOverload.textRange)
  const docComment = parserContext.docComment
  return Object.assign(docComment, {
    parserContext,
    buffer: selectedOverload.textRange.buffer,
    overloadSummary: docComment.customBlocks.find(
      byTagName('@overloadSummary')
    ),
    overloadRemarks: docComment.customBlocks.find(
      byTagName('@overloadRemarks')
    ),
    examples: docComment.customBlocks.filter(byTagName('@example')),
  })
}

/**
 * @param {string} name
 * @returns {(block: tsdoc.DocBlock) => boolean}
 */
function byTagName(name) {
  return (block) => block.blockTag.tagName === name
}

/**
 * @param {tsdoc.DocNode | tsdoc.DocNode[]} docNode
 */
function renderDocNode(docNode) {
  if (Array.isArray(docNode)) {
    return docNode.map((node) => renderDocNode(node)).join('')
  }

  let result = ''
  if (docNode) {
    if (docNode instanceof tsdoc.DocFencedCode) {
      return '```' + docNode.language + '\n' + docNode.code.toString() + '\n```'
    }
    if (docNode instanceof tsdoc.DocExcerpt) {
      result += docNode.content.toString()
    }

    for (const childNode of docNode.getChildNodes()) {
      result += renderDocNode(childNode)
    }
  }
  return result
}

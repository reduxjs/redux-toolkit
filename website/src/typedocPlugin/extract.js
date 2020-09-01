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
  renderDocNodes,
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

  for (const node of sourceFile.statements) {
    if (!isDeclarationKind(node.kind)) {
      continue
    }
    // @ts-ignore
    if (!(ts.isIdentifier(node.name) && node.name.escapedText === token)) {
      continue
    }

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
    overloadSummary: docComment.customBlocks.find(
      byTagName('@overloadSummary')
    ),
    overloadRemarks: docComment.customBlocks.find(
      byTagName('@overloadRemarks')
    ),
    examples: docComment.customBlocks.filter(byTagName('@example')),
  })
  /*
  for (const foundComment of foundComments) {
    const parserContext = tsdocParser.parseRange(foundComment.textRange)
    const docComment = parserContext.docComment
    console.log(`------ summary ------`)
    console.log(renderDocNode(docComment.summarySection).trim())
    console.log(`------ remarks ------`)
    console.log(renderDocNode(docComment.remarksBlock).trim())
    console.log(`------ overloadSummary ------`)
    console.log(
      renderDocNodes(
        docComment.customBlocks.filter(byTagName('@overloadSummary'))
      ).trim()
    )
    console.log(`------ examples ------`)
    console.log(
      renderDocNodes(
        docComment.customBlocks.filter(byTagName('@example'))
      ).trim()
    )
    console.log(`------ params ------`)
    console.log(`------ params ------`)
    console.log(renderDocNode(docComment.params).trim())
    console.log(`------ end ------`)
  }*/
}

function byTagName(name) {
  return (block) => block.blockTag.tagName === name
}

/**
 * @param {tsdoc.DocNode | tsdoc.DocNode[]} docNode
 */
function renderDocNode(docNode) {
  if (Array.isArray(docNode)) {
    return renderDocNodes(docNode)
  }

  let result = ''
  if (docNode) {
    if (docNode instanceof tsdoc.DocExcerpt) {
      result += docNode.content.toString()
    }
    for (const childNode of docNode.getChildNodes()) {
      result += renderDocNode(childNode)
    }
  }
  return result
}

function renderDocNodes(docNodes) {
  let result = ''
  for (const docNode of docNodes) {
    result += renderDocNode(docNode)
  }
  return result
}

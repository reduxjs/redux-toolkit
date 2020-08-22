/**
 * @type {import("typescript")}
 */
const ts = require('typescript')
const path = require('path')

const configFileName = ts.findConfigFile(
  __dirname,
  ts.sys.fileExists,
  'tsconfig.json'
)

const configFile = ts.readConfigFile(configFileName, ts.sys.readFile)
const compilerOptions = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  './'
).options

const compilerHost = createCompilerHost()

function compile(fileName, code) {
  // console.log(compilerOptions)

  code = code.replace(/^$/gm, '//__NEWLINE__')

  compilerHost.writeFile(fileName, code)
  let program = ts.createProgram([fileName], compilerOptions, compilerHost)
  let transpiledCode = ''

  let emitResult = program.emit(undefined, (_, code) => {
    transpiledCode = code
  })

  let allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics)

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start
      )
      let message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n'
      )
      console.log(
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      )
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    }
  })

  return transpiledCode.replace(/\/\/__NEWLINE__/g, '')
}

function createCompilerHost() {
  const virtualFiles = {}

  const host = ts.createCompilerHost(compilerOptions)

  return Object.assign(host, {
    getSourceFile,
    writeFile,
    fileExists,
    readFile,
    resolveModuleNames
  })

  function fileExists(fileName) {
    // console.log('fileExists', fileName)
    return !!virtualFiles[fileName] || ts.sys.fileExists(fileName)
  }

  function readFile(fileName) {
    // console.log('readFile', fileName)
    return virtualFiles[fileName] || ts.sys.readFile(fileName)
  }

  function writeFile(fileName, contents) {
    virtualFiles[fileName] = contents
  }

  function getSourceFile(fileName, languageVersion) {
    const sourceText = readFile(fileName)
    // console.log(fileName, sourceText.split('\n')[0])
    return sourceText !== undefined
      ? ts.createSourceFile(fileName, sourceText, languageVersion)
      : undefined
  }

  function resolveModuleNames(moduleNames, containingFile) {
    return moduleNames.map(moduleName => {
      if (moduleName === '@reduxjs/toolkit') {
        moduleName = path.resolve(__dirname, '../../../dist/typings')

        return {
          ...ts.resolveModuleName(
            moduleName,
            containingFile,
            compilerOptions,
            host
          ).resolvedModule,
          isExternalLibraryImport: true,
          packageId: {
            name: '@reduxjs/toolkit',
            subModuleName: 'dist/typings.d.ts',
            version: '99.0.0'
          }
        }
      }

      return ts.resolveModuleName(
        moduleName,
        containingFile,
        compilerOptions,
        host
      ).resolvedModule
    })
  }
}

module.exports = compile

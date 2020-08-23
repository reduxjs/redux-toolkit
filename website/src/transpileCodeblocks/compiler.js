const ts = require('typescript')
const path = require('path')

const configFileName = ts.findConfigFile(
  __dirname,
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

const compilerHost = createCompilerHost()
const service = ts.createLanguageService(
  compilerHost,
  ts.createDocumentRegistry()
)

/**
 * @param {string} fileName
 * @param {string} code
 */
function compile(fileName, code) {
  // console.log(compilerOptions)

  code = code.replace(/^$/gm, '//__NEWLINE__')

  compilerHost.writeFile(fileName, code)

  let emitResult = service.getEmitOutput(fileName)
  let transpiledCode = emitResult.outputFiles[0].text
    .replace(/\/\/__NEWLINE__/g, '')
    .trim()

  let allDiagnostics = service
    .getCompilerOptionsDiagnostics()
    .concat(service.getSyntacticDiagnostics(fileName))
    .concat(service.getSemanticDiagnostics(fileName))

  const diagnostics = allDiagnostics.map(diagnostic => {
    let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    if (diagnostic.file && diagnostic.start) {
      let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start
      )
      return { line, character, message }
    }
    return { message }
  })

  return { transpiledCode, diagnostics }
}

/**
 * @returns {ts.LanguageServiceHost & ts.ModuleResolutionHost & Required<Pick<ts.LanguageServiceHost, 'writeFile'>>}
 */
function createCompilerHost() {
  /** @type {Record<string, { contents: string; version: number }>} */
  const virtualFiles = {}
  let lastWrittenTo = ''

  return {
    ...ts.createCompilerHost(compilerOptions),
    getCompilationSettings() {
      return compilerOptions
    },
    fileExists(fileName) {
      // console.log('fileExists', fileName)
      return !!virtualFiles[fileName] || ts.sys.fileExists(fileName)
    },
    /**
     * @param {string} fileName
     */
    readFile(fileName) {
      // console.log('readFile', fileName)
      return virtualFiles[fileName]
        ? virtualFiles[fileName].contents
        : ts.sys.readFile(fileName)
    },
    writeFile(fileName, contents) {
      let version = virtualFiles[fileName] ? virtualFiles[fileName].version : 1
      if (
        virtualFiles[fileName] &&
        virtualFiles[fileName].contents === contents
      ) {
        version++
      }
      virtualFiles[fileName] = { contents, version }
      if (fileName.endsWith('.ts') && !fileName.endsWith('.d.ts')) {
        lastWrittenTo = fileName
      }
    },
    getScriptFileNames() {
      return lastWrittenTo ? [lastWrittenTo] : []
    },
    getScriptSnapshot(fileName) {
      const contents = this.readFile(fileName)
      return contents ? ts.ScriptSnapshot.fromString(contents) : undefined
    },
    getScriptVersion(fileName) {
      return virtualFiles[fileName]
        ? virtualFiles[fileName].version.toString()
        : '0'
    },
    resolveModuleNames(moduleNames, containingFile) {
      return moduleNames.map(moduleName => {
        if (moduleName === '@reduxjs/toolkit') {
          moduleName = path.resolve(__dirname, '../../../dist/typings')

          const resolvedModule = ts.resolveModuleName(
            moduleName,
            containingFile,
            compilerOptions,
            this
          ).resolvedModule
          if (!resolvedModule) {
            throw new Error('RTK typings not found, please compile RTK first!')
          }
          return {
            ...resolvedModule,
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
          this
        ).resolvedModule
      })
    }
  }
}

module.exports = compile

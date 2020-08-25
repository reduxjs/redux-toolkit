const ts = require('typescript')
const path = require('path')

/** @typedef {Record<string,{ code: string, skip?: boolean }>} VirtualFiles */
/** @typedef {{ line: number; character: number; message: string; } | { line?: undefined; character?: undefined; message: string; }} Diagnostic */

/** @typedef {Record<string, VirtualFiles[string] & {
 *    diagnostics: Array<Diagnostic>
 * }>} TranspiledFiles */

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
 * @param {VirtualFiles} files
 */
function compile(files) {
  // console.log(compilerOptions)

  compilerHost.setScriptFileNames([])
  for (let [fileName, { code }] of Object.entries(files)) {
    code = code.replace(/^$/gm, '//__NEWLINE__')
    compilerHost.writeFile(fileName, code)
  }
  compilerHost.setScriptFileNames(Object.keys(files))

  /** @type {TranspiledFiles} */
  let returnFiles = {}

  for (const [fileName, code] of Object.entries(files)) {
    let emitResult = service.getEmitOutput(fileName)
    let transpiledCode = emitResult.outputFiles[0]
      ? emitResult.outputFiles[0].text.replace(/\/\/__NEWLINE__/g, '').replace(/(\n\s*|)\/\/ (@ts-ignore|@ts-expect-error).*$/gm, '').trim()
      : ''

    let allDiagnostics = service
      .getCompilerOptionsDiagnostics()
      .concat(service.getSyntacticDiagnostics(fileName))
      .concat(service.getSemanticDiagnostics(fileName))

    const diagnostics = allDiagnostics.map(diagnostic => {
      let message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n'
      )
      if (diagnostic.file && diagnostic.start) {
        let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
          diagnostic.start
        )
        return { line, character, message }
      }
      return { message }
    })
    returnFiles[fileName] = {
      ...files[fileName],
      code: transpiledCode,
      diagnostics
    }
  }

  return returnFiles
}

/**
 * @returns {ts.LanguageServiceHost
 *          & ts.ModuleResolutionHost
 *          & Required<Pick<ts.LanguageServiceHost, 'writeFile'>
 *          & { setScriptFileNames(files: string[]): void }
 * >}
 */
function createCompilerHost() {
  /** @type {Record<string, { contents: string; version: number }>} */
  const virtualFiles = {}
  /** @type {string[]} */
  let scriptFileNames = []

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
        virtualFiles[fileName].contents !== contents
      ) {
        version++
      }
      virtualFiles[fileName] = { contents, version }
    },
    directoryExists(dirName) {
      return (
        scriptFileNames.some(fileName => fileName.startsWith(dirName + '/')) ||
        ts.sys.directoryExists(dirName)
      )
    },
    setScriptFileNames(files) {
      // console.log({ virtualFiles, files })
      scriptFileNames = files
    },
    getScriptFileNames() {
      return scriptFileNames
    },
    getScriptSnapshot(fileName) {
      const contents = this.readFile(fileName)
      return contents ? ts.ScriptSnapshot.fromString(contents) : undefined
    },
    getScriptVersion(fileName) {
      return virtualFiles[fileName]
        ? virtualFiles[fileName].version.toString()
        : String(
            (ts.sys.getModifiedTime && ts.sys.getModifiedTime(fileName)) ||
              'unknown, will not update without restart'
          )
    },
    resolveModuleNames(moduleNames, containingFile) {
      return moduleNames.map(moduleName => {
        if (moduleName === '@reduxjs/toolkit') {
          moduleName = path.resolve(__dirname, '../../../src')

          const resolvedModule = ts.resolveModuleName(
            moduleName,
            containingFile,
            compilerOptions,
            this
          ).resolvedModule
          if (!resolvedModule) {
            throw new Error('RTK source code not found!')
          }
          return {
            ...resolvedModule,
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

import type { Check, SizeLimitConfig } from 'size-limit'
import type { Configuration } from 'webpack'
import packageJson from './package.json' with { type: 'json' }

/**
 * An array of all possible Node environments.
 */
const allNodeEnvs = ['production'] as const

const allPackageEntryPoints = [
  './dist/redux-toolkit.modern.mjs',
  './dist/react/redux-toolkit-react.modern.mjs',
  './dist/query/rtk-query.modern.mjs',
  './dist/query/react/rtk-query-react.modern.mjs',
] as const satisfies string[]

const peerAndProductionDependencies = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.peerDependencies,
} as const)

const sizeLimitConfig: SizeLimitConfig = (
  await Promise.all(
    allNodeEnvs.flatMap((nodeEnv) => {
      const modifyWebpackConfig = ((config: Configuration): Configuration =>
        ({
          ...config,
          optimization: {
            ...config.optimization,
            nodeEnv,
          },
        }) as const satisfies Configuration) satisfies Check['modifyWebpackConfig']

      return allPackageEntryPoints.map(async (entryPoint, index) => {
        const allNamedImports = Object.keys(await import(entryPoint)).filter(
          (namedImport) => namedImport !== 'default',
        )

        const sizeLimitConfigWithDependencies = [
          ...allNamedImports.map(
            (namedImport, namedImportIndex) =>
              ({
                path: entryPoint,
                name: `${(index + 1).toString()}-${(namedImportIndex + 1).toString()}. import { ${namedImport} } from "${entryPoint}" ('${nodeEnv}' mode)`,
                import: `{ ${namedImport} }`,
                modifyWebpackConfig,
              }) as const satisfies Check,
          ),
          {
            path: entryPoint,
            name: `${(index + 1).toString()}-${(allNamedImports.length + 1).toString()}. import * from "${entryPoint}" ('${nodeEnv}' mode)`,
            import: '*',
            modifyWebpackConfig,
          },
          {
            path: entryPoint,
            name: `${(index + 1).toString()}-${(allNamedImports.length + 2).toString()}. import "${entryPoint}" ('${nodeEnv}' mode)`,
            modifyWebpackConfig,
          },
        ] as const satisfies SizeLimitConfig

        const sizeLimitConfigWithoutDependencies =
          sizeLimitConfigWithDependencies.map(
            (check) =>
              ({
                ...check,
                name: `${check.name} (excluding dependencies)`,
                ignore: peerAndProductionDependencies,
              }) as const satisfies Check,
          )

        return [
          // ...sizeLimitConfigWithDependencies,
          ...sizeLimitConfigWithoutDependencies,
        ]
      })
    }),
  )
).flat()

export default sizeLimitConfig

import babel from '@rollup/plugin-babel';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';

/** @type {import("rollup").RollupOptions} */
const defaultConfig = {
  input: 'src/index.ts',
  external: [/@babel\/runtime/, /@reduxjs\/toolkit/, /react$/, /react-redux/, /immer/, /tslib/],
  treeshake: {
    propertyReadSideEffects: false,
  },
};

const defaultTerserOptions = {
  output: { comments: false },
  compress: {
    keep_infinity: true,
    pure_getters: true,
    passes: 10,
  },
  ecma: 5,
  warnings: true,
};

const defaultTsConfig = { declaration: false, declarationMap: false, target: 'ESNext', module: 'esnext' };

/** @type {import("rollup").RollupOptions} */
const configs = [
  // ESM
  {
    ...defaultConfig,
    output: [
      {
        dir: 'dist/esm',
        format: 'es',
        sourcemap: true,
        preserveModules: true,
      },
    ],
    plugins: [
      typescript(defaultTsConfig),
      babel({
        exclude: 'node_modules/**',
        extensions: ['.js', '.ts'],
        babelHelpers: 'runtime',
        presets: [
          [
            '@babel/preset-env',
            {
              targets: { node: true, browsers: ['defaults', 'not IE 11', 'maintained node versions'] },
              bugfixes: true,
              loose: true,
            },
          ],
        ],
        plugins: [['@babel/plugin-transform-runtime', { useESModules: true }]],
      }),
    ],
  },
  // CJS:
  ...withMinify((minified) => ({
    ...defaultConfig,
    output: [
      {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: minified ? '[name].cjs.production.min.js' : '[name].cjs.development.js',
      },
    ],
    plugins: [
      typescript(
        minified
          ? defaultTsConfig
          : { ...defaultTsConfig, declarationDir: 'dist/ts', declaration: true, declarationMap: true }
      ),
      replace({
        values: {
          'process.env.NODE_ENV': JSON.stringify(minified ? 'production' : 'development'),
        },
      }),
      babel({
        exclude: 'node_modules/**',
        extensions: ['.js', '.ts'],
        babelHelpers: 'runtime',
        presets: [['@babel/preset-env', { targets: { node: true, browsers: ['defaults'] } }]],
        plugins: [['@babel/plugin-transform-runtime', { useESModules: false }]],
      }),
      ...(minified ? [terser({ ...defaultTerserOptions, toplevel: true })] : []),
    ],
  })),
];

function withMinify(build) {
  return [build(false), build(true)];
}

export default configs;

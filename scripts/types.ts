export interface BuildOptions {
  format: 'cjs' | 'umd' | 'esm'
  name:
    | '.cjs.development'
    | '.cjs.production.min'
    | '.esm'
    | '.modern'
    | '.modern.development'
    | '.modern.production.min'
    | '.umd'
    | '.umd.min'
  minify: boolean
  env: 'development' | 'production' | ''
  target?: 'es2017'
}

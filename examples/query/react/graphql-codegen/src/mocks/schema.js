require('ts-node').register({ compilerOptions: { module: 'commonjs' } })
module.exports = require('./db').schema

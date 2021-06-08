// configuration file for the Apollo Graphql VSCode extension
// https://marketplace.visualstudio.com/items?itemName=apollographql.vscode-apollo
// https://www.apollographql.com/docs/devtools/editor-plugins/
module.exports = {
  client: {
    service: {
      name: 'locally mocked graphql server',
      localSchemaFile: __dirname + '/.introspection.json',
    },
    includes: ['./src/**/*.graphql'],
    excludes: ['./src/**/*.ts', './src/**/*.js'],
  },
}

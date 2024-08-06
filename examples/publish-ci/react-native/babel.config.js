/** @import { ConfigFunction } from "@babel/core" */

/**
 * @satisfies {ConfigFunction}
 */
const config = api => {
  api.cache.using(() => process.env.NODE_ENV)

  return {
    presets: [["module:@react-native/babel-preset"]],
  }
}

module.exports = config

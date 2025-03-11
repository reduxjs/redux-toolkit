/** @import { ConfigFunction } from "@babel/core" */
/** @import { BabelPresetExpoOptions } from "babel-preset-expo" */

/**
 * @satisfies {ConfigFunction}
 */
const config = api => {
  api.cache.forever()

  return {
    presets: [
      /**
       * @satisfies {['babel-preset-expo', BabelPresetExpoOptions?]}
       */
      (['babel-preset-expo']),
    ],
  }
}

module.exports = config

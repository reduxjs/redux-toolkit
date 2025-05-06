const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')

/**
 * Metro configuration
 * @see {@link https://reactnative.dev/docs/metro | React Native docs}
 * @see {@link https://facebook.github.io/metro/docs/configuration | Metro docs}
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = mergeConfig(getDefaultConfig(__dirname))

module.exports = config

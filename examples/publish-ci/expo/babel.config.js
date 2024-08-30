/** @type {import('@babel/core').ConfigFunction} */
module.exports = api => {
  api.cache.forever();
  return {
    presets: ['babel-preset-expo'],
  };
};

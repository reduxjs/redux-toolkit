import React = require('react')
import lazyModule = require('./Lazy.js')

namespace bundleSplitting {
  import lazy = React.lazy

  export const PostsList = lazy(() => import('./PostsList.js'))

  export const Post = lazy(() => import('./Post.js'))

  export import Lazy = lazyModule.Lazy
}

export = bundleSplitting

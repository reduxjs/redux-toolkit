import React = require('react')
import bundleSplittingModule = require('./index.js')

namespace lazyModule {
  import Suspense = React.Suspense
  import PostsList = bundleSplittingModule.PostsList

  export const Lazy = () => {
    return (
      <Suspense fallback={<>loading...</>}>
        <PostsList />
      </Suspense>
    )
  }
}

export = lazyModule

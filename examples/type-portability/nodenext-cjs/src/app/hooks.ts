import ReactRedux = require('react-redux')

import type {
  AppDispatch,
  AppStore,
  RootState,
} from './store.js' with { 'resolution-mode': 'require' }

namespace hooksModule {
  import useDispatch = ReactRedux.useDispatch
  import useSelector = ReactRedux.useSelector
  import useStore = ReactRedux.useStore

  export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
  export const useAppSelector = useSelector.withTypes<RootState>()
  export const useAppStore = useStore.withTypes<AppStore>()
}

export = hooksModule

import ReduxToolkit = require('@reduxjs/toolkit')

import type { PayloadAction } from '@reduxjs/toolkit'

namespace treeSliceModule {
  import createSlice = ReduxToolkit.createSlice

  // A recursive state type cannot be expanded inline in emitted declarations,
  // so every draft type used by the case reducers must be exported by name.
  export interface TreeNode {
    id: string
    children?: TreeNode[]
  }

  export interface TreeState {
    root?: TreeNode
    selectedIds: string[]
  }

  const initialState: TreeState = { selectedIds: [] }

  export const treeSlice = createSlice({
    name: 'tree',
    initialState,
    reducers: {
      rootSet(state, action: PayloadAction<TreeNode>) {
        state.root = action.payload
      },
      selected(state, action: PayloadAction<string>) {
        state.selectedIds.push(action.payload)
      },
    },
  })

  export const createTreeSlice = () =>
    createSlice({
      name: 'tree',
      initialState,
      reducers: {
        rootSet(state, action: PayloadAction<TreeNode>) {
          state.root = action.payload
        },
      },
    })

  export const { caseReducers } = treeSlice

  export const { rootSet, selected } = treeSlice.actions
}

export = treeSliceModule

import { createEntityAdapter } from '@reduxjs/toolkit';
import type { Item, ItemMeta } from './types.js';

export const adapter = createEntityAdapter<Item, Item['id']>({
    selectId: (item) => item.id,
});

export const adapterInitialState = adapter.getInitialState<ItemMeta>({
    focusedId: null,
});

export const { selectById, selectIds, selectEntities, selectAll, selectTotal } = adapter.getSelectors();
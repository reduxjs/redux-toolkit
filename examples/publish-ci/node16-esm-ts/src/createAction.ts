import { nanoid, createAction } from "@reduxjs/toolkit";
import type { Item } from "./types.js";

export const actionItemSetFocus = createAction<Item['id']>('item/setFocus');
export const actionItemAddOne = createAction<Item>('item/addOne');
export const actionItemAddMany = createAction<Item[]>('item/addMany');
export const actionItemsGenerate = createAction(
    'item/generate',
    (amount: number) => {
        const items: Item[] = [];
        for (let i = 0; i < amount; i++) {
            items.push({
                id: nanoid(),
                name: `item-${i}`,
            });
        }
        return {
            payload: items,
        };
    }
);
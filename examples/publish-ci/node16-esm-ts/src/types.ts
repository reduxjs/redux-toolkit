/**
 * Example entity item.
 */
export interface Item {
    /**
     * Unique identifier.
     */
    id: string;

    /**
     * Item name.
     */
    name: string;
}

/**
 * Example entity item metadata.
 */
export interface ItemMeta {
    /**
     * Focused item ID.
     */
    focusedId: string | null;
};
import { useEffect, useRef, useState } from 'react';

/**
 * Debounced server-side search.
 *
 * Every list page used to repeat the same "first render skip + timeout + compare
 * with the server filter" effect. The first render is skipped so arriving at a
 * page never fires a redundant request; subsequent keystrokes are coalesced.
 */
export function useServerSearch(
    initial: string,
    onSearch: (value: string) => void,
    delay = 350,
): [string, (value: string) => void] {
    const [search, setSearch] = useState(initial);
    const firstRender = useRef(true);
    const callback = useRef(onSearch);

    // Keep the latest callback without re-running the debounce effect.
    useEffect(() => {
        callback.current = onSearch;
    }, [onSearch]);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;

            return;
        }

        const id = setTimeout(() => callback.current(search), delay);

        return () => clearTimeout(id);
    }, [search, delay]);

    return [search, setSearch];
}

/**
 * Row selection for bulk actions. Selection is cleared whenever the visible
 * page or filters change, so it can never leak across pages.
 */
export function useRowSelection(
    rows: ReadonlyArray<{ id: number }>,
    resetKeys: ReadonlyArray<unknown>,
) {
    const [selected, setSelected] = useState<number[]>([]);

    useEffect(() => {
        setSelected([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, resetKeys);

    const toggle = (id: number) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const allSelected = rows.length > 0 && rows.every((row) => selected.includes(row.id));
    const toggleAll = () => setSelected(allSelected ? [] : rows.map((row) => row.id));
    const clear = () => setSelected([]);

    return { selected, toggle, toggleAll, allSelected, clear };
}

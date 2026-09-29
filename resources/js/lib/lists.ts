import { usePage } from '@inertiajs/react';

import type { PageProps } from '@/types';

export type ListOption = { value: string; label: string };

/** Group name -> options, as shared by the server (see App\Support\Lists). */
export type Lists = Record<string, ListOption[]>;

/**
 * Admin-editable lists, shared from the server so form options always match
 * backend validation. Falls back to an empty array for an unknown group.
 */
export function useLists(): Lists {
    const { props } = usePage<PageProps>();

    return props.lists ?? {};
}

/**
 * Admin-editable class label. Replaces the `classLabel()` copy that was
 * duplicated in ~13 pages, so renaming a class shows up everywhere at once.
 */
export function useClassLabel(): (value?: string | null) => string {
    const lists = useLists();

    return (value) => listLabel(lists, 'class', value);
}

/** Options for one group. */
export function useList(group: string): ListOption[] {
    return useLists()[group] ?? [];
}

/**
 * Read a group from a plain props object (for components that already have
 * props in hand and shouldn't call a hook).
 */
export function listFrom(lists: Lists | undefined, group: string): ListOption[] {
    return lists?.[group] ?? [];
}

/** The label for a stored value, falling back to the raw value. */
export function listLabel(lists: Lists | undefined, group: string, value?: string | null): string {
    if (!value) {
        return '—';
    }

    return listFrom(lists, group).find((o) => o.value === value)?.label ?? value;
}

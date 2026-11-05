import { createContext, useContext } from 'react';

/**
 * The label a FormField wraps around its control. Primitives consume this to
 * set an `aria-label` automatically, so every field has an accessible name
 * even when the visible label is not a native <label for> (Radix selects).
 */
export const FieldLabelContext = createContext<string | undefined>(undefined);

export function useFieldLabel(explicit?: string): string | undefined {
    const label = useContext(FieldLabelContext);

    return explicit || label;
}

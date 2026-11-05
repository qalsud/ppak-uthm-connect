import type { ComponentProps, ReactNode } from 'react';

import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';

type Props = Omit<ComponentProps<typeof Button>, 'size' | 'variant'> & {
    /** Accessible name (also used as the hover title). Icon-only buttons need this. */
    label: string;
    destructive?: boolean;
    children: ReactNode;
};

/**
 * A ghost icon button with a mandatory accessible label. Centralises the
 * `size="sm" variant="ghost" title=...` pattern repeated in every table row.
 */
export default function IconButton({ label, destructive, className, children, ...props }: Props) {
    return (
        <Button
            size="sm"
            variant="ghost"
            aria-label={label}
            title={label}
            className={cn(destructive && 'text-destructive', className)}
            {...props}
        >
            {children}
        </Button>
    );
}

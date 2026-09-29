import type { ReactNode } from 'react';

import { Label } from '@/Components/ui/label';
import { cn } from '@/lib/utils';

/**
 * A labelled form control with an inline error message.
 *
 * Replaces the repeated `space-y-1` + Label + control + error <p> pattern,
 * which was duplicated ~20 times per dialog.
 */
export function FormField({
    label,
    htmlFor,
    error,
    hint,
    className,
    children,
}: {
    label?: string;
    htmlFor?: string;
    /** Server-side validation message for this field. */
    error?: string;
    /** Helper text shown under the control. */
    hint?: string;
    /** Span both columns inside a FormGrid. */
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={cn('space-y-1', className)}>
            {label && <Label htmlFor={htmlFor}>{label}</Label>}
            {children}
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

/** Two-column grid that collapses to one column on small screens. */
export function FormGrid({ className, children }: { className?: string; children: ReactNode }) {
    return <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>;
}

/** A titled group of fields, e.g. "Identity" or "Medical". */
export function FormSection({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="space-y-3">
            <div>
                <h3 className="text-sm font-semibold">{title}</h3>
                {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
            </div>
            <FormGrid>{children}</FormGrid>
        </section>
    );
}

/**
 * A checkbox with a label and optional description, used for the boolean
 * flags on the child record (special needs, medical consent).
 */
export function FormCheckbox({
    label,
    description,
    checked,
    onChange,
    className,
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
}) {
    return (
        <label className={cn('flex items-start gap-2.5 rounded-xl border p-3', className)}>
            <input
                type="checkbox"
                className="mt-0.5 size-4"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span>
                <span className="block text-sm font-medium">{label}</span>
                {description && (
                    <span className="block text-[11px] text-muted-foreground">{description}</span>
                )}
            </span>
        </label>
    );
}

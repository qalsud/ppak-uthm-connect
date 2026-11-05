import type { ReactNode } from 'react';

/**
 * The responsive card a desktop table row collapses into on small screens.
 * Keeps the title / subtitle / meta / actions structure identical across the
 * admin list pages.
 */
export default function MobileRecordCard({
    title,
    subtitle,
    meta,
    actions,
    select,
}: {
    title: ReactNode;
    subtitle?: ReactNode;
    meta?: ReactNode;
    actions?: ReactNode;
    select?: {
        checked: boolean;
        onChange: () => void;
        /** Accessible name, e.g. "Select Aisyah". */
        label: string;
    };
}) {
    return (
        <div className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        {select && (
                            <input
                                type="checkbox"
                                className="size-4 shrink-0 accent-primary"
                                checked={select.checked}
                                onChange={select.onChange}
                                aria-label={select.label}
                            />
                        )}
                        <span className="truncate font-medium">{title}</span>
                    </div>
                    {subtitle && (
                        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                    )}
                    {meta}
                </div>
                {actions && <div className="flex shrink-0">{actions}</div>}
            </div>
        </div>
    );
}

import { cn } from '@/lib/utils';

export type FilterTab = {
    value: string;
    label: string;
    /** Optional count shown as a small pill. */
    count?: number;
};

/**
 * The pill-style status tabs used above list cards (students, registrations).
 * Buttons carry `aria-pressed`, so the current filter is announced correctly.
 */
export default function FilterTabs({
    tabs,
    value,
    onChange,
    className,
}: {
    tabs: FilterTab[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
}) {
    return (
        <div className={cn('mb-4 flex flex-wrap gap-2', className)}>
            {tabs.map((tab) => {
                const active = value === tab.value;

                return (
                    <button
                        key={tab.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(tab.value)}
                        className={cn(
                            'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors',
                            active
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'bg-card text-muted-foreground hover:bg-muted',
                        )}
                    >
                        {tab.label}
                        {tab.count !== undefined && (
                            <span
                                className={cn(
                                    'rounded-full px-1.5 text-xs',
                                    active ? 'bg-black/20' : 'bg-muted text-muted-foreground',
                                )}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

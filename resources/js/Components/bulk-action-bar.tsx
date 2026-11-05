import type { ReactNode } from 'react';

import { Button } from '@/Components/ui/button';
import { useI18n } from '@/lib/i18n';

/**
 * The "N selected + actions + clear" bar shown above a list once rows are
 * ticked. Shared by the students and teachers lists.
 */
export default function BulkActionBar({
    count,
    onClear,
    children,
}: {
    count: number;
    onClear: () => void;
    children: ReactNode;
}) {
    const { t } = useI18n();

    return (
        <div
            role="region"
            aria-label={t('selected')}
            className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2"
        >
            <span className="text-xs font-medium">
                {count} {t('selected')}
            </span>
            {children}
            <Button size="sm" variant="ghost" onClick={onClear}>
                {t('clear_selection')}
            </Button>
        </div>
    );
}

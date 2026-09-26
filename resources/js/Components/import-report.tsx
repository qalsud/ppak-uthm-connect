import { usePage } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useState } from 'react';

import { useI18n } from '@/lib/i18n';
import type { PageProps } from '@/types';

/** Shows the outcome of a CSV import, including per-row reasons for skips. */
export default function ImportReport() {
    const { t } = useI18n();
    const { props } = usePage<PageProps>();
    const [hidden, setHidden] = useState(false);

    const report = props.flash?.import_report;

    if (!report || hidden) {
        return null;
    }

    const { imported, skipped } = report;

    return (
        <div className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <p className="text-sm font-semibold">
                        {t('import_report')} · {t('import_imported')}: {imported}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setHidden(true)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                    aria-label={t('dismiss')}
                >
                    <X className="size-4" />
                </button>
            </div>

            {skipped.length > 0 && (
                <div className="mt-3 border-t pt-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                        <AlertTriangle className="size-3.5" />
                        {t('import_skipped')}: {skipped.length}
                    </p>
                    <ul className="space-y-1">
                        {skipped.map((row, i) => (
                            <li
                                key={i}
                                className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-1.5 text-xs"
                            >
                                <span className="text-muted-foreground">
                                    {t('line')} {row.line}
                                </span>
                                <span className="font-medium">{t(`reason_${row.reason}`)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

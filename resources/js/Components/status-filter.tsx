import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** The account states every user-management list offers. */
export const ACCOUNT_STATUSES = ['pending', 'active', 'awaiting', 'rejected'] as const;

/**
 * Status dropdown with per-status counts. Shared by Parents, Teachers and
 * Administrators, which previously carried identical copies.
 */
export default function StatusFilter({
    value,
    counts,
    onChange,
    className,
}: {
    value: string;
    counts: Record<string, number>;
    onChange: (value: string) => void;
    className?: string;
}) {
    const { t } = useI18n();

    return (
        <Select value={value || 'all'} onValueChange={onChange}>
            <SelectTrigger
                aria-label={t('status')}
                className={cn(
                    'h-8 border-0 px-0 text-muted-foreground shadow-none focus:ring-0',
                    className,
                )}
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">
                    {t('all')} ({counts.all ?? 0})
                </SelectItem>
                {ACCOUNT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                        {t(status)} ({counts[status] ?? 0})
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

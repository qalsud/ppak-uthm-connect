import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type CentreOption = { id: number; name: string; short_name: string | null };

/**
 * Reusable centre dropdown for list filters. Emits an empty string for "all"
 * so pages can keep their `filters.centre` contract.
 */
export default function CentreFilter({
    centres,
    value,
    onChange,
    className,
}: {
    centres: CentreOption[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
}) {
    const { t } = useI18n();

    if (centres.length === 0) {
        return null;
    }

    return (
        <Select value={value || 'all'} onValueChange={(v) => onChange(v === 'all' ? '' : v)}>
            <SelectTrigger
                aria-label={t('centre')}
                className={cn(
                    'h-8 w-auto gap-1 border-0 px-0 text-xs text-muted-foreground shadow-none focus:ring-0',
                    className,
                )}
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{t('all_centres')}</SelectItem>
                {centres.map((centre) => (
                    <SelectItem key={centre.id} value={String(centre.id)}>
                        {centre.short_name ?? centre.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

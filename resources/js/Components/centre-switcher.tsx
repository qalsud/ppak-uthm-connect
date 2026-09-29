import { router, usePage } from '@inertiajs/react';
import { Building2, Check } from 'lucide-react';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { useI18n } from '@/lib/i18n';
import type { PageProps } from '@/types';

export const ALL_CENTRES = 'all';

/**
 * Admin centre switcher. Selecting a centre scopes the rest of the portal via
 * the session; "All centres" clears it. Renders nothing when there is only one
 * centre configured (no point choosing).
 */
export default function CentreSwitcher({ compact = false }: { compact?: boolean }) {
    const { t } = useI18n();
    const { props } = usePage<PageProps>();

    const active = props.activeCentre;
    const options = active?.options ?? [];

    // Nothing to switch between.
    if (!active || options.length < 2) {
        return null;
    }

    const current = active.id ? String(active.id) : ALL_CENTRES;

    const change = (value: string) =>
        router.post(
            route('admin.centres.switch'),
            { centre_id: value === ALL_CENTRES ? null : Number(value) },
            { preserveScroll: true },
        );

    if (compact) {
        return (
            <Select value={current} onValueChange={change}>
                <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL_CENTRES}>{t('all_centres')}</SelectItem>
                    {options.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                            {c.short_name ?? c.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    return (
        <Select value={current} onValueChange={change}>
            <SelectTrigger className="h-9 gap-2 text-xs">
                <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={ALL_CENTRES}>
                    <span className="flex items-center gap-2">
                        {current === ALL_CENTRES && <Check className="size-3.5" />}
                        {t('all_centres')}
                    </span>
                </SelectItem>
                {options.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                        <span className="flex items-center gap-2">
                            {current === String(c.id) && <Check className="size-3.5" />}
                            {c.name}
                            {!c.is_active && (
                                <span className="text-[10px] text-muted-foreground">({t('inactive')})</span>
                            )}
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

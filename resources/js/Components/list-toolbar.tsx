import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

import { Input } from '@/Components/ui/input';
import { useI18n } from '@/lib/i18n';

export default function ListToolbar({
    search,
    onSearch,
    placeholder,
    filters,
}: {
    search: string;
    onSearch: (value: string) => void;
    placeholder: string;
    filters?: ReactNode;
}) {
    const { t } = useI18n();

    return (
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3" role="search">
            {filters && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {filters}
                </div>
            )}
            <div className="relative min-w-56 flex-1">
                <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder={placeholder}
                    aria-label={placeholder ?? t('search_placeholder')}
                    className="pl-9"
                />
            </div>
        </div>
    );
}

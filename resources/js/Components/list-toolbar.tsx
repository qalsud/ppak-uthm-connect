import { Search, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

import { Input } from '@/Components/ui/input';

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
    return (
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
            <div className="flex items-center gap-2 rounded-lg border border-input px-3 py-1.5 text-sm text-muted-foreground">
                <SlidersHorizontal className="size-4" />
                {filters ?? <span>Add filter</span>}
            </div>
            <div className="relative min-w-56 flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder={placeholder}
                    className="pl-9"
                />
            </div>
        </div>
    );
}
import { router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Input } from '@/Components/ui/input';
import { useI18n } from '@/lib/i18n';

type Item = { label: string; sub: string; href: string };
type Group = { label: string; items: Item[] };

export default function GlobalSearch() {
    const { t } = useI18n();
    const [query, setQuery] = useState('');
    const [groups, setGroups] = useState<Group[]>([]);
    const [open, setOpen] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (query.trim().length < 2) {
            setGroups([]);

            return;
        }

        const controller = new AbortController();
        const id = setTimeout(async () => {
            try {
                const res = await fetch(`/search?q=${encodeURIComponent(query)}`, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                const data = await res.json();
                setGroups(data.groups ?? []);
                setOpen(true);
            } catch {
                /* aborted */
            }
        }, 300);

        return () => {
            clearTimeout(id);
            controller.abort();
        };
    }, [query]);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);

        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const go = (href: string) => {
        setOpen(false);
        setQuery('');
        router.visit(href);
    };

    return (
        <div ref={boxRef} className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => groups.length > 0 && setOpen(true)}
                placeholder={t('search_placeholder')}
                className="h-9 w-60 pl-9"
            />

            {open && query.trim().length >= 2 && (
                <div className="absolute right-0 top-11 z-50 max-h-96 w-80 overflow-y-auto rounded-xl border bg-popover p-2 shadow-lg">
                    {groups.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t('no_results')}</p>
                    ) : (
                        groups.map((g) => (
                            <div key={g.label} className="mb-1">
                                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {g.label}
                                </p>
                                {g.items.map((item, i) => (
                                    <button
                                        key={`${g.label}-${i}`}
                                        type="button"
                                        onClick={() => go(item.href)}
                                        className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left hover:bg-accent"
                                    >
                                        <span className="text-sm font-medium">{item.label}</span>
                                        <span className="text-xs text-muted-foreground">{item.sub}</span>
                                    </button>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

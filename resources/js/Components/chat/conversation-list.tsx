import { router } from '@inertiajs/react';
import { FileText, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { todayIso } from '@/lib/chat';
import { useI18n } from '@/lib/i18n';
import { initials } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';

type SearchResult = {
    id: number;
    student: string;
    sender: string;
    snippet: string;
    date: string;
    url: string;
};

export default function ConversationList({
    conversations,
    openId,
    readOnly,
    canStart,
    onSelect,
    onNew,
}: {
    conversations: ChatConversation[];
    openId: number | null;
    readOnly: boolean;
    canStart: boolean;
    onSelect: (conversationId: number) => void;
    onNew: () => void;
}) {
    const { t } = useI18n();
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);

    // Message search (debounced).
    useEffect(() => {
        if (search.trim().length < 2) {
            setResults([]);

            return;
        }

        const controller = new AbortController();
        const id = setTimeout(async () => {
            try {
                const res = await fetch(`/messages/search?q=${encodeURIComponent(search)}`, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                const data = await res.json();
                setResults(data.results ?? []);
            } catch {
                /* aborted */
            }
        }, 300);

        return () => {
            clearTimeout(id);
            controller.abort();
        };
    }, [search]);

    return (
        <div className={`flex min-h-0 flex-col rounded-2xl border bg-card ${openId ? 'hidden lg:flex' : 'flex'}`}>
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
                <p className="text-sm font-semibold">{t('messages')}</p>
                {!readOnly && canStart && (
                    <Button size="sm" variant="outline" onClick={onNew}>
                        {t('new')}
                    </Button>
                )}
            </div>

            <div className="relative border-b px-3 py-2">
                <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('search_messages')}
                    aria-label={t('search_messages')}
                    className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm"
                />
                {results.length > 0 && (
                    <div className="absolute left-3 right-3 top-12 z-40 max-h-72 overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-lg">
                        {results.map((r) => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                    setResults([]);
                                    setSearch('');
                                    router.get(r.url, {}, { preserveState: true });
                                }}
                                className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left hover:bg-accent"
                            >
                                <span className="text-xs font-medium">
                                    {r.student} · {r.sender}
                                </span>
                                <span className="text-xs text-muted-foreground">{r.snippet}</span>
                            </button>
                        ))}
                    </div>
                )}
                {search.trim().length >= 2 && results.length === 0 && (
                    <div className="absolute left-3 right-3 top-12 z-40 rounded-xl border bg-popover p-3 text-xs text-muted-foreground shadow-lg">
                        {t('no_results')}
                    </div>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
                {conversations.length === 0 && (
                    <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                        {t('no_conversations')}
                    </p>
                )}
                {conversations.map((c) => {
                    const active = openId === c.id;
                    const unread = c.unread > 0;

                    return (
                        <button
                            key={c.id}
                            onClick={() => onSelect(c.id)}
                            className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                                active ? 'bg-brand-blue text-white' : 'hover:bg-accent'
                            }`}
                        >
                            <Avatar className="size-9 shrink-0">
                                <AvatarFallback className="bg-accent text-[11px] font-semibold text-accent-foreground">
                                    {initials(c.student)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`truncate text-sm ${unread ? 'font-bold' : 'font-medium'}`}>
                                        {c.student}
                                    </span>
                                    <span
                                        className={`shrink-0 text-[10px] ${
                                            active ? 'text-white/70' : 'text-muted-foreground'
                                        }`}
                                    >
                                        {c.last_date === todayIso() ? c.last_time : c.last_date}
                                    </span>
                                </div>
                                <p
                                    className={`flex items-center gap-1 truncate text-xs ${
                                        active ? 'text-white/80' : 'text-muted-foreground'
                                    }`}
                                >
                                    {c.last_type === 'system' && <FileText className="size-3 shrink-0" />}
                                    <span className="truncate">{c.last_message || '—'}</span>
                                </p>
                            </div>
                            {unread && (
                                <Badge className="shrink-0 bg-red-500">
                                    {c.unread > 9 ? '9+' : c.unread}
                                </Badge>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

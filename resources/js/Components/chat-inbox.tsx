import { router } from '@inertiajs/react';
import {
    ArrowDown,
    Check,
    CheckCheck,
    ChevronLeft,
    FileText,
    Loader2,
    MessageSquare,
    Paperclip,
    Pencil,
    Search,
    Send,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import PhotoThumb from '@/Components/photo-thumb';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Textarea } from '@/Components/ui/textarea';
import { formatDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import type { PhotoInfo } from '@/lib/photo';

export type ChatConversation = {
    id: number;
    student: string;
    class?: string | null;
    parent?: string | null;
    teacher?: string | null;
    last_message: string | null;
    last_type?: 'user' | 'system' | null;
    last_time?: string | null;
    last_date?: string | null;
    unread: number;
};

export type ChatMessage = {
    id: number;
    sender_id: number;
    sender: { name: string } | null;
    body: string;
    type: 'user' | 'system';
    is_system?: boolean;
    is_deleted?: boolean;
    photo_url?: string | null;
    photo_expired?: boolean;
    attachments?: PhotoInfo[];
    sent_time: string | null;
    sent_date: string | null;
    read_at?: string | null;
    edited_at?: string | null;
};

export type ChatOpen = {
    id: number;
    student: { id: number; name: string; class: string };
    teacher: { id: number; name: string } | null;
    messages: ChatMessage[];
    has_more: boolean;
    oldest_id: number | null;
    closed?: boolean;
};

type Props = {
    conversations: ChatConversation[];
    open: ChatOpen | null;
    students?: Array<{ id: number; name: string; class: string }>;
    currentUserId: number;
    basePath: string;
    onSelect: (conversationId: number) => void;
    onStart: (studentId: number) => void;
    onBack?: () => void;
    readOnly?: boolean;
    /** Admin oversight: allow deleting any message, not just your own. */
    canModerate?: boolean;
};

const initials = (name: string) =>
    name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

const todayIso = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;

    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

export default function ChatInbox({
    conversations,
    open,
    students = [],
    currentUserId,
    basePath,
    onSelect,
    onStart,
    onBack,
    readOnly = false,
    canModerate = false,
}: Props) {
    const { t } = useI18n();
    const [body, setBody] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [pending, setPending] = useState<Array<{ id: number; body: string }>>([]);
    const [sending, setSending] = useState(false);
    const [editing, setEditing] = useState<ChatMessage | null>(null);
    const [editBody, setEditBody] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [picked, setPicked] = useState('');
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Array<{ id: number; student: string; sender: string; snippet: string; date: string; url: string }>>([]);

    const fileInput = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const lastIdRef = useRef<number>(0);

    // Reset transient state when the thread changes; keep newest visible.
    useEffect(() => {
        setPending([]);
        setEditing(null);
        setBody('');
        setFiles([]);
        lastIdRef.current = open?.messages.at(-1)?.id ?? 0;
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }));
    }, [open?.id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [open?.messages.length, pending.length]);

    // Lightweight polling so new messages arrive without a refresh.
    useEffect(() => {
        if (!open || readOnly) {
            return;
        }

        const id = setInterval(async () => {
            if (document.visibilityState !== 'visible' || !open) {
                return;
            }

            try {
                const res = await fetch(`/messages/${open.id}/updates?after=${lastIdRef.current}`, {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                });
                const data = await res.json();

                if (data.messages?.length) {
                    lastIdRef.current = data.messages[data.messages.length - 1].id;
                    router.reload({ only: ['open', 'conversations'] });
                }
            } catch {
                /* ignore */
            }
        }, 5000);

        return () => clearInterval(id);
    }, [open?.id, readOnly]);

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

    const send = () => {
        if (!open || readOnly || sending || (body.trim() === '' && files.length === 0)) {
            return;
        }

        const optimistic = { id: -Date.now(), body: body.trim() };
        setPending((p) => [...p, optimistic]);
        setSending(true);

        const form = new FormData();
        form.append('body', body.trim());

        files.forEach((f, i) => form.append(`attachments[${i}]`, f));

        router.post(`${basePath}/${open.id}`, form as never, {
            forceFormData: true,
            preserveScroll: true,
            only: ['open', 'conversations'],
            onFinish: () => {
                setSending(false);
                setBody('');
                setFiles([]);
                if (fileInput.current) {
                    fileInput.current.value = '';
                }
            },
        });
    };

    const saveEdit = () => {
        if (!editing) {
            return;
        }

        router.patch(
            `/messages/record/${editing.id}`,
            { body: editBody },
            { preserveScroll: true, only: ['open', 'conversations'], onSuccess: () => setEditing(null) },
        );
    };

    const remove = (message: ChatMessage) => {
        if (!confirm(t('delete_message_confirm'))) {
            return;
        }

        router.delete(`/messages/record/${message.id}`, {
            preserveScroll: true,
            only: ['open', 'conversations'],
        });
    };

    const loadEarlier = () => {
        if (!open?.oldest_id) {
            return;
        }

        router.get(`${basePath}/${open.id}`, { before: open.oldest_id }, { only: ['open'], preserveScroll: false });
    };

    const start = () => {
        if (!picked) {
            return;
        }
        onStart(Number(picked));
        setPickerOpen(false);
        setPicked('');
    };

    const dayLabel = (date: string | null) => {
        if (!date) {
            return '';
        }

        const today = todayIso();

        if (date === today) {
            return t('today');
        }

        const yesterday = new Date(Date.now() - 86400000);
        const yIso = new Date(yesterday.getTime() - yesterday.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

        return date === yIso ? t('yesterday') : formatDate(date);
    };

    const lastOutboundId = open
        ? [...open.messages].reverse().find((m) => m.sender_id === currentUserId && !m.is_deleted)?.id
        : null;

    return (
        <div className="grid h-[calc(100dvh-17rem)] gap-4 overflow-hidden lg:h-[calc(100dvh-11.5rem)] lg:grid-cols-3">
            {/* Conversation list */}
            <div className={`flex min-h-0 flex-col rounded-2xl border bg-card ${open ? 'hidden lg:flex' : 'flex'}`}>
                <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
                    <p className="text-sm font-semibold">{t('messages')}</p>
                    {!readOnly && students.length > 0 && (
                        <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
                            {t('new')}
                        </Button>
                    )}
                </div>

                {/* Search */}
                <div className="relative border-b px-3 py-2">
                    <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('search_messages')}
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
                                    <span className="text-xs font-medium">{r.student} · {r.sender}</span>
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
                        const active = open?.id === c.id;
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
                                        <span className={`shrink-0 text-[10px] ${active ? 'text-white/70' : 'text-muted-foreground'}`}>
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
                                    <Badge className="shrink-0 bg-red-500">{c.unread > 9 ? '9+' : c.unread}</Badge>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Thread */}
            <div
                className={`flex min-h-0 flex-col rounded-2xl border bg-card lg:col-span-2 ${
                    open ? 'flex' : 'hidden lg:flex'
                }`}
            >
                {!open ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                        <MessageSquare className="size-8" />
                        <p className="text-sm">{t('select_conversation')}</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 border-b px-3 py-2.5">
                            <button
                                onClick={onBack}
                                className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-accent lg:hidden"
                                aria-label={t('back')}
                            >
                                <ChevronLeft className="size-5" />
                            </button>
                            <Avatar className="size-8 shrink-0">
                                <AvatarFallback className="bg-accent text-[10px] font-semibold text-accent-foreground">
                                    {initials(open.student.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{open.student.name}</p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                    {open.teacher ? `${t('teacher')}: ${open.teacher.name}` : t('unassigned')}
                                </p>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-3" role="log" aria-live="polite">
                            {open.has_more && (
                                <div className="flex justify-center pb-2">
                                    <Button variant="ghost" size="sm" onClick={loadEarlier} className="gap-1.5 text-xs">
                                        <ArrowDown className="size-3.5 rotate-180" />
                                        {t('load_earlier')}
                                    </Button>
                                </div>
                            )}

                            {open.messages.map((m, i) => {
                                const prev = open.messages[i - 1];
                                const newDay = !prev || prev.sent_date !== m.sent_date;
                                const grouped = !newDay && prev?.sender_id === m.sender_id && !prev?.is_system && !m.is_system;
                                const mine = m.sender_id === currentUserId;

                                return (
                                    <div key={m.id}>
                                        {newDay && (
                                            <div className="my-3 flex items-center justify-center">
                                                <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground">
                                                    {dayLabel(m.sent_date)}
                                                </span>
                                            </div>
                                        )}

                                        {m.is_system ? (
                                            <div className="my-2 flex justify-center">
                                                <div className="max-w-[85%] rounded-xl bg-muted/60 px-3 py-2 text-center text-xs text-muted-foreground">
                                                    {m.photo_url && (
                                                        <a href={m.photo_url} target="_blank" rel="noreferrer" className="mb-1.5 block">
                                                            <img src={m.photo_url} alt="" className="mx-auto max-h-56 rounded-lg object-contain" />
                                                        </a>
                                                    )}
                                                    {m.photo_expired && !m.photo_url && (
                                                        <p className="mb-1 italic">{t('photo_unavailable')}</p>
                                                    )}
                                                    <p className="whitespace-pre-wrap">{m.body}</p>
                                                    <span className="mt-0.5 block text-[10px] opacity-70">{m.sent_time}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`group flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                                                {!mine && (
                                                    <Avatar className={`size-7 shrink-0 ${grouped ? 'invisible' : ''}`}>
                                                        <AvatarFallback className="bg-accent text-[10px] font-semibold text-accent-foreground">
                                                            {initials(m.sender?.name ?? '?')}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                )}

                                                <div
                                                    className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                                                        mine
                                                            ? 'rounded-br-sm bg-brand-blue text-white'
                                                            : 'rounded-bl-sm bg-muted'
                                                    }`}
                                                >
                                                    {!mine && !grouped && (
                                                        <span className="mb-0.5 block text-[10px] font-semibold opacity-70">
                                                            {m.sender?.name}
                                                        </span>
                                                    )}

                                                    {m.is_deleted ? (
                                                        <span className="italic opacity-70">{t('message_deleted')}</span>
                                                    ) : (
                                                        <>
                                                            {m.attachments?.map((a) => (
                                                                <div key={a.id} className="mb-1.5">
                                                                    <PhotoThumb photo={a} size="size-32" />
                                                                </div>
                                                            ))}
                                                            {m.photo_url && (
                                                                <a href={m.photo_url} target="_blank" rel="noreferrer" className="mb-1.5 block">
                                                                    <img
                                                                        src={m.photo_url}
                                                                        alt=""
                                                                        loading="lazy"
                                                                        className="max-h-56 w-full max-w-[240px] rounded-lg object-cover"
                                                                    />
                                                                </a>
                                                            )}
                                                            {Boolean(m.photo_expired) && !m.photo_url && (
                                                                <span className="mb-1 block text-xs italic opacity-70">
                                                                    {t('photo_unavailable')}
                                                                </span>
                                                            )}
                                                            <span className="whitespace-pre-wrap">{m.body}</span>
                                                        </>
                                                    )}

                                                    <span
                                                        className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                                                            mine ? 'text-white/70' : 'text-muted-foreground'
                                                        }`}
                                                    >
                                                        {m.edited_at && !m.is_deleted && <span>{t('edited')}</span>}
                                                        {m.sent_time}
                                                        {mine && m.id === lastOutboundId && (
                                                            <span className="flex items-center gap-0.5">
                                                                {m.read_at ? (
                                                                    <>
                                                                        <CheckCheck className="size-3" />
                                                                        {t('seen')}
                                                                    </>
                                                                ) : (
                                                                    <Check className="size-3" />
                                                                )}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>

                                                {!readOnly && !m.is_deleted && (mine || canModerate) && (
                                                    <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                                        {mine && (
                                                            <button
                                                                onClick={() => {
                                                                    setEditing(m);
                                                                    setEditBody(m.body);
                                                                }}
                                                                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                                                                aria-label={t('edit')}
                                                            >
                                                                <Pencil className="size-3.5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => remove(m)}
                                                            className="rounded-md p-1 text-destructive hover:bg-accent"
                                                            aria-label={t('delete')}
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Optimistic (not yet confirmed) */}
                            {pending.map((p) => (
                                <div key={p.id} className="flex justify-end">
                                    <div className="max-w-[78%] rounded-2xl rounded-br-sm bg-brand-blue px-3 py-2 text-sm text-white opacity-70">
                                        <span className="whitespace-pre-wrap">{p.body}</span>
                                        <span className="mt-1 flex justify-end">
                                            <Loader2 className="size-3 animate-spin" />
                                        </span>
                                    </div>
                                </div>
                            ))}

                            <div ref={bottomRef} />
                        </div>

                        {!readOnly && (
                            <div className="border-t p-2.5">
                                {editing && (
                                    <div className="mb-2 space-y-1.5 rounded-xl border border-primary/40 bg-muted/40 p-2">
                                        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                                            <span>{t('edit_message')}</span>
                                            <button onClick={() => setEditing(null)} aria-label={t('cancel')}>
                                                <X className="size-3.5" />
                                            </button>
                                        </div>
                                        <Textarea rows={2} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                                                {t('cancel')}
                                            </Button>
                                            <Button size="sm" onClick={saveEdit}>
                                                {t('save')}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {files.length > 0 && (
                                    <div className="mb-2 flex flex-wrap gap-2">
                                        {files.map((f, i) => (
                                            <span key={i} className="flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-[11px]">
                                                <Paperclip className="size-3" />
                                                <span className="max-w-32 truncate">{f.name}</span>
                                                <button
                                                    onClick={() => setFiles((prev) => prev.filter((_, x) => x !== i))}
                                                    aria-label={t('remove_photo')}
                                                >
                                                    <X className="size-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-end gap-2">
                                    <input
                                        ref={fileInput}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            const chosen = Array.from(e.target.files ?? []).slice(0, 3);
                                            setFiles(chosen);
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => fileInput.current?.click()}
                                        aria-label={t('attach')}
                                    >
                                        <Paperclip className="size-4" />
                                    </Button>
                                    <Textarea
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                send();
                                            }
                                        }}
                                        rows={1}
                                        placeholder={t('type_message')}
                                        className="max-h-32 min-h-10 flex-1 resize-none"
                                    />
                                    <Button onClick={send} disabled={sending} aria-label={t('send')}>
                                        <Send className="size-4" />
                                    </Button>
                                </div>
                                {body.length > 1800 && (
                                    <p className="mt-1 text-right text-[10px] text-muted-foreground">
                                        {body.length}/2000
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* New conversation picker */}
            {pickerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPickerOpen(false)}>
                    <div className="w-full max-w-sm space-y-3 rounded-2xl border bg-card p-4" onClick={(e) => e.stopPropagation()}>
                        <p className="text-sm font-semibold">{t('new_conversation')}</p>
                        <select
                            value={picked}
                            onChange={(e) => setPicked(e.target.value)}
                            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                        >
                            <option value="">{t('select_student')}</option>
                            {students.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setPickerOpen(false)}>
                                {t('cancel')}
                            </Button>
                            <Button onClick={start} disabled={!picked}>
                                {t('open')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

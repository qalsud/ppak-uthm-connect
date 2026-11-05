import {
    ArrowDown,
    Check,
    CheckCheck,
    ChevronLeft,
    Loader2,
    Pencil,
    Trash2,
} from 'lucide-react';
import type { RefObject } from 'react';

import PhotoThumb from '@/Components/photo-thumb';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { Button } from '@/Components/ui/button';
import { dayLabel } from '@/lib/chat';
import { useI18n } from '@/lib/i18n';
import { initials } from '@/lib/utils';
import type { ChatMessage, ChatOpen } from '@/types/chat';

type PendingMessage = { id: number; body: string };

export default function MessageThread({
    open,
    currentUserId,
    readOnly,
    canModerate,
    pending,
    bottomRef,
    onLoadEarlier,
    onEdit,
    onDelete,
    onBack,
}: {
    open: ChatOpen;
    currentUserId: number;
    readOnly: boolean;
    canModerate: boolean;
    pending: PendingMessage[];
    bottomRef: RefObject<HTMLDivElement>;
    onLoadEarlier: () => void;
    onEdit: (message: ChatMessage) => void;
    onDelete: (message: ChatMessage) => void;
    onBack?: () => void;
}) {
    const { t } = useI18n();

    const lastOutboundId = [...open.messages]
        .reverse()
        .find((m) => m.sender_id === currentUserId && !m.is_deleted)?.id;

    return (
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

            <div
                className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-3"
                role="log"
                aria-live="polite"
            >
                {open.has_more && (
                    <div className="flex justify-center pb-2">
                        <Button variant="ghost" size="sm" onClick={onLoadEarlier} className="gap-1.5 text-xs">
                            <ArrowDown className="size-3.5 rotate-180" />
                            {t('load_earlier')}
                        </Button>
                    </div>
                )}

                {open.messages.map((m, i) => {
                    const prev = open.messages[i - 1];
                    const newDay = !prev || prev.sent_date !== m.sent_date;
                    const grouped =
                        !newDay && prev?.sender_id === m.sender_id && !prev?.is_system && !m.is_system;
                    const mine = m.sender_id === currentUserId;

                    return (
                        <div key={m.id}>
                            {newDay && (
                                <div className="my-3 flex items-center justify-center">
                                    <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground">
                                        {dayLabel(m.sent_date, t)}
                                    </span>
                                </div>
                            )}

                            {m.is_system ? (
                                <div className="my-2 flex justify-center">
                                    <div className="max-w-[85%] rounded-xl bg-muted/60 px-3 py-2 text-center text-xs text-muted-foreground">
                                        {m.photo_url && (
                                            <a
                                                href={m.photo_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mb-1.5 block"
                                            >
                                                <img
                                                    src={m.photo_url}
                                                    alt=""
                                                    className="mx-auto max-h-56 rounded-lg object-contain"
                                                />
                                            </a>
                                        )}
                                        {m.photo_expired && !m.photo_url && (
                                            <p className="mb-1 italic">{t('photo_unavailable')}</p>
                                        )}
                                        <p className="whitespace-pre-wrap">{m.body}</p>
                                        <span className="mt-0.5 block text-[10px] opacity-70">
                                            {m.sent_time}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className={`group flex items-end gap-2 ${
                                        mine ? 'justify-end' : 'justify-start'
                                    }`}
                                >
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
                                            <span className="italic opacity-70">
                                                {t('message_deleted')}
                                            </span>
                                        ) : (
                                            <>
                                                {m.attachments?.map((a) => (
                                                    <div key={a.id} className="mb-1.5">
                                                        <PhotoThumb photo={a} size="size-32" />
                                                    </div>
                                                ))}
                                                {m.photo_url && (
                                                    <a
                                                        href={m.photo_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mb-1.5 block"
                                                    >
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
                                                    onClick={() => onEdit(m)}
                                                    className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                                                    aria-label={t('edit')}
                                                >
                                                    <Pencil className="size-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onDelete(m)}
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
        </>
    );
}

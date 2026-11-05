import { router } from '@inertiajs/react';
import { useConnectionStatus } from '@laravel/echo-react';
import { MessageSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import ConversationList from '@/Components/chat/conversation-list';
import MessageComposer from '@/Components/chat/message-composer';
import MessageStream from '@/Components/chat/message-stream';
import MessageThread from '@/Components/chat/message-thread';
import NewConversationDialog from '@/Components/chat/new-conversation-dialog';
import { useI18n } from '@/lib/i18n';
import type { ChatConversation, ChatMessage, ChatOpen } from '@/types/chat';

export type { ChatConversation, ChatMessage, ChatOpen } from '@/types/chat';

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
    /** Single-thread view (admin): hide the empty conversation list column. */
    hideList?: boolean;
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
    hideList = false,
}: Props) {
    const { t } = useI18n();
    const [body, setBody] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [pending, setPending] = useState<Array<{ id: number; body: string }>>([]);
    const [sending, setSending] = useState(false);
    const [editing, setEditing] = useState<ChatMessage | null>(null);
    const [editBody, setEditBody] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const lastIdRef = useRef<number>(0);
    const connection = useConnectionStatus();

    // Reset transient state when the thread changes; keep newest visible.
    useEffect(() => {
        setPending([]);
        setEditing(null);
        setBody('');
        setFiles([]);
        lastIdRef.current = open?.messages.at(-1)?.id ?? 0;
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }));
        // Only reset when the thread changes, not on every incoming message.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open?.id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [open?.messages.length, pending.length]);

    // Realtime is the primary path (see <MessageStream />). This is only a
    // safety net while the WebSocket is not connected — e.g. Reverb is down.
    useEffect(() => {
        if (!open || readOnly || connection === 'connected') {
            return;
        }

        const id = setInterval(async () => {
            if (document.visibilityState !== 'visible') {
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
        }, 20000);

        return () => clearInterval(id);
        // The poll reads `open.id`; re-running on the whole object would restart it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open?.id, readOnly, connection]);

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

    return (
        <div
            className={`grid h-[calc(100dvh-17rem)] gap-4 overflow-hidden lg:h-[calc(100dvh-11.5rem)] ${
                hideList ? '' : 'lg:grid-cols-3'
            }`}
        >
            {open && !readOnly && (
                <MessageStream conversationId={open.id} currentUserId={currentUserId} />
            )}

            {!hideList && (
                <ConversationList
                    conversations={conversations}
                    openId={open?.id ?? null}
                    readOnly={readOnly}
                    canStart={students.length > 0}
                    onSelect={onSelect}
                    onNew={() => setPickerOpen(true)}
                />
            )}

            <div
                className={`flex min-h-0 flex-col rounded-2xl border bg-card ${
                    hideList ? '' : 'lg:col-span-2'
                } ${open ? 'flex' : 'hidden lg:flex'}`}
            >
                {!open ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                        <MessageSquare className="size-8" />
                        <p className="text-sm">{t('select_conversation')}</p>
                    </div>
                ) : (
                    <>
                        <MessageThread
                            open={open}
                            currentUserId={currentUserId}
                            readOnly={readOnly}
                            canModerate={canModerate}
                            pending={pending}
                            bottomRef={bottomRef}
                            onLoadEarlier={loadEarlier}
                            onEdit={(message) => {
                                setEditing(message);
                                setEditBody(message.body);
                            }}
                            onDelete={remove}
                            onBack={onBack}
                        />

                        {!readOnly && (
                            <MessageComposer
                                body={body}
                                setBody={setBody}
                                files={files}
                                setFiles={setFiles}
                                sending={sending}
                                onSend={send}
                                editing={editing}
                                editBody={editBody}
                                setEditBody={setEditBody}
                                onCancelEdit={() => setEditing(null)}
                                onSaveEdit={saveEdit}
                            />
                        )}
                    </>
                )}
            </div>

            {pickerOpen && (
                <NewConversationDialog
                    students={students}
                    onClose={() => setPickerOpen(false)}
                    onStart={onStart}
                />
            )}
        </div>
    );
}

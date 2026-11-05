import { Paperclip, Send, X } from 'lucide-react';
import { useRef, type Dispatch, type SetStateAction } from 'react';

import { Button } from '@/Components/ui/button';
import { Textarea } from '@/Components/ui/textarea';
import { useI18n } from '@/lib/i18n';
import type { ChatMessage } from '@/types/chat';

export default function MessageComposer({
    body,
    setBody,
    files,
    setFiles,
    sending,
    onSend,
    editing,
    editBody,
    setEditBody,
    onCancelEdit,
    onSaveEdit,
}: {
    body: string;
    setBody: (value: string) => void;
    files: File[];
    setFiles: Dispatch<SetStateAction<File[]>>;
    sending: boolean;
    onSend: () => void;
    editing: ChatMessage | null;
    editBody: string;
    setEditBody: (value: string) => void;
    onCancelEdit: () => void;
    onSaveEdit: () => void;
}) {
    const { t } = useI18n();
    const fileInput = useRef<HTMLInputElement>(null);

    const submit = () => {
        onSend();

        if (fileInput.current) {
            fileInput.current.value = '';
        }
    };

    return (
        <div className="border-t p-2.5">
            {editing && (
                <div className="mb-2 space-y-1.5 rounded-xl border border-primary/40 bg-muted/40 p-2">
                    <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                        <span>{t('edit_message')}</span>
                        <button onClick={onCancelEdit} aria-label={t('cancel')}>
                            <X className="size-3.5" />
                        </button>
                    </div>
                    <Textarea rows={2} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={onCancelEdit}>
                            {t('cancel')}
                        </Button>
                        <Button size="sm" onClick={onSaveEdit}>
                            {t('save')}
                        </Button>
                    </div>
                </div>
            )}

            {files.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                    {files.map((f, i) => (
                        <span
                            key={i}
                            className="flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-[11px]"
                        >
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
                            submit();
                        }
                    }}
                    rows={1}
                    placeholder={t('type_message')}
                    className="max-h-32 min-h-10 flex-1 resize-none"
                />
                <Button onClick={submit} disabled={sending} aria-label={t('send')}>
                    <Send className="size-4" />
                </Button>
            </div>
            {body.length > 1800 && (
                <p className="mt-1 text-right text-[10px] text-muted-foreground">
                    {body.length}/2000
                </p>
            )}
        </div>
    );
}

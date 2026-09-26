import { useForm } from '@inertiajs/react';
import { MessageSquare, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { useI18n } from '@/lib/i18n';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';

export type ChatConversation = {
    id: number;
    student: string;
    parent?: string;
    last_message: string | null;
    unread: number;
};

export type ChatMessage = {
    id: number;
    sender_id: number;
    sender: { name: string };
    body: string;
    created_at: string;
};

export type ChatOpen = {
    id: number;
    student: { id: number; name: string };
    messages: ChatMessage[];
};

type Props = {
    conversations: ChatConversation[];
    open: ChatOpen | null;
    students?: Array<{ id: number; name: string }>;
    onSelect: (conversationId: number) => void;
    onStart: (studentId: number) => void;
    onSubmit: (body: string) => void;
    currentUserId: number;
};

export default function ChatInbox({
    conversations,
    open,
    students = [],
    onSelect,
    onStart,
    onSubmit,
    currentUserId,
}: Props) {
    const { t } = useI18n();
    const chatForm = useForm({ body: '' });
    const [pickerOpen, setPickerOpen] = useState(false);
    const [picked, setPicked] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [open?.messages.length]);

    const send = () => {
        if (chatForm.data.body.trim().length === 0) return;
        onSubmit(chatForm.data.body);
        chatForm.reset();
    };

    const start = () => {
        if (!picked) return;
        onStart(Number(picked));
        setPickerOpen(false);
        setPicked('');
    };

    return (
        <div className="grid gap-4 lg:grid-cols-3">
            <Card className="h-[520px] overflow-y-auto p-2">
                <div className="mb-2 flex items-center justify-between px-2 pt-2">
                    <p className="text-sm font-semibold">{t('messages')}</p>
                    {students.length > 0 && (
                        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                    {t('new')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('new_conversation')}</DialogTitle>
                                </DialogHeader>
                                <Select value={picked} onValueChange={setPicked}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('select_student')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setPickerOpen(false)}>
                                        {t('cancel')}
                                    </Button>
                                    <Button onClick={start} disabled={!picked}>
                                        {t('open')}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
                {conversations.length === 0 && (
                    <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                        {t('no_conversations')}
                    </p>
                )}
                {conversations.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => onSelect(c.id)}
                        className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                            open?.id === c.id ? 'bg-brand-blue text-white' : 'hover:bg-accent'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{c.student}</span>
                            {c.unread > 0 && <Badge className="bg-red-500">{c.unread}</Badge>}
                        </div>
                        <p
                            className={`truncate text-xs ${open?.id === c.id ? 'text-white/80' : 'text-muted-foreground'}`}
                        >
                            {c.parent ? `${c.parent} · ` : ''}
                            {c.last_message ?? '—'}
                        </p>
                    </button>
                ))}
            </Card>

            <Card className="flex min-h-[320px] flex-col lg:col-span-2">
                {!open ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
                        <MessageSquare className="size-8" />
                        <p className="text-sm">{t('select_conversation')}</p>
                    </div>
                ) : (
                    <>
                        <div className="border-b px-4 py-3">
                            <p className="font-semibold">{open.student.name}</p>
                        </div>
                        <div className="flex-1 space-y-2 overflow-y-auto p-4">
                            {open.messages.map((m) => (
                                <div
                                    key={m.id}
                                    className={`flex ${m.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                                            m.sender_id === currentUserId
                                                ? 'rounded-br-sm bg-brand-blue text-white'
                                                : 'rounded-bl-sm bg-muted'
                                        }`}
                                    >
                                        <span className="mb-0.5 block text-[10px] font-medium opacity-70">
                                            {m.sender.name}
                                        </span>
                                        {m.body}
                                        <span
                                            className={`mt-1 block text-right text-[10px] ${
                                                m.sender_id === currentUserId
                                                    ? 'text-white/70'
                                                    : 'text-muted-foreground'
                                            }`}
                                        >
                                            {new Date(m.created_at).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>
                        <div className="flex gap-2 border-t p-3">
                            <Input
                                value={chatForm.data.body}
                                onChange={(e) => chatForm.setData('body', e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && send()}
                                placeholder={t('type_message')}
                            />
                            <Button onClick={send} disabled={chatForm.processing}>
                                <Send className="size-4" />
                            </Button>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}
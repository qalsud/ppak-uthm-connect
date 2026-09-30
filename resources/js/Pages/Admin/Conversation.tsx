import { Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Lock, Unlock } from 'lucide-react';

import ChatInbox, { type ChatOpen } from '@/Components/chat-inbox';
import PageHeader from '@/Components/page-header';
import { Button } from '@/Components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { useI18n } from '@/lib/i18n';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import type { PageProps } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Page = PageProps<{
    conversation: ChatOpen;
    teachers: Array<{ id: number; name: string }>;
}>;

export default function AdminConversation() {
    const { t } = useI18n();
    const { props } = usePage<Page>();
    const { conversation, teachers } = props;
    const closed = Boolean(conversation.closed);

    const reassign = (teacherId: string) =>
        router.patch(
            route('admin.conversations.reassign', { conversation: conversation.id }),
            { teacher_id: teacherId },
            { preserveScroll: true },
        );

    const toggleClosed = () =>
        router.patch(
            closed
                ? route('admin.conversations.reopen', { conversation: conversation.id })
                : route('admin.conversations.close', { conversation: conversation.id }),
            {},
            { preserveScroll: true },
        );

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={conversation.student.name} description={t('conversations_desc')}>
                <Select
                    value={conversation.teacher ? String(conversation.teacher.id) : ''}
                    onValueChange={reassign}
                >
                    <SelectTrigger className="w-52">
                        <SelectValue placeholder={t('reassign_teacher')} />
                    </SelectTrigger>
                    <SelectContent>
                        {teachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={String(teacher.id)}>
                                {teacher.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant={closed ? 'default' : 'outline'}
                    className="gap-1.5"
                    onClick={toggleClosed}
                >
                    {closed ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                    {closed ? t('reopen_conversation') : t('close_conversation')}
                </Button>
                <Link href="/admin/conversations">
                    <Button variant="outline" className="gap-1.5">
                        <ArrowLeft className="size-4" />
                        {t('conversations')}
                    </Button>
                </Link>
            </PageHeader>

            {closed && (
                <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {t('conversation_closed')}
                </p>
            )}

            <ChatInbox
                conversations={[]}
                open={conversation}
                currentUserId={props.auth.user.id}
                basePath="/admin/conversations"
                onSelect={() => {}}
                onStart={() => {}}
                readOnly={closed}
                canModerate
                hideList
            />
        </AppShell>
    );
}

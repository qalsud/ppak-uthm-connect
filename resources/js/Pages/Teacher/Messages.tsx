import { router, usePage } from '@inertiajs/react';

import ChatInbox, {
    type ChatConversation,
    type ChatOpen,
} from '@/Components/chat-inbox';
import type { PageProps } from '@/types';
import { useI18n } from '@/lib/i18n';
import PageHeader from '@/Components/page-header';
import { actionRoute, actionUrl, shellFor } from '@/lib/shell';
import AppShell from '@/Layouts/app-shell';

type Page = PageProps<{
    conversations: ChatConversation[];
    open: ChatOpen | null;
    students: Array<{ id: number; name: string; class: string }>;
    shell?: string;
}>;

export default function TeacherMessages() {
    const { t } = useI18n();
    const { props } = usePage<Page>();
    const shell = shellFor(props.shell);

    const select = (id: number) => {
        router.get(actionRoute(shell.isAdmin, 'messages.show', { conversation: id }), {}, { preserveState: true });
    };

    const start = (studentId: number) => {
        router.post(actionRoute(shell.isAdmin, 'messages.open', { student: studentId }));
    };

    const submit = (body: string) => {
        if (!props.open) return;
        router.post(
            actionRoute(shell.isAdmin, 'messages.store', { conversation: props.open.id }),
            { body },
            { preserveScroll: true },
        );
    };

    return (
        <AppShell nav={shell.nav} bottomNav={shell.bottomNav} title={t(shell.title)}>
            <PageHeader title={t('messages')} description="Chat with parents" />
            <ChatInbox
                conversations={props.conversations}
                open={props.open}
                students={props.students}
                currentUserId={props.auth.user.id}
                basePath="/teacher/messages"
                onSelect={select}
                onStart={start}
                onBack={() => router.get(actionUrl(shell.isAdmin, 'messages'))}
            />
        </AppShell>
    );
}
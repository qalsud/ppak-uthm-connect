import { router, usePage } from '@inertiajs/react';

import ChatInbox, {
    type ChatConversation,
    type ChatOpen,
} from '@/Components/chat-inbox';
import type { PageProps } from '@/types';
import { useI18n } from '@/lib/i18n';
import PageHeader from '@/Components/page-header';
import { teacherBottomNav, teacherNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Page = PageProps<{
    conversations: ChatConversation[];
    open: ChatOpen | null;
    students: Array<{ id: number; name: string; class: string }>;
}>;

export default function TeacherMessages() {
    const { t } = useI18n();
    const { props } = usePage<Page>();

    const select = (id: number) => {
        router.get(route('teacher.messages.show', { conversation: id }), {}, { preserveState: true });
    };

    const start = (studentId: number) => {
        router.post(route('teacher.messages.open', { student: studentId }));
    };

    const submit = (body: string) => {
        if (!props.open) return;
        router.post(
            route('teacher.messages.store', { conversation: props.open.id }),
            { body },
            { preserveScroll: true },
        );
    };

    return (
        <AppShell nav={teacherNav} bottomNav={teacherBottomNav} title={t('teacher')}>
            <PageHeader title={t('messages')} description="Chat with parents" />
            <ChatInbox
                conversations={props.conversations}
                open={props.open}
                students={props.students}
                currentUserId={props.auth.user.id}
                basePath="/teacher/messages"
                onSelect={select}
                onStart={start}
                onBack={() => router.get('/teacher/messages')}
            />
        </AppShell>
    );
}
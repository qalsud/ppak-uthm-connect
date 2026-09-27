import { router, usePage } from '@inertiajs/react';

import ChatInbox, {
    type ChatConversation,
    type ChatOpen,
} from '@/Components/chat-inbox';
import type { PageProps } from '@/types';
import { useI18n } from '@/lib/i18n';
import PageHeader from '@/Components/page-header';
import { parentBottomNav, parentNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Page = PageProps<{
    conversations: ChatConversation[];
    open: ChatOpen | null;
    students: Array<{ id: number; name: string; class: string }>;
}>;

export default function ParentMessages() {
    const { t } = useI18n();
    const { props } = usePage<Page>();

    const select = (id: number) => {
        router.get(route('parent.messages.show', { conversation: id }), {}, { preserveState: true });
    };

    const start = (studentId: number) => {
        router.post(route('parent.messages.open', { student: studentId }));
    };

    return (
        <AppShell nav={parentNav} bottomNav={parentBottomNav} title={t('parent')}>
            <PageHeader title={t('messages')} description="Chat with your child's teachers" />
            <ChatInbox
                conversations={props.conversations}
                open={props.open}
                students={props.students}
                currentUserId={props.auth.user.id}
                basePath="/parent/messages"
                onSelect={select}
                onStart={start}
                onBack={() => router.get('/parent/messages')}
            />
        </AppShell>
    );
}
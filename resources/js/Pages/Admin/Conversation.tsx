import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

import ChatInbox, { type ChatOpen } from '@/Components/chat-inbox';
import PageHeader from '@/Components/page-header';
import { Button } from '@/Components/ui/button';
import { useI18n } from '@/lib/i18n';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import type { PageProps } from '@/types';
import AppShell from '@/Layouts/app-shell';

export default function AdminConversation() {
    const { t } = useI18n();
    const { props } = usePage<PageProps<{ conversation: ChatOpen }>>();

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={props.conversation.student.name} description={t('conversations_desc')}>
                <Link href="/admin/conversations">
                    <Button variant="outline" className="gap-1.5">
                        <ArrowLeft className="size-4" />
                        {t('conversations')}
                    </Button>
                </Link>
            </PageHeader>

            <ChatInbox
                conversations={[]}
                open={props.conversation}
                currentUserId={props.auth.user.id}
                basePath="/admin/conversations"
                onSelect={() => {}}
                onStart={() => {}}
                readOnly
            />
        </AppShell>
    );
}

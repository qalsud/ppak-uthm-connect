import { router } from '@inertiajs/react';
import { Check, Inbox, X } from 'lucide-react';

import EmptyState from '@/Components/empty-state';
import PageHeader from '@/Components/page-header';
import StatusBadge from '@/Components/status-badge';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { useI18n } from '@/lib/i18n';
import { adminNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type PendingUser = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: 'teacher' | 'parent';
    created_at: string;
};

export default function Registrations({ users }: { users: PendingUser[] }) {
    const { t } = useI18n();

    const act = (user: PendingUser, action: 'approve' | 'reject') => {
        router.post(
            route(action === 'approve' ? 'admin.users.approve' : 'admin.users.reject', {
                user: user.id,
            }),
            {},
            { preserveScroll: true },
        );
    };

    return (
        <AppShell nav={adminNav} title={t('admin')}>
            <PageHeader title={t('registrations')} description="Approve or reject new accounts" />

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                {users.length === 0 ? (
                    <EmptyState
                        icon={Inbox}
                        title="No pending registrations"
                        description="New parent and teacher sign-ups will appear here for approval."
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>{t('name')}</TableHead>
                                    <TableHead>{t('email')}</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Registered</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status="neutral"
                                                label={user.role === 'teacher' ? t('teacher') : t('parent')}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                className="mr-2 gap-1"
                                                onClick={() => act(user, 'approve')}
                                            >
                                                <Check className="size-4" />
                                                {t('approve')}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1"
                                                onClick={() => act(user, 'reject')}
                                            >
                                                <X className="size-4" />
                                                {t('reject')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>
        </AppShell>
    );
}
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
import { adminBottomNav, adminNav } from '@/lib/navigation';
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
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('registrations')} description="Approve or reject new accounts" />

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                {users.length === 0 ? (
                    <EmptyState
                        icon={Inbox}
                        title="No pending registrations"
                        description="New parent and teacher sign-ups will appear here for approval."
                    />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-2 p-3 lg:hidden">
                            {users.map((user) => (
                                <div key={user.id} className="rounded-xl border p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{user.name}</p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {user.email}
                                            </p>
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <StatusBadge
                                                    status="neutral"
                                                    label={user.role === 'teacher' ? t('teacher') : t('parent')}
                                                />
                                                <span className="text-[11px] text-muted-foreground">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        <Button size="sm" className="flex-1 gap-1" onClick={() => act(user, 'approve')}>
                                            <Check className="size-4" />
                                            {t('approve')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 gap-1"
                                            onClick={() => act(user, 'reject')}
                                        >
                                            <X className="size-4" />
                                            {t('reject')}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto lg:block">
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
                    </>
                )}
            </Card>
        </AppShell>
    );
}
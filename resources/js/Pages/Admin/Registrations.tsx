import { router } from '@inertiajs/react';
import { Check, X } from 'lucide-react';

import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
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
            route(
                action === 'approve' ? 'admin.users.approve' : 'admin.users.reject',
                { user: user.id },
            ),
            {},
            { preserveScroll: true },
        );
    };

    return (
        <AppShell nav={adminNav} title={t('admin')}>
            <h1 className="mb-6 text-2xl font-bold">{t('registrations')}</h1>

            <Card>
                <CardHeader>
                    <CardTitle>{t('registrations')}</CardTitle>
                    <CardDescription>{t('pending_approval')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {users.length === 0 ? (
                        <p className="py-8 text-center text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('name')}</TableHead>
                                    <TableHead>{t('email')}</TableHead>
                                    <TableHead>{t('class')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {user.role === 'teacher' ? t('teacher') : t('parent')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{t('pending')}</Badge>
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
                    )}
                </CardContent>
            </Card>
        </AppShell>
    );
}
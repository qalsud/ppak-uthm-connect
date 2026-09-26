import { router, usePage } from '@inertiajs/react';
import { History, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import EmptyState from '@/Components/empty-state';
import PageHeader from '@/Components/page-header';
import Pagination, { type PaginationLink } from '@/Components/pagination';
import { Badge } from '@/Components/ui/badge';
import { Card } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
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
import type { PageProps } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Log = {
    id: number;
    action: string;
    label: string;
    description: string | null;
    user: string;
    ip: string | null;
    created_at: string;
};

type Page = PageProps<{
    logs: {
        data: Log[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    filters: { search: string };
}>;

export default function Activity() {
    const { t } = useI18n();
    const { props } = usePage<Page>();
    const { logs, filters } = props;

    const [search, setSearch] = useState(filters.search);
    const firstRender = useRef(true);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;

            return;
        }

        const id = setTimeout(() => {
            if (search !== filters.search) {
                router.get('/admin/activity', search ? { search } : {}, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                });
            }
        }, 350);

        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('activity_log')} description={t('activity_desc')} />

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <div className="flex items-center gap-3 border-b px-4 py-3">
                    <div className="relative min-w-56 flex-1">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('search_activity')}
                            className="pl-9"
                        />
                    </div>
                </div>

                {logs.data.length === 0 ? (
                    <EmptyState icon={History} title={t('no_activity')} />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-2 p-3 lg:hidden">
                            {logs.data.map((log) => (
                                <div key={log.id} className="rounded-xl border p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">
                                                {log.description ?? log.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {log.user} · {log.created_at}
                                            </p>
                                        </div>
                                        <Badge variant="secondary" className="shrink-0">
                                            {log.label}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto lg:block">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>{t('time')}</TableHead>
                                        <TableHead>{t('user')}</TableHead>
                                        <TableHead>{t('action')}</TableHead>
                                        <TableHead>{t('description')}</TableHead>
                                        <TableHead>IP</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.data.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                {log.created_at}
                                            </TableCell>
                                            <TableCell className="font-medium">{log.user}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{log.label}</Badge>
                                            </TableCell>
                                            <TableCell>{log.description ?? '—'}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {log.ip ?? '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <Pagination
                            links={logs.links}
                            from={logs.from}
                            to={logs.to}
                            total={logs.total}
                        />
                    </>
                )}
            </Card>
        </AppShell>
    );
}

import { router, usePage } from '@inertiajs/react';
import { Download, History, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import EmptyState from '@/Components/empty-state';
import PageHeader from '@/Components/page-header';
import Pagination, { type PaginationLink } from '@/Components/pagination';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
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

type Filters = {
    search: string;
    user: string;
    action: string;
    from: string;
    to: string;
};

type Page = PageProps<{
    logs: {
        data: Log[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    users: Array<{ id: number; name: string }>;
    actions: string[];
    filters: Filters;
}>;

export default function Activity() {
    const { t } = useI18n();
    const { props } = usePage<Page>();
    const { logs, users, actions, filters } = props;

    const [search, setSearch] = useState(filters.search);
    const firstRender = useRef(true);

    const visit = (params: Partial<Filters>) => {
        const next: Filters = {
            search: params.search ?? search,
            user: params.user ?? filters.user,
            action: params.action ?? filters.action,
            from: params.from ?? filters.from,
            to: params.to ?? filters.to,
        };

        const query = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== ''));

        router.get('/admin/activity', query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;

            return;
        }

        const id = setTimeout(() => {
            if (search !== filters.search) {
                visit({ search });
            }
        }, 350);

        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const exportQuery = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value !== ''),
    ).toString();

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('activity_log')} description={t('activity_desc')}>
                <Button variant="outline" className="gap-1.5" asChild>
                    <a href={`${route('admin.activity.export')}${exportQuery ? `?${exportQuery}` : ''}`}>
                        <Download className="size-4" />
                        {t('export_csv')}
                    </a>
                </Button>
            </PageHeader>

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                    <Select value={filters.user || '__all'} onValueChange={(v) => visit({ user: v === '__all' ? '' : v })}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('user')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all">{t('all_roles')}</SelectItem>
                            {users.map((u) => (
                                <SelectItem key={u.id} value={String(u.id)}>
                                    {u.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.action || '__all'}
                        onValueChange={(v) => visit({ action: v === '__all' ? '' : v })}
                    >
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder={t('action')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all">{t('all')}</SelectItem>
                            {actions.map((a) => (
                                <SelectItem key={a} value={a}>
                                    {a}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Input
                        type="date"
                        value={filters.from}
                        onChange={(e) => visit({ from: e.target.value })}
                        className="w-40"
                        aria-label={t('absence_from')}
                    />
                    <Input
                        type="date"
                        value={filters.to}
                        onChange={(e) => visit({ to: e.target.value })}
                        className="w-40"
                        aria-label={t('absence_to')}
                    />

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

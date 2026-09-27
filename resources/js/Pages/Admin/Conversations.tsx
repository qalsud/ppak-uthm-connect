import { Link, router, usePage } from '@inertiajs/react';
import { Download, MessageSquare, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import EmptyState from '@/Components/empty-state';
import PageHeader from '@/Components/page-header';
import Pagination from '@/Components/pagination';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { Button } from '@/Components/ui/button';
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
import type { PageProps, Paginator } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Row = {
    id: number;
    student: string;
    class: string | null;
    parent: string | null;
    teacher: string | null;
    messages_count: number;
    last_message: string | null;
    last_date: string | null;
};

const classLabel = (c: string | null) => (c === '5tahun' ? '5 Tahun' : c === '6bintang' ? '6 Bintang' : (c ?? '—'));

const initials = (name: string) =>
    name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

export default function AdminConversations() {
    const { t } = useI18n();
    const { props } = usePage<PageProps<{ conversations: Paginator<Row>; filters: { search: string } }>>();
    const conversations = props.conversations;
    const [search, setSearch] = useState(props.filters.search);
    const firstRender = useRef(true);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;

            return;
        }

        const id = setTimeout(() => {
            if (search !== props.filters.search) {
                router.get('/admin/conversations', search ? { search } : {}, {
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
            <PageHeader title={t('conversations')} description={t('conversations_desc')}>
                <Button variant="outline" className="gap-1.5" asChild>
                    <a href={route('admin.conversations.export')}>
                        <Download className="size-4" />
                        {t('export_csv')}
                    </a>
                </Button>
            </PageHeader>

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <div className="flex items-center gap-3 border-b px-4 py-3">
                    <div className="relative min-w-56 flex-1">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('search_students')}
                            className="pl-9"
                        />
                    </div>
                </div>

                {conversations.data.length === 0 ? (
                    <EmptyState icon={MessageSquare} title={t('no_conversations')} />
                ) : (
                    <>
                        <div className="hidden overflow-x-auto lg:block">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>{t('student')}</TableHead>
                                        <TableHead>{t('class')}</TableHead>
                                        <TableHead>{t('parent')}</TableHead>
                                        <TableHead>{t('teacher')}</TableHead>
                                        <TableHead>{t('messages')}</TableHead>
                                        <TableHead className="text-right">{t('action')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {conversations.data.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-medium">
                                                <span className="flex items-center gap-2">
                                                    <Avatar className="size-7">
                                                        <AvatarFallback className="bg-accent text-[10px] font-semibold">
                                                            {initials(row.student)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {row.student}
                                                </span>
                                            </TableCell>
                                            <TableCell>{classLabel(row.class)}</TableCell>
                                            <TableCell>{row.parent ?? '—'}</TableCell>
                                            <TableCell>{row.teacher ?? '—'}</TableCell>
                                            <TableCell>{row.messages_count}</TableCell>
                                            <TableCell className="text-right">
                                                <Link href={route('admin.conversations.show', { conversation: row.id })}>
                                                    <Button size="sm" variant="outline">
                                                        {t('open')}
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="space-y-2 p-3 lg:hidden">
                            {conversations.data.map((row) => (
                                <Link
                                    key={row.id}
                                    href={route('admin.conversations.show', { conversation: row.id })}
                                    className="block rounded-xl border p-3"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate font-medium">{row.student}</p>
                                        <span className="shrink-0 text-[11px] text-muted-foreground">
                                            {row.messages_count} {t('messages').toLowerCase()}
                                        </span>
                                    </div>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {classLabel(row.class)} · {row.parent ?? '—'} · {row.teacher ?? '—'}
                                    </p>
                                </Link>
                            ))}
                        </div>

                        <Pagination
                            links={conversations.links}
                            from={conversations.from}
                            to={conversations.to}
                            total={conversations.total}
                        />
                    </>
                )}
            </Card>
        </AppShell>
    );
}

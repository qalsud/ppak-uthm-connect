import { router } from '@inertiajs/react';
import { Check, Inbox, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import EmptyState from '@/Components/empty-state';
import FormDialog from '@/Components/form-dialog';
import PageHeader from '@/Components/page-header';
import Pagination from '@/Components/pagination';
import StatusBadge from '@/Components/status-badge';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { FormField } from '@/Components/ui/form-field';
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
import { formatDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import type { Paginator } from '@/types';
import AppShell from '@/Layouts/app-shell';

type ManagedUser = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: 'teacher' | 'parent';
    status: 'pending' | 'active' | 'rejected' | 'awaiting';
    rejection_reason: string | null;
    created_at: string;
};

type Filters = { status: string; role: string; search: string };

const STATUS_TABS = ['pending', 'active', 'rejected'] as const;

export default function Registrations({
    users,
    counts,
    filters,
}: {
    users: Paginator<ManagedUser>;
    counts: Record<string, number>;
    filters: Filters;
}) {
    const { t } = useI18n();
    const [search, setSearch] = useState(filters.search);
    const firstRender = useRef(true);

    const rows = users.data;

    const [selected, setSelected] = useState<number[]>([]);
    const [rejectTarget, setRejectTarget] = useState<ManagedUser | null>(null);
    const [rejectBulk, setRejectBulk] = useState(false);
    const [reason, setReason] = useState('');

    useEffect(() => {
        setSelected([]);
    }, [users.current_page, filters.status, filters.role, filters.search]);

    const toggle = (id: number) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));
    const toggleAll = () => setSelected(allSelected ? [] : rows.map((r) => r.id));

    const runBulk = (action: 'approve' | 'reject') =>
        router.post(
            route('admin.users.bulk'),
            { action, ids: selected },
            { preserveScroll: true, onFinish: () => setSelected([]) },
        );

    const visit = (next: Partial<Filters>) =>
        router.get(
            '/admin/registrations',
            { status: filters.status, role: filters.role, search: filters.search, ...next },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    // Debounced search → server.
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

    const act = (user: ManagedUser, action: 'approve' | 'reject') => {
        if (action === 'reject') {
            setRejectBulk(false);
            setRejectTarget(user);
            setReason('');

            return;
        }

        router.post(
            route('admin.users.approve', { user: user.id }),
            {},
            { preserveScroll: true },
        );
    };

    const askRejectBulk = () => {
        setRejectBulk(true);
        setRejectTarget(null);
        setReason('');
    };

    const confirmReject = () => {
        if (rejectBulk) {
            router.post(
                route('admin.users.bulk'),
                { action: 'reject', ids: selected, reason },
                {
                    preserveScroll: true,
                    onFinish: () => {
                        setRejectTarget(null);
                        setRejectBulk(false);
                        setSelected([]);
                    },
                },
            );

            return;
        }

        if (!rejectTarget) {
            return;
        }

        router.post(
            route('admin.users.reject', { user: rejectTarget.id }),
            { reason },
            { preserveScroll: true, onFinish: () => setRejectTarget(null) },
        );
    };

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('registrations')} description={t('approve_reject_desc')} />

            {/* Status tabs */}
            <div className="mb-4 flex flex-wrap gap-2">
                {STATUS_TABS.map((status) => (
                    <button
                        key={status}
                        type="button"
                        onClick={() => visit({ status })}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                            filters.status === status
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'bg-card text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        {t(status)}
                        <span
                            className={`rounded-full px-1.5 text-xs ${
                                filters.status === status
                                    ? 'bg-white/20'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            {counts[status] ?? 0}
                        </span>
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => visit({ status: 'all' })}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                        filters.status === 'all'
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'bg-card text-muted-foreground hover:bg-muted'
                    }`}
                >
                    {t('all')}
                    <span
                        className={`rounded-full px-1.5 text-xs ${
                            filters.status === 'all' ? 'bg-white/20' : 'bg-muted text-muted-foreground'
                        }`}
                    >
                        {counts.all ?? 0}
                    </span>
                </button>
            </div>

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                    <Select value={filters.role} onValueChange={(v) => visit({ role: v })}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('all_roles')}</SelectItem>
                            <SelectItem value="parent">{t('parent')}</SelectItem>
                            <SelectItem value="teacher">{t('teacher')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="relative min-w-56 flex-1">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('search_users')}
                            className="pl-9"
                        />
                    </div>
                </div>

                {selected.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2">
                        <span className="text-xs font-medium">
                            {selected.length} {t('selected')}
                        </span>
                        <Button size="sm" className="gap-1.5" onClick={() => runBulk('approve')}>
                            <Check className="size-4" />
                            {t('approve_selected')}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={askRejectBulk}
                        >
                            <X className="size-4" />
                            {t('reject_selected')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                            {t('clear_selection')}
                        </Button>
                    </div>
                )}

                {rows.length === 0 ? (
                    <EmptyState
                        icon={Inbox}
                        title={t('registrations_empty_title')}
                        description={t('registrations_empty_desc')}
                    />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-2 p-3 lg:hidden">
                            {rows.map((user) => (
                                <div key={user.id} className="rounded-xl border p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="size-4 shrink-0 accent-primary"
                                                    checked={selected.includes(user.id)}
                                                    onChange={() => toggle(user.id)}
                                                />
                                                <span className="truncate font-medium">{user.name}</span>
                                            </label>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {user.email}
                                            </p>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                <StatusBadge
                                                    status={user.status}
                                                    label={t(user.status)}
                                                />
                                                <span className="text-[11px] text-muted-foreground">
                                                    {user.role === 'teacher' ? t('teacher') : t('parent')} ·{' '}
                                                    {formatDate(user.created_at)}
                                                </span>
                                            </div>
                                            {user.status === 'rejected' && user.rejection_reason && (
                                                <p className="mt-1 text-[11px] text-rose-600">
                                                    {t('rejected_reason_label')}: {user.rejection_reason}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {user.status === 'pending' && (
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
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto lg:block">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="w-10">
                                            <input
                                                type="checkbox"
                                                className="size-4 accent-primary"
                                                checked={allSelected}
                                                onChange={toggleAll}
                                                aria-label={t('select_all')}
                                            />
                                        </TableHead>
                                        <TableHead>{t('name')}</TableHead>
                                        <TableHead>{t('email')}</TableHead>
                                        <TableHead>{t('role')}</TableHead>
                                        <TableHead>{t('status')}</TableHead>
                                        <TableHead>{t('registered')}</TableHead>
                                        <TableHead className="text-right">{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    className="size-4 accent-primary"
                                                    checked={selected.includes(user.id)}
                                                    onChange={() => toggle(user.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                {user.role === 'teacher' ? t('teacher') : t('parent')}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={user.status} label={t(user.status)} />
                                            </TableCell>
                                            <TableCell>{formatDate(user.created_at)}</TableCell>
                                            <TableCell className="text-right">
                                                {user.status === 'pending' ? (
                                                    <>
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
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <Pagination
                            links={users.links}
                            from={users.from}
                            to={users.to}
                            total={users.total}
                        />
                    </>
                )}
            </Card>

            <FormDialog
                open={rejectBulk || rejectTarget !== null}
                onOpenChange={(v) => !v && (setRejectTarget(null), setRejectBulk(false))}
                title={t('reject')}
                description={rejectBulk ? `${selected.length} ${t('selected')}` : (rejectTarget?.name ?? '')}
                onSubmit={confirmReject}
                submitLabel={t('reject')}
                destructive
                maxWidth="max-w-md"
            >
                <FormField label={t('reject_reason')}>
                    <Input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={t('reject_reason_placeholder')}
                    />
                </FormField>
            </FormDialog>
        </AppShell>
    );
}

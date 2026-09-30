import { router, useForm } from '@inertiajs/react';
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import ConfirmDialog from '@/Components/confirm-dialog';
import EmptyState from '@/Components/empty-state';
import FormDialog from '@/Components/form-dialog';
import ListToolbar from '@/Components/list-toolbar';
import PageHeader from '@/Components/page-header';
import Pagination from '@/Components/pagination';
import StatusBadge from '@/Components/status-badge';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { FormField, FormGrid } from '@/Components/ui/form-field';
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
import type { Paginator } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Admin = {
    id: number;
    name: string;
    email: string;
    status: 'active' | 'pending' | 'rejected' | 'awaiting';
    created_at: string;
};

const STATUSES = ['pending', 'active', 'awaiting', 'rejected'] as const;

export default function Administrators({
    admins,
    counts,
    activeAdmins,
    filters,
}: {
    admins: Paginator<Admin>;
    counts: Record<string, number>;
    activeAdmins: number;
    filters: { status: string; search: string };
}) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Admin | null>(null);
    const [search, setSearch] = useState(filters.search);
    const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null);
    const firstRender = useRef(true);

    const form = useForm({ name: '', email: '', password: '', status: 'active' });

    const rows = admins.data;

    const visit = (params: Partial<{ search: string; status: string }>) =>
        router.get(
            '/admin/administrators',
            {
                search: params.search ?? search,
                status: params.status ?? filters.status,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );

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

    const openCreate = () => {
        setEditing(null);
        form.setData({ name: '', email: '', password: '', status: 'active' });
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (admin: Admin) => {
        setEditing(admin);
        form.setData({
            name: admin.name,
            email: admin.email,
            password: '',
            status: admin.status,
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit = () => {
        if (editing) {
            form.put(route('admin.administrators.update', { user: editing.id }), {
                onSuccess: () => setOpen(false),
            });
        } else {
            form.post(route('admin.administrators.store'), { onSuccess: () => setOpen(false) });
        }
    };

    const confirmRemove = () => {
        if (!deleteTarget) {
            return;
        }

        router.delete(route('admin.administrators.destroy', { user: deleteTarget.id }), {
            preserveScroll: true,
            onFinish: () => setDeleteTarget(null),
        });
    };

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('administrators')} description={t('administrators_desc')}>
                <Button onClick={openCreate} className="gap-1.5">
                    <Plus className="size-4" />
                    {t('add_administrator')}
                </Button>
            </PageHeader>

            {activeAdmins <= 1 && (
                <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {t('only_admin_hint')}
                </p>
            )}

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <ListToolbar
                    search={search}
                    onSearch={setSearch}
                    placeholder={t('search_users')}
                    filters={
                        <Select value={filters.status || 'all'} onValueChange={(v) => visit({ status: v })}>
                            <SelectTrigger className="h-8 border-0 px-0 shadow-none focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('all')} ({counts.all ?? 0})</SelectItem>
                                {STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {t(s)} ({counts[s] ?? 0})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    }
                />
                <div className="border-b px-4 py-2 text-xs text-muted-foreground">
                    {t('administrators')}: {admins.from ?? 0}–{admins.to ?? 0} / {admins.total}
                </div>

                {rows.length === 0 ? (
                    <EmptyState
                        icon={ShieldCheck}
                        title={t('no_administrators_title')}
                        description={t('no_administrators_desc')}
                    />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-2 p-3 lg:hidden">
                            {rows.map((admin) => (
                                <div key={admin.id} className="rounded-xl border p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{admin.name}</p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {admin.email}
                                            </p>
                                            <div className="mt-1.5">
                                                <StatusBadge status={admin.status} label={t(admin.status)} />
                                            </div>
                                        </div>
                                        <div className="flex shrink-0">
                                            <Button size="sm" variant="ghost" onClick={() => openEdit(admin)}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive"
                                                onClick={() => setDeleteTarget(admin)}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
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
                                        <TableHead>{t('status')}</TableHead>
                                        <TableHead>{t('registered')}</TableHead>
                                        <TableHead className="text-right">{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((admin) => (
                                        <TableRow key={admin.id}>
                                            <TableCell className="font-medium">
                                                <span className="flex items-center gap-2">
                                                    <ShieldCheck className="size-4 text-primary" />
                                                    {admin.name}
                                                </span>
                                            </TableCell>
                                            <TableCell>{admin.email}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={admin.status} label={t(admin.status)} />
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {admin.created_at}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="mr-1"
                                                    onClick={() => openEdit(admin)}
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive"
                                                    onClick={() => setDeleteTarget(admin)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <Pagination
                            links={admins.links}
                            from={admins.from}
                            to={admins.to}
                            total={admins.total}
                        />
                    </>
                )}
            </Card>

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? `${t('edit')} ${t('administrator')}` : t('add_administrator')}
                onSubmit={submit}
                submitLabel={editing ? t('save') : t('add_administrator')}
                processing={form.processing}
            >
                <FormGrid>
                    <FormField label={t('name')} error={form.errors.name}>
                        <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                    </FormField>

                    <FormField label={t('email')} error={form.errors.email}>
                        <Input
                            type="email"
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                        />
                    </FormField>

                    <FormField
                        label={t('password')}
                        error={form.errors.password}
                        hint={editing ? t('leave_blank_password') : undefined}
                        className="sm:col-span-2"
                    >
                        <Input
                            type="password"
                            value={form.data.password}
                            onChange={(e) => form.setData('password', e.target.value)}
                        />
                    </FormField>

                    {editing && (
                        <FormField label={t('status')} error={form.errors.status} className="sm:col-span-2">
                            <Select value={form.data.status} onValueChange={(v) => form.setData('status', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {t(s)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                    )}
                </FormGrid>
            </FormDialog>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(v) => !v && setDeleteTarget(null)}
                title={`${t('delete')} ${deleteTarget?.name ?? ''}?`}
                description={t('cannot_be_undone')}
                confirmLabel={t('delete')}
                onConfirm={confirmRemove}
            />
        </AppShell>
    );
}

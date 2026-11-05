import { router, useForm } from '@inertiajs/react';
import { Download, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';

import ConfirmDialog from '@/Components/confirm-dialog';
import EmptyState from '@/Components/empty-state';
import FormDialog from '@/Components/form-dialog';
import IconButton from '@/Components/icon-button';
import ListToolbar from '@/Components/list-toolbar';
import MobileRecordCard from '@/Components/mobile-record-card';
import PageHeader from '@/Components/page-header';
import Pagination from '@/Components/pagination';
import StatusBadge from '@/Components/status-badge';
import StatusFilter, { ACCOUNT_STATUSES } from '@/Components/status-filter';
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
import { useServerSearch } from '@/lib/hooks';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import type { Paginator } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Child = { id: number; name: string; class: string };

type Parent = {
    id: number;
    name: string;
    email: string;
    ic_number: string | null;
    phone: string | null;
    status: 'active' | 'pending' | 'rejected' | 'awaiting';
    created_at: string;
    students_count: number;
    students: Child[];
};

const STATUSES = ACCOUNT_STATUSES;

export default function Parents({
    parents,
    counts,
    filters,
}: {
    parents: Paginator<Parent>;
    counts: Record<string, number>;
    filters: { status: string; search: string };
}) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Parent | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Parent | null>(null);

    const form = useForm({
        name: '',
        email: '',
        ic_number: '',
        phone: '',
        password: '',
        status: 'active',
    });

    const rows = parents.data;

    const visit = (params: Partial<{ search: string; status: string }>) =>
        router.get(
            '/admin/parents',
            {
                search: params.search ?? search,
                status: params.status ?? filters.status,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const [search, setSearch] = useServerSearch(filters.search, (value) => visit({ search: value }));

    const openCreate = () => {
        setEditing(null);
        form.setData({ name: '', email: '', ic_number: '', phone: '', password: '', status: 'active' });
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (parent: Parent) => {
        setEditing(parent);
        form.setData({
            name: parent.name,
            email: parent.email,
            ic_number: parent.ic_number ?? '',
            phone: parent.phone ?? '',
            password: '',
            status: parent.status,
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit = () => {
        if (editing) {
            form.put(route('admin.parents.update', { user: editing.id }), {
                onSuccess: () => setOpen(false),
            });
        } else {
            form.post(route('admin.parents.store'), { onSuccess: () => setOpen(false) });
        }
    };

    const confirmRemove = () => {
        if (!deleteTarget) {
            return;
        }

        router.delete(route('admin.parents.destroy', { user: deleteTarget.id }), {
            preserveScroll: true,
            onFinish: () => setDeleteTarget(null),
        });
    };

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('parents')} description={t('manage_parents')}>
                <Button variant="outline" className="gap-1.5" asChild>
                    <a href={route('admin.parents.export')}>
                        <Download className="size-4" />
                        {t('export_csv')}
                    </a>
                </Button>
                <Button onClick={openCreate} className="gap-1.5">
                    <Plus className="size-4" />
                    {t('add')} {t('parent')}
                </Button>
            </PageHeader>

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <ListToolbar
                    search={search}
                    onSearch={setSearch}
                    placeholder={t('search_users')}
                    filters={
                        <StatusFilter
                            value={filters.status}
                            counts={counts}
                            onChange={(value) => visit({ status: value })}
                        />
                    }
                />
                <div className="border-b px-4 py-2 text-xs text-muted-foreground">
                    {t('parents')}: {parents.from ?? 0}–{parents.to ?? 0} / {parents.total}
                </div>

                {rows.length === 0 ? (
                    <EmptyState
                        icon={UserRound}
                        title={t('no_parents_title')}
                        description={t('no_parents_desc')}
                    />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-2 p-3 lg:hidden">
                            {rows.map((parent) => (
                                <MobileRecordCard
                                    key={parent.id}
                                    title={parent.name}
                                    subtitle={parent.email}
                                    meta={
                                        <>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                <StatusBadge status={parent.status} label={t(parent.status)} />
                                                <span className="text-[11px] text-muted-foreground">
                                                    {t('children')}: {parent.students_count}
                                                </span>
                                            </div>
                                            {parent.students.length > 0 && (
                                                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                                                    {parent.students.map((c) => c.name).join(', ')}
                                                </p>
                                            )}
                                        </>
                                    }
                                    actions={
                                        <>
                                            <IconButton label={t('edit')} onClick={() => openEdit(parent)}>
                                                <Pencil className="size-4" />
                                            </IconButton>
                                            <IconButton
                                                destructive
                                                label={t('delete')}
                                                onClick={() => setDeleteTarget(parent)}
                                            >
                                                <Trash2 className="size-4" />
                                            </IconButton>
                                        </>
                                    }
                                />
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto lg:block">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>{t('name')}</TableHead>
                                        <TableHead>{t('ic')}</TableHead>
                                        <TableHead>{t('email')}</TableHead>
                                        <TableHead>{t('phone')}</TableHead>
                                        <TableHead>{t('children')}</TableHead>
                                        <TableHead>{t('status')}</TableHead>
                                        <TableHead className="text-right">{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((parent) => (
                                        <TableRow key={parent.id}>
                                            <TableCell className="font-medium">{parent.name}</TableCell>
                                            <TableCell>{parent.ic_number ?? '—'}</TableCell>
                                            <TableCell>{parent.email}</TableCell>
                                            <TableCell>{parent.phone ?? '—'}</TableCell>
                                            <TableCell>
                                                <span
                                                    title={parent.students.map((c) => c.name).join(', ')}
                                                    className="cursor-default"
                                                >
                                                    {parent.students_count}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={parent.status} label={t(parent.status)} />
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-right">
                                                <IconButton
                                                    label={t('edit')}
                                                    className="mr-1"
                                                    onClick={() => openEdit(parent)}
                                                >
                                                    <Pencil className="size-4" />
                                                </IconButton>
                                                <IconButton
                                                    destructive
                                                    label={t('delete')}
                                                    onClick={() => setDeleteTarget(parent)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <Pagination
                            links={parents.links}
                            from={parents.from}
                            to={parents.to}
                            total={parents.total}
                        />
                    </>
                )}
            </Card>

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? `${t('edit')} ${t('parent')}` : `${t('add')} ${t('parent')}`}
                onSubmit={submit}
                submitLabel={editing ? t('save') : `${t('add')} ${t('parent')}`}
                processing={form.processing}
            >
                <FormGrid>
                    <FormField label={t('name')} error={form.errors.name}>
                        <Input
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('ic')}>
                        <Input
                            value={form.data.ic_number}
                            onChange={(e) => form.setData('ic_number', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('email')} error={form.errors.email}>
                        <Input
                            type="email"
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('phone')}>
                        <Input
                            value={form.data.phone}
                            onChange={(e) => form.setData('phone', e.target.value)}
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
                        <FormField label={t('status')} className="sm:col-span-2">
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

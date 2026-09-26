import { router, useForm } from '@inertiajs/react';
import { Download, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';

import ConfirmDialog from '@/Components/confirm-dialog';
import EmptyState from '@/Components/empty-state';
import ListToolbar from '@/Components/list-toolbar';
import PageHeader from '@/Components/page-header';
import StatusBadge from '@/Components/status-badge';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
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

const STATUSES = ['pending', 'active', 'awaiting', 'rejected'] as const;

export default function Parents({
    parents,
    counts,
    filters,
}: {
    parents: Parent[];
    counts: Record<string, number>;
    filters: { status: string };
}) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Parent | null>(null);
    const [query, setQuery] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<Parent | null>(null);

    const form = useForm({
        name: '',
        email: '',
        ic_number: '',
        phone: '',
        password: '',
        status: 'active',
    });

    const filtered = useMemo(
        () =>
            parents.filter(
                (p) =>
                    p.name.toLowerCase().includes(query.toLowerCase()) ||
                    p.email.toLowerCase().includes(query.toLowerCase()),
            ),
        [parents, query],
    );

    const applyStatus = (status: string) =>
        router.get(
            '/admin/parents',
            status && status !== 'all' ? { status } : {},
            { preserveState: true, preserveScroll: true },
        );

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
                    search={query}
                    onSearch={setQuery}
                    placeholder={t('search_users')}
                    filters={
                        <Select value={filters.status || 'all'} onValueChange={applyStatus}>
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
                    {t('parents')}: {filtered.length}/{parents.length}
                </div>

                {filtered.length === 0 ? (
                    <EmptyState
                        icon={UserRound}
                        title={t('no_parents_title')}
                        description={t('no_parents_desc')}
                    />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-2 p-3 lg:hidden">
                            {filtered.map((parent) => (
                                <div key={parent.id} className="rounded-xl border p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{parent.name}</p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {parent.email}
                                            </p>
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
                                        </div>
                                        <div className="flex shrink-0">
                                            <Button size="sm" variant="ghost" onClick={() => openEdit(parent)}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive"
                                                onClick={() => setDeleteTarget(parent)}
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
                                        <TableHead>{t('ic')}</TableHead>
                                        <TableHead>{t('email')}</TableHead>
                                        <TableHead>{t('phone')}</TableHead>
                                        <TableHead>{t('children')}</TableHead>
                                        <TableHead>{t('status')}</TableHead>
                                        <TableHead className="text-right">{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((parent) => (
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
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="mr-1"
                                                    onClick={() => openEdit(parent)}
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive"
                                                    onClick={() => setDeleteTarget(parent)}
                                                >
                                                    <Trash2 className="size-4" />
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

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? `${t('edit')} ${t('parent')}` : `${t('add')} ${t('parent')}`}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label>{t('name')}</Label>
                            <Input
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                            />
                            {form.errors.name && (
                                <p className="text-xs text-destructive">{form.errors.name}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label>{t('ic')}</Label>
                            <Input
                                value={form.data.ic_number}
                                onChange={(e) => form.setData('ic_number', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>{t('email')}</Label>
                            <Input
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                            />
                            {form.errors.email && (
                                <p className="text-xs text-destructive">{form.errors.email}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label>{t('phone')}</Label>
                            <Input
                                value={form.data.phone}
                                onChange={(e) => form.setData('phone', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <Label>{t('password')}</Label>
                            <Input
                                type="password"
                                value={form.data.password}
                                onChange={(e) => form.setData('password', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                {editing ? t('leave_blank_password') : ''}
                            </p>
                            {form.errors.password && (
                                <p className="text-xs text-destructive">{form.errors.password}</p>
                            )}
                        </div>
                        {editing && (
                            <div className="space-y-1 sm:col-span-2">
                                <Label>{t('status')}</Label>
                                <Select
                                    value={form.data.status}
                                    onValueChange={(v) => form.setData('status', v)}
                                >
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
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            {t('cancel')}
                        </Button>
                        <Button onClick={submit} disabled={form.processing}>
                            {editing ? t('save') : `${t('add')} ${t('parent')}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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

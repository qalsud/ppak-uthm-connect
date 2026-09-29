import { router, useForm } from '@inertiajs/react';
import { Download, Pencil, Plus, Trash2, Upload, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import ConfirmDialog from '@/Components/confirm-dialog';
import CsvImportDialog from '@/Components/csv-import-dialog';
import EmptyState from '@/Components/empty-state';
import FormDialog from '@/Components/form-dialog';
import ImportReport from '@/Components/import-report';
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
import { useClassLabel as useClassLabelHook } from '@/lib/lists';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import type { Paginator } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Teacher = {
    id: number;
    name: string;
    email: string;
    ic_number: string | null;
    phone: string | null;
    class: string | null;
    status: 'active' | 'pending' | 'rejected' | 'awaiting';
    created_at: string;
};

const STATUSES = ['pending', 'active', 'awaiting', 'rejected'] as const;


export default function Teachers({
    teachers,
    counts,
    filters,
    classes,
}: {
    teachers: Paginator<Teacher>;
    counts: Record<string, number>;
    filters: { status: string; search: string; class: string };
    classes: string[];
}) {
    const { t } = useI18n();
    const classLabel = useClassLabelHook();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Teacher | null>(null);
    const [search, setSearch] = useState(filters.search);
    const [importing, setImporting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
    const firstRender = useRef(true);

    const form = useForm({
        name: '',
        email: '',
        ic_number: '',
        phone: '',
        password: '',
        status: 'active',
        class: '',
    });

    const rows = teachers.data;

    const [selected, setSelected] = useState<number[]>([]);
    const [bulkOpen, setBulkOpen] = useState(false);

    useEffect(() => {
        setSelected([]);
    }, [teachers.current_page, filters.search, filters.status]);

    const toggle = (id: number) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));
    const toggleAll = () => setSelected(allSelected ? [] : rows.map((r) => r.id));

    const runBulk = () =>
        router.post(
            route('admin.teachers.bulk'),
            { action: 'delete', ids: selected },
            {
                preserveScroll: true,
                onFinish: () => {
                    setBulkOpen(false);
                    setSelected([]);
                },
            },
        );

    const visit = (params: Partial<{ search: string; status: string }>) =>
        router.get(
            '/admin/teachers',
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
        form.setData({ name: '', email: '', ic_number: '', phone: '', password: '', status: 'active', class: '' });
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (teacher: Teacher) => {
        setEditing(teacher);
        form.setData({
            name: teacher.name,
            email: teacher.email,
            ic_number: teacher.ic_number ?? '',
            phone: teacher.phone ?? '',
            password: '',
            status: teacher.status,
            class: teacher.class ?? '',
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit = () => {
        if (editing) {
            form.put(route('admin.teachers.update', { user: editing.id }), {
                onSuccess: () => setOpen(false),
            });
        } else {
            form.post(route('admin.teachers.store'), { onSuccess: () => setOpen(false) });
        }
    };

    const confirmRemove = () => {
        if (!deleteTarget) {
            return;
        }

        router.delete(route('admin.teachers.destroy', { user: deleteTarget.id }), {
            preserveScroll: true,
            onFinish: () => setDeleteTarget(null),
        });
    };

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('teachers')} description={t('manage_staff')}>
                <Button variant="outline" className="gap-1.5" asChild>
                    <a href={route('admin.teachers.export')}>
                        <Download className="size-4" />
                        {t('export_csv')}
                    </a>
                </Button>
                <Button variant="outline" className="gap-1.5" onClick={() => setImporting(true)}>
                    <Upload className="size-4" />
                    {t('import_csv')}
                </Button>
                <Button onClick={openCreate} className="gap-1.5">
                    <Plus className="size-4" />
                    {t('add')} {t('teacher')}
                </Button>
            </PageHeader>

            <ImportReport />

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <ListToolbar
                    search={search}
                    onSearch={setSearch}
                    placeholder={t('search_teachers')}
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
                    {t('teachers')}: {teachers.from ?? 0}–{teachers.to ?? 0} / {teachers.total}
                </div>

                {selected.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2">
                        <span className="text-xs font-medium">
                            {selected.length} {t('selected')}
                        </span>
                        <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1.5"
                            onClick={() => setBulkOpen(true)}
                        >
                            <Trash2 className="size-4" />
                            {t('delete_selected')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                            {t('clear_selection')}
                        </Button>
                    </div>
                )}

                {rows.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title={t('teachers_empty_title')}
                        description={t('teachers_empty_desc')}
                    />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-2 p-3 lg:hidden">
                            {rows.map((teacher) => (
                                <div key={teacher.id} className="rounded-xl border p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="size-4 shrink-0 accent-primary"
                                                    checked={selected.includes(teacher.id)}
                                                    onChange={() => toggle(teacher.id)}
                                                />
                                                <span className="truncate font-medium">{teacher.name}</span>
                                            </label>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {teacher.email}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {teacher.class ? classLabel(teacher.class) : t('all_classes')}
                                            </p>
                                            <div className="mt-1.5">
                                                <StatusBadge status={teacher.status} label={t(teacher.status)} />
                                            </div>
                                        </div>
                                        <div className="flex shrink-0">
                                            <Button size="sm" variant="ghost" onClick={() => openEdit(teacher)}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive"
                                                onClick={() => setDeleteTarget(teacher)}
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
                                        <TableHead>{t('ic')}</TableHead>
                                        <TableHead>{t('email')}</TableHead>
                                        <TableHead>{t('class')}</TableHead>
                                        <TableHead>{t('phone')}</TableHead>
                                        <TableHead>{t('status')}</TableHead>
                                        <TableHead className="text-right">{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((teacher) => (
                                        <TableRow key={teacher.id}>
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    className="size-4 accent-primary"
                                                    checked={selected.includes(teacher.id)}
                                                    onChange={() => toggle(teacher.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{teacher.name}</TableCell>
                                            <TableCell>{teacher.ic_number ?? '—'}</TableCell>
                                            <TableCell>{teacher.email}</TableCell>
                                            <TableCell>
                                                {teacher.class ? (
                                                    classLabel(teacher.class)
                                                ) : (
                                                    <span className="text-muted-foreground">{t('all_classes')}</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{teacher.phone ?? '—'}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={teacher.status} label={t(teacher.status)} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="mr-1"
                                                    onClick={() => openEdit(teacher)}
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive"
                                                    onClick={() => setDeleteTarget(teacher)}
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
                            links={teachers.links}
                            from={teachers.from}
                            to={teachers.to}
                            total={teachers.total}
                        />
                    </>
                )}
            </Card>

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? `${t('edit')} ${t('teacher')}` : `${t('add')} ${t('teacher')}`}
                onSubmit={submit}
                submitLabel={editing ? t('save') : `${t('add')} ${t('teacher')}`}
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
                        label={t('class')}
                        hint={t('class_assignment_hint')}
                        className="sm:col-span-2"
                    >
                        <Select
                            value={form.data.class || 'none'}
                            onValueChange={(v) => form.setData('class', v === 'none' ? '' : v)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t('all_classes')}</SelectItem>
                                {classes.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {classLabel(c)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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

            <CsvImportDialog
                open={importing}
                onOpenChange={setImporting}
                action={route('admin.teachers.import')}
                hint={t('import_hint_teachers')}
                templateColumns={['name', 'email', 'ic_number', 'phone', 'password']}
                templateName="teachers-template.csv"
            />

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(v) => !v && setDeleteTarget(null)}
                title={`${t('delete')} ${deleteTarget?.name ?? ''}?`}
                description={t('cannot_be_undone')}
                confirmLabel={t('delete')}
                onConfirm={confirmRemove}
            />

            <ConfirmDialog
                open={bulkOpen}
                onOpenChange={setBulkOpen}
                title={`${t('delete_selected')} (${selected.length})?`}
                description={t('cannot_be_undone')}
                confirmLabel={t('delete')}
                onConfirm={runBulk}
            />
        </AppShell>
    );
}

import { router, useForm } from '@inertiajs/react';
import { Download, GraduationCap, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import ConfirmDialog from '@/Components/confirm-dialog';
import CsvImportDialog from '@/Components/csv-import-dialog';
import EmptyState from '@/Components/empty-state';
import ImportReport from '@/Components/import-report';
import ListToolbar from '@/Components/list-toolbar';
import PageHeader from '@/Components/page-header';
import Pagination from '@/Components/pagination';
import { Badge } from '@/Components/ui/badge';
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
import type { PageProps, Paginator } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Student = {
    id: number;
    name: string;
    age: number | null;
    class: string;
    parent: { id: number; name: string } | null;
};

type Parent = { id: number; name: string; email: string };

const CLASSES = ['5tahun', '6bintang'];
const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : c === '6bintang' ? '6 Bintang' : c);

export default function Students({
    students,
    parents,
    filters,
}: {
    students: Paginator<Student>;
    parents: Parent[];
    filters: { search: string; class: string };
}) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Student | null>(null);
    const [search, setSearch] = useState(filters.search);
    const [importing, setImporting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
    const firstRender = useRef(true);

    const form = useForm({ name: '', age: '', class: '5tahun', parent_id: '' });

    const rows = students.data;

    const visit = (params: Partial<{ search: string; class: string }>) =>
        router.get(
            '/admin/students',
            {
                search: params.search ?? search,
                class: params.class ?? filters.class,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    // Support the dashboard "Add student" quick action: /admin/students?create=1
    useEffect(() => {
        if (new URLSearchParams(window.location.search).get('create') === '1') {
            openCreate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Debounced server-side search.
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
        form.reset();
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (student: Student) => {
        setEditing(student);
        form.setData({
            name: student.name,
            age: student.age?.toString() ?? '',
            class: student.class,
            parent_id: student.parent?.id?.toString() ?? '',
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit = () => {
        if (editing) {
            form.put(route('admin.students.update', { student: editing.id }), {
                onSuccess: () => setOpen(false),
            });
        } else {
            form.post(route('admin.students.store'), { onSuccess: () => setOpen(false) });
        }
    };

    const confirmRemove = () => {
        if (!deleteTarget) {
            return;
        }

        router.delete(route('admin.students.destroy', { student: deleteTarget.id }), {
            preserveScroll: true,
            onFinish: () => setDeleteTarget(null),
        });
    };

    const classFilters = [
        { value: '', label: t('all') },
        { value: '5tahun', label: '5 Tahun' },
        { value: '6bintang', label: '6 Bintang' },
    ];

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('students')} description={t('manage_enrolled')}>
                <Button variant="outline" className="gap-1.5" asChild>
                    <a href={route('admin.students.export')}>
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
                    {t('add')} {t('student')}
                </Button>
            </PageHeader>

            <ImportReport />

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <ListToolbar
                    search={search}
                    onSearch={setSearch}
                    placeholder={t('search_students')}
                    filters={
                        <div className="flex rounded-lg p-0.5">
                            {classFilters.map((f) => (
                                <button
                                    key={f.value}
                                    type="button"
                                    onClick={() => visit({ class: f.value })}
                                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                        filters.class === f.value
                                            ? 'bg-brand-navy text-white'
                                            : 'text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    }
                />
                <div className="border-b px-4 py-2 text-xs text-muted-foreground">
                    {t('students')}: {students.from ?? 0}–{students.to ?? 0} / {students.total}
                </div>

                {rows.length === 0 ? (
                    <EmptyState
                        icon={GraduationCap}
                        title={t('students_empty_title')}
                        description={t('students_empty_desc')}
                    />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-2 p-3 lg:hidden">
                            {rows.map((student) => (
                                <div key={student.id} className="rounded-xl border p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{student.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {classLabel(student.class)}
                                                {student.age ? ` · ${student.age} ${t('age').toLowerCase()}` : ''}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {student.parent?.name ?? t('unassigned')}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0">
                                            <Button size="sm" variant="ghost" onClick={() => openEdit(student)}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive"
                                                onClick={() => setDeleteTarget(student)}
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
                                        <TableHead>{t('age')}</TableHead>
                                        <TableHead>{t('class')}</TableHead>
                                        <TableHead>{t('parent')}</TableHead>
                                        <TableHead className="text-right">{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">{student.name}</TableCell>
                                            <TableCell>{student.age ?? '—'}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{classLabel(student.class)}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {student.parent?.name ?? (
                                                    <span className="text-muted-foreground">
                                                        {t('unassigned')}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="mr-1"
                                                    onClick={() => openEdit(student)}
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive"
                                                    onClick={() => setDeleteTarget(student)}
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
                            links={students.links}
                            from={students.from}
                            to={students.to}
                            total={students.total}
                        />
                    </>
                )}
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? `${t('edit')} ${t('student')}` : `${t('add')} ${t('student')}`}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1 sm:col-span-2">
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
                            <Label>{t('age')}</Label>
                            <Input
                                type="number"
                                min={3}
                                max={10}
                                value={form.data.age}
                                onChange={(e) => form.setData('age', e.target.value)}
                            />
                            {form.errors.age && (
                                <p className="text-xs text-destructive">{form.errors.age}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label>{t('class')}</Label>
                            <Select value={form.data.class} onValueChange={(v) => form.setData('class', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CLASSES.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {classLabel(c)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <Label>{t('parent')}</Label>
                            <Select
                                value={form.data.parent_id || 'none'}
                                onValueChange={(v) => form.setData('parent_id', v === 'none' ? '' : v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('select_parent')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t('unassigned')}</SelectItem>
                                    {parents.map((p) => (
                                        <SelectItem key={p.id} value={p.id.toString()}>
                                            {p.name} · {p.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.errors.parent_id && (
                                <p className="text-xs text-destructive">{form.errors.parent_id}</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            {t('cancel')}
                        </Button>
                        <Button onClick={submit} disabled={form.processing}>
                            {editing ? t('save') : `${t('add')} ${t('student')}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CsvImportDialog
                open={importing}
                onOpenChange={setImporting}
                action={route('admin.students.import')}
                hint={t('import_hint_students')}
                templateColumns={['name', 'age', 'class', 'parent_email']}
                templateName="students-template.csv"
            />

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

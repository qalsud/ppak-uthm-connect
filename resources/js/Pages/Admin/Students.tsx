import { router, useForm, Link } from '@inertiajs/react';
import { Archive, Download, Eye, GraduationCap, Pencil, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
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
import { Textarea } from '@/Components/ui/textarea';
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
    status: 'active' | 'withdrawn' | 'graduated';
    allergies: string | null;
    medical_notes: string | null;
    parent: { id: number; name: string } | null;
};

type Parent = { id: number; name: string; email: string };

const CLASSES = ['5tahun', '6bintang'];
const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : c === '6bintang' ? '6 Bintang' : c);

export default function Students({
    students,
    parents,
    counts,
    filters,
}: {
    students: Paginator<Student>;
    parents: Parent[];
    counts: Record<string, number>;
    filters: { search: string; class: string; status: string };
}) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Student | null>(null);
    const [search, setSearch] = useState(filters.search);
    const [importing, setImporting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
    const firstRender = useRef(true);

    const form = useForm({
        name: '',
        age: '',
        class: '5tahun',
        parent_id: '',
        allergies: '',
        medical_notes: '',
    });

    const rows = students.data;

    const [selected, setSelected] = useState<number[]>([]);
    const [bulkOpen, setBulkOpen] = useState(false);

    useEffect(() => {
        setSelected([]);
    }, [students.current_page, filters.search, filters.class, filters.status]);

    const toggle = (id: number) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));
    const toggleAll = () => setSelected(allSelected ? [] : rows.map((r) => r.id));

    const runBulk = () =>
        router.post(
            route('admin.students.bulk'),
            { action: filters.status === 'active' ? 'withdraw' : 'delete', ids: selected },
            {
                preserveScroll: true,
                onFinish: () => {
                    setBulkOpen(false);
                    setSelected([]);
                },
            },
        );

    const visit = (params: Partial<{ search: string; class: string; status: string }>) =>
        router.get(
            '/admin/students',
            {
                search: params.search ?? search,
                class: params.class ?? filters.class,
                status: params.status ?? filters.status,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const setStudentStatus = (student: Student, status: 'active' | 'withdrawn' | 'graduated') =>
        router.post(
            route('admin.students.status', { student: student.id }),
            { status },
            { preserveScroll: true },
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
            allergies: student.allergies ?? '',
            medical_notes: student.medical_notes ?? '',
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

            {/* Status tabs */}
            <div className="mb-4 flex flex-wrap gap-2">
                {[
                    { value: 'active', label: t('active') },
                    { value: 'withdrawn', label: t('withdrawn') },
                    { value: 'graduated', label: t('graduated') },
                    { value: 'all', label: t('all') },
                ].map((tab) => (
                    <button
                        key={tab.value}
                        type="button"
                        onClick={() => visit({ status: tab.value })}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                            filters.status === tab.value
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'bg-card text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        {tab.label}
                        <span
                            className={`rounded-full px-1.5 text-xs ${
                                filters.status === tab.value
                                    ? 'bg-white/20'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            {counts[tab.value] ?? 0}
                        </span>
                    </button>
                ))}
            </div>

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
                            {filters.status === 'active' ? (
                                <Archive className="size-4" />
                            ) : (
                                <Trash2 className="size-4" />
                            )}
                            {filters.status === 'active' ? t('archive_selected') : t('delete_selected')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                            {t('clear_selection')}
                        </Button>
                    </div>
                )}

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
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="size-4 shrink-0 accent-primary"
                                                    checked={selected.includes(student.id)}
                                                    onChange={() => toggle(student.id)}
                                                />
                                                <span className="truncate font-medium">{student.name}</span>
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                {classLabel(student.class)}
                                                {student.age ? ` · ${student.age} ${t('age').toLowerCase()}` : ''}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {student.parent?.name ?? t('unassigned')}
                                            </p>
                                            {student.status !== 'active' && (
                                                <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                                    {t(student.status)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex shrink-0">
                                            <Link href={route('admin.students.show', { student: student.id })}>
                                                <Button size="sm" variant="ghost">
                                                    <Eye className="size-4" />
                                                </Button>
                                            </Link>
                                            <Button size="sm" variant="ghost" onClick={() => openEdit(student)}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            {student.status === 'active' ? (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    title={t('archive')}
                                                    onClick={() => setStudentStatus(student, 'withdrawn')}
                                                >
                                                    <Archive className="size-4" />
                                                </Button>
                                            ) : (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        title={t('restore')}
                                                        onClick={() => setStudentStatus(student, 'active')}
                                                    >
                                                        <RotateCcw className="size-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-destructive"
                                                        title={t('delete_permanently')}
                                                        onClick={() => setDeleteTarget(student)}
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </>
                                            )}
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
                                        <TableHead>{t('age')}</TableHead>
                                        <TableHead>{t('class')}</TableHead>
                                        <TableHead>{t('parent')}</TableHead>
                                        <TableHead className="text-right">{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    className="size-4 accent-primary"
                                                    checked={selected.includes(student.id)}
                                                    onChange={() => toggle(student.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {student.name}
                                                {student.status !== 'active' && (
                                                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                                        {t(student.status)}
                                                    </span>
                                                )}
                                            </TableCell>
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
                                                <Link href={route('admin.students.show', { student: student.id })}>
                                                    <Button size="sm" variant="ghost" className="mr-1">
                                                        <Eye className="size-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="mr-1"
                                                    onClick={() => openEdit(student)}
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                {student.status === 'active' ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        title={t('archive')}
                                                        onClick={() => setStudentStatus(student, 'withdrawn')}
                                                    >
                                                        <Archive className="size-4" />
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="mr-1"
                                                            title={t('restore')}
                                                            onClick={() => setStudentStatus(student, 'active')}
                                                        >
                                                            <RotateCcw className="size-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-destructive"
                                                            title={t('delete_permanently')}
                                                            onClick={() => setDeleteTarget(student)}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </>
                                                )}
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
                        <div className="space-y-1 sm:col-span-2">
                            <Label>{t('allergies')}</Label>
                            <Textarea
                                rows={2}
                                value={form.data.allergies}
                                onChange={(e) => form.setData('allergies', e.target.value)}
                                placeholder={t('allergies_placeholder')}
                            />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <Label>{t('medical_notes')}</Label>
                            <Textarea
                                rows={2}
                                value={form.data.medical_notes}
                                onChange={(e) => form.setData('medical_notes', e.target.value)}
                            />
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

            <ConfirmDialog
                open={bulkOpen}
                onOpenChange={setBulkOpen}
                title={`${
                    filters.status === 'active' ? t('archive_selected') : t('delete_selected')
                } (${selected.length})?`}
                description={t('cannot_be_undone')}
                confirmLabel={filters.status === 'active' ? t('archive') : t('delete')}
                onConfirm={runBulk}
            />
        </AppShell>
    );
}

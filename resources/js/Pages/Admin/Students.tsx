import { router, useForm, Link } from '@inertiajs/react';
import { Archive, Download, Eye, GraduationCap, Pencil, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';

import BulkActionBar from '@/Components/bulk-action-bar';
import CentreFilter from '@/Components/centre-filter';
import ConfirmDialog from '@/Components/confirm-dialog';
import CsvImportDialog from '@/Components/csv-import-dialog';
import EmptyState from '@/Components/empty-state';
import FilterTabs from '@/Components/filter-tabs';
import IconButton from '@/Components/icon-button';
import ImportReport from '@/Components/import-report';
import ListToolbar from '@/Components/list-toolbar';
import MobileRecordCard from '@/Components/mobile-record-card';
import PageHeader from '@/Components/page-header';
import Pagination from '@/Components/pagination';
import StatusBadge from '@/Components/status-badge';
import StudentFormDialog, {
    emptyStudentForm,
    type StudentFormData,
} from '@/Components/students/student-form-dialog';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
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
import { useList } from '@/lib/lists';
import { useRowSelection, useServerSearch } from '@/lib/hooks';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import type { Paginator } from '@/types';
import type { CentreOption, ParentOption, Student } from '@/types/models';
import AppShell from '@/Layouts/app-shell';

export default function Students({
    students,
    parents,
    centres,
    counts,
    filters,
}: {
    students: Paginator<Student>;
    parents: ParentOption[];
    centres: CentreOption[];
    counts: Record<string, number>;
    filters: { search: string; class: string; status: string; centre: string };
}) {
    const { t } = useI18n();
    const classLabel = useClassLabelHook();
    const classOptions = useList('class');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Student | null>(null);
    const [importing, setImporting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
    const [bulkOpen, setBulkOpen] = useState(false);

    const form = useForm<StudentFormData>(emptyStudentForm);

    const rows = students.data;
    const { selected, toggle, toggleAll, allSelected, clear } = useRowSelection(rows, [
        students.current_page,
        filters.search,
        filters.class,
        filters.status,
        filters.centre,
    ]);

    const visit = (params: Partial<{ search: string; class: string; status: string; centre: string }>) =>
        router.get(
            '/admin/students',
            {
                search: params.search ?? search,
                class: params.class ?? filters.class,
                status: params.status ?? filters.status,
                centre: params.centre ?? filters.centre,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const [search, setSearch] = useServerSearch(filters.search, (value) => visit({ search: value }));

    const runBulk = () =>
        router.post(
            route('admin.students.bulk'),
            { action: filters.status === 'active' ? 'withdraw' : 'restore', ids: selected },
            {
                preserveScroll: true,
                onFinish: () => {
                    setBulkOpen(false);
                    clear();
                },
            },
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
            centre_id: student.centre_id?.toString() ?? '',
            mykid: student.mykid ?? '',
            date_of_birth: student.date_of_birth ?? '',
            gender: student.gender ?? '',
            nationality: student.nationality ?? '',
            ethnicity: student.ethnicity ?? '',
            religion: student.religion ?? '',
            address: student.address ?? '',
            enrolment_date: student.enrolment_date ?? '',
            allergies: student.allergies ?? '',
            medical_notes: student.medical_notes ?? '',
            blood_type: student.blood_type ?? '',
            immunisation_status: student.immunisation_status ?? '',
            immunisation_notes: student.immunisation_notes ?? '',
            has_special_needs: student.has_special_needs ?? false,
            special_needs_notes: student.special_needs_notes ?? '',
            dietary_restrictions: student.dietary_restrictions ?? '',
            doctor_name: student.doctor_name ?? '',
            doctor_phone: student.doctor_phone ?? '',
            medical_consent: student.medical_consent ?? false,
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
        ...classOptions.map((c) => ({ value: c.value, label: c.label })),
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
            <FilterTabs
                value={filters.status}
                onChange={(value) => visit({ status: value })}
                tabs={[
                    { value: 'active', label: t('active'), count: counts.active ?? 0 },
                    { value: 'withdrawn', label: t('withdrawn'), count: counts.withdrawn ?? 0 },
                    { value: 'graduated', label: t('graduated'), count: counts.graduated ?? 0 },
                    { value: 'all', label: t('all'), count: counts.all ?? 0 },
                ]}
            />

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <ListToolbar
                    search={search}
                    onSearch={setSearch}
                    placeholder={t('search_students')}
                    filters={
                        <div className="flex flex-wrap items-center gap-2">
                            <CentreFilter
                                centres={centres}
                                value={filters.centre}
                                onChange={(value) => visit({ centre: value })}
                            />
                            <div className="flex rounded-lg p-0.5">
                                {classFilters.map((f) => (
                                    <button
                                        key={f.value}
                                        type="button"
                                        onClick={() => visit({ class: f.value })}
                                        aria-pressed={filters.class === f.value}
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
                        </div>
                    }
                />
                <div className="border-b px-4 py-2 text-xs text-muted-foreground">
                    {t('students')}: {students.from ?? 0}–{students.to ?? 0} / {students.total}
                </div>

                {selected.length > 0 && (
                    <BulkActionBar count={selected.length} onClear={clear}>
                        <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1.5"
                            onClick={() => setBulkOpen(true)}
                        >
                            {filters.status === 'active' ? (
                                <Archive className="size-4" />
                            ) : (
                                <RotateCcw className="size-4" />
                            )}
                            {filters.status === 'active'
                                ? t('archive_selected')
                                : t('restore_selected')}
                        </Button>
                    </BulkActionBar>
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
                                <MobileRecordCard
                                    key={student.id}
                                    select={{
                                        checked: selected.includes(student.id),
                                        onChange: () => toggle(student.id),
                                        label: `${t('select')} ${student.name}`,
                                    }}
                                    title={student.name}
                                    subtitle={`${student.centre ? `${student.centre.name} · ` : ''}${classLabel(student.class)}${
                                        student.age ? ` · ${student.age} ${t('age').toLowerCase()}` : ''
                                    }`}
                                    meta={
                                        <>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {student.parent?.name ?? t('unassigned')}
                                            </p>
                                            {student.status !== 'active' && (
                                                <div className="mt-1">
                                                    <StatusBadge
                                                        status={student.status}
                                                        label={t(student.status)}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    }
                                    actions={
                                        <>
                                            <IconButton asChild label={t('view')}>
                                                <Link
                                                    href={route('admin.students.show', {
                                                        student: student.id,
                                                    })}
                                                >
                                                    <Eye className="size-4" />
                                                </Link>
                                            </IconButton>
                                            <IconButton label={t('edit')} onClick={() => openEdit(student)}>
                                                <Pencil className="size-4" />
                                            </IconButton>
                                            {student.status === 'active' ? (
                                                <IconButton
                                                    label={t('archive')}
                                                    onClick={() => setStudentStatus(student, 'withdrawn')}
                                                >
                                                    <Archive className="size-4" />
                                                </IconButton>
                                            ) : (
                                                <>
                                                    <IconButton
                                                        label={t('restore')}
                                                        onClick={() => setStudentStatus(student, 'active')}
                                                    >
                                                        <RotateCcw className="size-4" />
                                                    </IconButton>
                                                    <IconButton
                                                        destructive
                                                        label={t('delete_permanently')}
                                                        onClick={() => setDeleteTarget(student)}
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </IconButton>
                                                </>
                                            )}
                                        </>
                                    }
                                />
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
                                                    aria-label={`${t('select')} ${student.name}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {student.name}
                                                {student.status !== 'active' && (
                                                    <span className="ml-2 inline-block align-middle">
                                                        <StatusBadge
                                                            status={student.status}
                                                            label={t(student.status)}
                                                        />
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>{student.age ?? '—'}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <Badge variant="secondary" className="w-fit">
                                                        {classLabel(student.class)}
                                                    </Badge>
                                                    {student.centre && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {student.centre.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {student.parent?.name ?? (
                                                    <span className="text-muted-foreground">
                                                        {t('unassigned')}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-right">
                                                <IconButton asChild label={t('view')} className="mr-1">
                                                    <Link
                                                        href={route('admin.students.show', {
                                                            student: student.id,
                                                        })}
                                                    >
                                                        <Eye className="size-4" />
                                                    </Link>
                                                </IconButton>
                                                <IconButton
                                                    label={t('edit')}
                                                    className="mr-1"
                                                    onClick={() => openEdit(student)}
                                                >
                                                    <Pencil className="size-4" />
                                                </IconButton>
                                                {student.status === 'active' ? (
                                                    <IconButton
                                                        label={t('archive')}
                                                        onClick={() => setStudentStatus(student, 'withdrawn')}
                                                    >
                                                        <Archive className="size-4" />
                                                    </IconButton>
                                                ) : (
                                                    <>
                                                        <IconButton
                                                            label={t('restore')}
                                                            className="mr-1"
                                                            onClick={() => setStudentStatus(student, 'active')}
                                                        >
                                                            <RotateCcw className="size-4" />
                                                        </IconButton>
                                                        <IconButton
                                                            destructive
                                                            label={t('delete_permanently')}
                                                            onClick={() => setDeleteTarget(student)}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </IconButton>
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

                        <StudentFormDialog
                open={open}
                onOpenChange={setOpen}
                editing={editing}
                parents={parents}
                centres={centres}
                form={form}
                onSubmit={submit}
            />

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
                    filters.status === 'active' ? t('archive_selected') : t('restore_selected')
                } (${selected.length})?`}
                description={
                    filters.status === 'active'
                        ? t('cannot_be_undone')
                        : t('restore_selected_desc')
                }
                destructive={filters.status === 'active'}
                confirmLabel={filters.status === 'active' ? t('archive') : t('restore')}
                onConfirm={runBulk}
            />
        </AppShell>
    );
}

import { router, useForm, Link } from '@inertiajs/react';
import { Archive, Download, Eye, GraduationCap, Pencil, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import ConfirmDialog from '@/Components/confirm-dialog';
import CsvImportDialog from '@/Components/csv-import-dialog';
import EmptyState from '@/Components/empty-state';
import FormDialog from '@/Components/form-dialog';
import ImportReport from '@/Components/import-report';
import ListToolbar from '@/Components/list-toolbar';
import PageHeader from '@/Components/page-header';
import Pagination from '@/Components/pagination';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { FormCheckbox, FormField, FormSection } from '@/Components/ui/form-field';
import { Input } from '@/Components/ui/input';
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
import { localDate } from '@/lib/date';
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
    mykid?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    nationality?: string | null;
    ethnicity?: string | null;
    religion?: string | null;
    address?: string | null;
    enrolment_date?: string | null;
    blood_type?: string | null;
    immunisation_status?: string | null;
    immunisation_notes?: string | null;
    has_special_needs?: boolean;
    special_needs_notes?: string | null;
    dietary_restrictions?: string | null;
    doctor_name?: string | null;
    doctor_phone?: string | null;
    medical_consent?: boolean;
    parent: { id: number; name: string } | null;
};

type Parent = { id: number; name: string; email: string };

const CLASSES = ['5tahun', '6bintang'];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const IMMUNISATION_STATUSES = ['complete', 'partial', 'none', 'exempt', 'unknown'];
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
        mykid: '',
        date_of_birth: '',
        gender: '',
        nationality: '',
        ethnicity: '',
        religion: '',
        address: '',
        enrolment_date: '',
        allergies: '',
        medical_notes: '',
        blood_type: '',
        immunisation_status: '',
        immunisation_notes: '',
        has_special_needs: false,
        special_needs_notes: '',
        dietary_restrictions: '',
        doctor_name: '',
        doctor_phone: '',
        medical_consent: false,
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

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? `${t('edit')} ${t('student')}` : `${t('add')} ${t('student')}`}
                onSubmit={submit}
                submitLabel={editing ? t('save') : `${t('add')} ${t('student')}`}
                processing={form.processing}
                maxWidth="max-w-3xl"
            >
                <FormSection title={t('child_details')}>
                    <FormField label={t('name')} error={form.errors.name} className="sm:col-span-2">
                        <Input
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('class')}>
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
                    </FormField>

                    <FormField label={t('parent')} error={form.errors.parent_id}>
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
                    </FormField>

                    <FormField label={t('mykid')}>
                        <Input
                            value={form.data.mykid}
                            onChange={(e) => form.setData('mykid', e.target.value)}
                            placeholder="080101-14-1234"
                        />
                    </FormField>

                    <FormField label={t('date_of_birth')} error={form.errors.date_of_birth}>
                        <Input
                            type="date"
                            max={localDate()}
                            value={form.data.date_of_birth}
                            onChange={(e) => form.setData('date_of_birth', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('gender')}>
                        <Select
                            value={form.data.gender || 'none'}
                            onValueChange={(v) => form.setData('gender', v === 'none' ? '' : v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                <SelectItem value="male">{t('gender.male')}</SelectItem>
                                <SelectItem value="female">{t('gender.female')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormField>

                    <FormField label={t('nationality')}>
                        <Select
                            value={form.data.nationality || 'none'}
                            onValueChange={(v) => form.setData('nationality', v === 'none' ? '' : v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                <SelectItem value="malaysian">{t('nationality.malaysian')}</SelectItem>
                                <SelectItem value="non_malaysian">
                                    {t('nationality.non_malaysian')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </FormField>

                    <FormField label={t('ethnicity')}>
                        <Input
                            value={form.data.ethnicity}
                            onChange={(e) => form.setData('ethnicity', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('religion')}>
                        <Input
                            value={form.data.religion}
                            onChange={(e) => form.setData('religion', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('address')} className="sm:col-span-2">
                        <Textarea
                            rows={2}
                            value={form.data.address}
                            onChange={(e) => form.setData('address', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('enrolment_date')}>
                        <Input
                            type="date"
                            max={localDate()}
                            value={form.data.enrolment_date}
                            onChange={(e) => form.setData('enrolment_date', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('age')} error={form.errors.age} hint={t('age_optional_hint')}>
                        <Input
                            type="number"
                            min={3}
                            max={10}
                            value={form.data.age}
                            onChange={(e) => form.setData('age', e.target.value)}
                        />
                    </FormField>
                </FormSection>

                <FormSection title={t('health_information')}>
                    <FormField label={t('allergies')} className="sm:col-span-2">
                        <Textarea
                            rows={2}
                            value={form.data.allergies}
                            onChange={(e) => form.setData('allergies', e.target.value)}
                            placeholder={t('allergies_placeholder')}
                        />
                    </FormField>

                    <FormField label={t('medical_notes')} className="sm:col-span-2">
                        <Textarea
                            rows={2}
                            value={form.data.medical_notes}
                            onChange={(e) => form.setData('medical_notes', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('blood_type')}>
                        <Select
                            value={form.data.blood_type || 'none'}
                            onValueChange={(v) => form.setData('blood_type', v === 'none' ? '' : v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                {BLOOD_TYPES.map((b) => (
                                    <SelectItem key={b} value={b}>
                                        {b}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>

                    <FormField label={t('immunisation_status')}>
                        <Select
                            value={form.data.immunisation_status || 'none'}
                            onValueChange={(v) => form.setData('immunisation_status', v === 'none' ? '' : v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                {IMMUNISATION_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {t(`immunisation.${s}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>

                    <FormField label={t('immunisation_notes')} className="sm:col-span-2">
                        <Textarea
                            rows={2}
                            value={form.data.immunisation_notes}
                            onChange={(e) => form.setData('immunisation_notes', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('dietary_restrictions')} className="sm:col-span-2">
                        <Textarea
                            rows={2}
                            value={form.data.dietary_restrictions}
                            onChange={(e) => form.setData('dietary_restrictions', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('doctor_name')}>
                        <Input
                            value={form.data.doctor_name}
                            onChange={(e) => form.setData('doctor_name', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('doctor_phone')}>
                        <Input
                            value={form.data.doctor_phone}
                            onChange={(e) => form.setData('doctor_phone', e.target.value)}
                        />
                    </FormField>

                    <FormCheckbox
                        label={t('special_needs')}
                        description={t('special_needs_notes')}
                        checked={form.data.has_special_needs}
                        onChange={(v) => form.setData('has_special_needs', v)}
                        className="sm:col-span-2"
                    />

                    {form.data.has_special_needs && (
                        <FormField label={t('special_needs_notes')} className="sm:col-span-2">
                            <Textarea
                                rows={2}
                                value={form.data.special_needs_notes}
                                onChange={(e) => form.setData('special_needs_notes', e.target.value)}
                            />
                        </FormField>
                    )}

                    <FormCheckbox
                        label={t('medical_consent')}
                        description={t('medical_consent_hint')}
                        checked={form.data.medical_consent}
                        onChange={(v) => form.setData('medical_consent', v)}
                        className="sm:col-span-2"
                    />
                </FormSection>
            </FormDialog>

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

import { router, useForm } from '@inertiajs/react';
import { Download, GraduationCap, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';

import EmptyState from '@/Components/empty-state';
import ListToolbar from '@/Components/list-toolbar';
import PageHeader from '@/Components/page-header';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
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

type Student = {
    id: number;
    name: string;
    age: number | null;
    class: string;
    parent: { id: number; name: string } | null;
};

const CLASSES = ['5tahun', '6bintang'];
const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : '6 Bintang');

export default function Students({ students }: { students: Student[] }) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<'manual' | 'csv'>('manual');
    const [editing, setEditing] = useState<Student | null>(null);
    const [query, setQuery] = useState('');

    const form = useForm({ name: '', age: '', class: '5tahun', parent_id: '' });

    const filtered = useMemo(
        () =>
            students.filter(
                (s) =>
                    s.name.toLowerCase().includes(query.toLowerCase()) ||
                    (s.parent?.name ?? '').toLowerCase().includes(query.toLowerCase()),
            ),
        [students, query],
    );

    const openCreate = () => {
        setEditing(null);
        form.reset();
        setTab('manual');
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
        setTab('manual');
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

    const remove = (student: Student) => {
        if (confirm(`${t('delete')} ${student.name}?`)) {
            router.delete(route('admin.students.destroy', { student: student.id }), {
                preserveScroll: true,
            });
        }
    };

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('students')} description="Manage enrolled children">
                <Button variant="outline" className="gap-1.5" asChild>
                    <a href={route('admin.students.export')}>
                        <Download className="size-4" />
                        Export CSV
                    </a>
                </Button>
                <Button onClick={openCreate} className="gap-1.5">
                    <Plus className="size-4" />
                    {t('add')} {t('student')}
                </Button>
            </PageHeader>

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <ListToolbar
                    search={query}
                    onSearch={setQuery}
                    placeholder="Search for a student by name or parent"
                />
                {filtered.length === 0 ? (
                    <EmptyState
                        icon={GraduationCap}
                        title="No students at this time"
                        description="Students will appear here after they enroll in your school."
                    />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-2 p-3 lg:hidden">
                            {filtered.map((student) => (
                                <div key={student.id} className="rounded-xl border p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{student.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {classLabel(student.class)}
                                                {student.age ? ` · ${student.age} yrs` : ''}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {student.parent?.name ?? '—'}
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
                                                onClick={() => remove(student)}
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
                                    <TableHead>Age</TableHead>
                                    <TableHead>{t('class')}</TableHead>
                                    <TableHead>{t('parent')}</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">{student.name}</TableCell>
                                        <TableCell>{student.age ?? '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {classLabel(student.class)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{student.parent?.name ?? '—'}</TableCell>
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
                                                onClick={() => remove(student)}
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
                            {editing ? `${t('edit')} ${t('student')}` : `${t('add')} ${t('students')}`}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Tabs */}
                    <div className="flex gap-6 border-b">
                        {(['manual', 'csv'] as const).map((key) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={`-mb-px border-b-2 pb-2 text-sm font-medium transition-colors ${
                                    tab === key
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground'
                                }`}
                            >
                                {key === 'manual' ? 'Manually' : 'Import CSV'}
                            </button>
                        ))}
                    </div>

                    {tab === 'manual' ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1 sm:col-span-2">
                                <Label>{t('name')}</Label>
                                <Input
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    placeholder="Student full name"
                                />
                                {form.errors.name && (
                                    <p className="text-xs text-destructive">{form.errors.name}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <Label>Age</Label>
                                <Input
                                    type="number"
                                    min={2}
                                    max={12}
                                    value={form.data.age}
                                    onChange={(e) => form.setData('age', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('class')}</Label>
                                <Select
                                    value={form.data.class}
                                    onValueChange={(v) => form.setData('class', v)}
                                >
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
                                <Label>Parent ID</Label>
                                <Input
                                    value={form.data.parent_id}
                                    onChange={(e) => form.setData('parent_id', e.target.value)}
                                    placeholder="Optional — link to a parent account"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
                            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                                <Upload className="size-5" />
                            </span>
                            <p className="text-sm font-medium">Import students from CSV</p>
                            <p className="max-w-sm text-xs text-muted-foreground">
                                Upload a CSV with columns: name, age, class, parent_email.
                                (Import is coming soon — add students manually for now.)
                            </p>
                            <Input type="file" accept=".csv" disabled className="max-w-xs" />
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            {t('cancel')}
                        </Button>
                        {tab === 'manual' && (
                            <Button onClick={submit} disabled={form.processing}>
                                {editing ? t('save') : `${t('add')} ${t('student')}`}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}
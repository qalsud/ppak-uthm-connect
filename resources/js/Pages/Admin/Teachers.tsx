import { router, useForm } from '@inertiajs/react';
import { Download, Pencil, Plus, Trash2, Upload, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import EmptyState from '@/Components/empty-state';
import ListToolbar from '@/Components/list-toolbar';
import PageHeader from '@/Components/page-header';
import StatusBadge from '@/Components/status-badge';
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
import AppShell from '@/Layouts/app-shell';

type Teacher = {
    id: number;
    name: string;
    email: string;
    ic_number: string | null;
    phone: string | null;
    status: 'active' | 'pending' | 'rejected' | 'awaiting';
    created_at: string;
};

export default function Teachers({ teachers }: { teachers: Teacher[] }) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<'manual' | 'csv'>('manual');
    const [editing, setEditing] = useState<Teacher | null>(null);
    const [query, setQuery] = useState('');

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
            teachers.filter(
                (x) =>
                    x.name.toLowerCase().includes(query.toLowerCase()) ||
                    x.email.toLowerCase().includes(query.toLowerCase()),
            ),
        [teachers, query],
    );

    const openCreate = () => {
        setEditing(null);
        form.setData({ name: '', email: '', ic_number: '', phone: '', password: '', status: 'active' });
        setTab('manual');
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
        });
        setTab('manual');
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

    const remove = (teacher: Teacher) => {
        if (confirm(`${t('delete')} ${teacher.name}?`)) {
            router.delete(route('admin.teachers.destroy', { user: teacher.id }), {
                preserveScroll: true,
            });
        }
    };

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('teachers')} description="Manage teaching staff">
                <Button variant="outline" className="gap-1.5">
                    <Download className="size-4" />
                    Export CSV
                </Button>
                <Button onClick={openCreate} className="gap-1.5">
                    <Plus className="size-4" />
                    {t('add')} {t('teacher')}
                </Button>
            </PageHeader>

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <ListToolbar
                    search={query}
                    onSearch={setQuery}
                    placeholder="Search for a teacher by name or email"
                />
                {filtered.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No teachers at this time"
                        description="Teachers will appear here after they register and are approved."
                    />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-2 p-3 lg:hidden">
                            {filtered.map((teacher) => (
                                <div key={teacher.id} className="rounded-xl border p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{teacher.name}</p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {teacher.email}
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
                                                onClick={() => remove(teacher)}
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
                                    <TableHead>IC</TableHead>
                                    <TableHead>{t('email')}</TableHead>
                                    <TableHead>{t('phone')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((teacher) => (
                                    <TableRow key={teacher.id}>
                                        <TableCell className="font-medium">{teacher.name}</TableCell>
                                        <TableCell>{teacher.ic_number ?? '—'}</TableCell>
                                        <TableCell>{teacher.email}</TableCell>
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
                                                onClick={() => remove(teacher)}
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
                            {editing ? `${t('edit')} ${t('teacher')}` : `${t('add')} ${t('teachers')}`}
                        </DialogTitle>
                    </DialogHeader>

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
                                <Label>IC</Label>
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
                            {!editing ? (
                                <div className="space-y-1 sm:col-span-2">
                                    <Label>{t('password')}</Label>
                                    <Input
                                        type="password"
                                        value={form.data.password}
                                        onChange={(e) => form.setData('password', e.target.value)}
                                    />
                                    {form.errors.password && (
                                        <p className="text-xs text-destructive">
                                            {form.errors.password}
                                        </p>
                                    )}
                                </div>
                            ) : (
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
                                            {['active', 'pending', 'rejected', 'awaiting'].map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {t(s)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
                            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                                <Upload className="size-5" />
                            </span>
                            <p className="text-sm font-medium">Import teachers from CSV</p>
                            <p className="max-w-sm text-xs text-muted-foreground">
                                Upload a CSV with columns: name, ic_number, phone, email.
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
                                {editing ? t('save') : `${t('add')} ${t('teacher')}`}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}
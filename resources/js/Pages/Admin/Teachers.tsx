import { router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { useI18n } from '@/lib/i18n';
import { adminNav } from '@/lib/navigation';
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
    const [editing, setEditing] = useState<Teacher | null>(null);

    const form = useForm({
        name: '',
        email: '',
        ic_number: '',
        phone: '',
        password: '',
        status: 'active',
    });

    const resetForm = () => {
        form.setData({
            name: '',
            email: '',
            ic_number: '',
            phone: '',
            password: '',
            status: 'active',
        });
    };

    const openCreate = () => {
        setEditing(null);
        resetForm();
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
        setOpen(true);
    };

    const submit = () => {
        if (editing) {
            form.put(route('admin.teachers.update', { user: editing.id }), {
                onSuccess: () => {
                    setOpen(false);
                    resetForm();
                },
            });
        } else {
            form.post(route('admin.teachers.store'), {
                onSuccess: () => {
                    setOpen(false);
                    resetForm();
                },
            });
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
        <AppShell nav={adminNav} title={t('admin')}>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('teachers')}</h1>
                <Button onClick={openCreate} className="gap-1">
                    <Plus className="size-4" />
                    {t('add')}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('teachers')}</CardTitle>
                    <CardDescription>{t('no_data')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {teachers.length === 0 ? (
                        <p className="py-8 text-center text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('name')}</TableHead>
                                    <TableHead>{t('email')}</TableHead>
                                    <TableHead>IC</TableHead>
                                    <TableHead>{t('phone')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {teachers.map((teacher) => (
                                    <TableRow key={teacher.id}>
                                        <TableCell className="font-medium">{teacher.name}</TableCell>
                                        <TableCell>{teacher.email}</TableCell>
                                        <TableCell>{teacher.ic_number ?? '—'}</TableCell>
                                        <TableCell>{teacher.phone ?? '—'}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={teacher.status === 'active' ? 'default' : 'secondary'}
                                            >
                                                {t(teacher.status)}
                                            </Badge>
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
                    )}
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? `${t('edit')} ${t('teacher')}` : `${t('add')} ${t('teacher')}`}
                        </DialogTitle>
                        <DialogDescription>
                            {editing ? '' : t('pending_approval')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label htmlFor="name">{t('name')}</Label>
                            <Input
                                id="name"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                            />
                            {form.errors.name && (
                                <p className="text-xs text-destructive">{form.errors.name}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="email">{t('email')}</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                            />
                            {form.errors.email && (
                                <p className="text-xs text-destructive">{form.errors.email}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="ic">IC</Label>
                                <Input
                                    id="ic"
                                    value={form.data.ic_number}
                                    onChange={(e) => form.setData('ic_number', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="phone">{t('phone')}</Label>
                                <Input
                                    id="phone"
                                    value={form.data.phone}
                                    onChange={(e) => form.setData('phone', e.target.value)}
                                />
                            </div>
                        </div>
                        {!editing && (
                            <div className="space-y-1">
                                <Label htmlFor="password">{t('password')}</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                />
                                {form.errors.password && (
                                    <p className="text-xs text-destructive">{form.errors.password}</p>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            {t('cancel')}
                        </Button>
                        <Button onClick={submit} disabled={form.processing}>
                            {t('save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}
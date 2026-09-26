import { router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
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
import { adminNav } from '@/lib/navigation';
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
    const [editing, setEditing] = useState<Student | null>(null);

    const form = useForm({
        name: '',
        age: '',
        class: '5tahun',
        parent_id: '',
    });

    const openCreate = () => {
        setEditing(null);
        form.reset();
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
        setOpen(true);
    };

    const submit = () => {
        if (editing) {
            form.put(route('admin.students.update', { student: editing.id }), {
                onSuccess: () => setOpen(false),
            });
        } else {
            form.post(route('admin.students.store'), {
                onSuccess: () => setOpen(false),
            });
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
        <AppShell nav={adminNav} title={t('admin')}>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('students')}</h1>
                <Button onClick={openCreate} className="gap-1">
                    <Plus className="size-4" />
                    {t('add')}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('students')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {students.length === 0 ? (
                        <p className="py-8 text-center text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('name')}</TableHead>
                                    <TableHead>Age</TableHead>
                                    <TableHead>{t('class')}</TableHead>
                                    <TableHead>{t('parent')}</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">{student.name}</TableCell>
                                        <TableCell>{student.age ?? '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{classLabel(student.class)}</Badge>
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
                    )}
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? `${t('edit')} ${t('student')}` : `${t('add')} ${t('student')}`}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label htmlFor="sname">{t('name')}</Label>
                            <Input
                                id="sname"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                            />
                            {form.errors.name && (
                                <p className="text-xs text-destructive">{form.errors.name}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="age">Age</Label>
                                <Input
                                    id="age"
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
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="parent">{t('parent')}</Label>
                            <Input
                                id="parent"
                                placeholder={t('parent_id') ?? 'Parent ID'}
                                value={form.data.parent_id}
                                onChange={(e) => form.setData('parent_id', e.target.value)}
                            />
                        </div>
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
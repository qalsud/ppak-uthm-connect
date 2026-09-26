import { router, useForm } from '@inertiajs/react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
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

type Record = {
    id: number;
    month: string;
    amount: string;
    overtime_hours: string;
    status: 'paid' | 'unpaid';
    paid_on: string | null;
    student: { id: number; name: string; class: string };
};

type Props = {
    records: Record[];
    months: string[];
    classes: string[];
    fee: { monthly_fee: string; overtime_rate: string };
    filters: { month: string; class: string };
};

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : c === '6bintang' ? '6 Bintang' : c);

export default function Payments({ records, months, classes, fee, filters }: Props) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);

    const addForm = useForm({
        student_id: '',
        month: '',
        overtime_hours: '0',
    });

    const submit = () => {
        addForm.post(route('admin.payments.store'), {
            onSuccess: () => {
                setOpen(false);
                addForm.reset();
            },
        });
    };

    const setStatus = (record: Record, status: 'paid' | 'unpaid') => {
        router.patch(
            route('admin.payments.status', { record: record.id }),
            { status },
            { preserveScroll: true },
        );
    };

    const remove = (record: Record) => {
        if (confirm(`${t('delete')} ${record.month}?`)) {
            router.delete(route('admin.payments.destroy', { record: record.id }), {
                preserveScroll: true,
            });
        }
    };

    const applyFilter = (key: 'month' | 'class', value: string) => {
        router.get(
            '/admin/payments',
            value ? { ...filters, [key]: value } : { ...filters, [key]: '' },
            { preserveState: true },
        );
    };

    const displayAmount = (amount: string) => Number(amount).toFixed(2);

    return (
        <AppShell nav={adminNav} title={t('admin')}>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('payments')}</h1>
                <Button onClick={() => setOpen(true)} className="gap-1">
                    <Plus className="size-4" />
                    {t('add')}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('payments')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                        <div className="w-44">
                            <Label className="mb-1 block text-xs">{t('month')}</Label>
                            <Select
                                value={filters.month}
                                onValueChange={(v) => applyFilter('month', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('month')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all">—</SelectItem>
                                    {months.map((m) => (
                                        <SelectItem key={m} value={m}>
                                            {m}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-44">
                            <Label className="mb-1 block text-xs">{t('class')}</Label>
                            <Select
                                value={filters.class}
                                onValueChange={(v) => applyFilter('class', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('class')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all">—</SelectItem>
                                    {classes.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {classLabel(c)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {records.length === 0 ? (
                        <p className="py-8 text-center text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('student')}</TableHead>
                                    <TableHead>{t('class')}</TableHead>
                                    <TableHead>{t('month')}</TableHead>
                                    <TableHead>{t('overtime')}</TableHead>
                                    <TableHead>{t('amount')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell className="font-medium">
                                            {record.student.name}
                                        </TableCell>
                                        <TableCell>{classLabel(record.student.class)}</TableCell>
                                        <TableCell>{record.month}</TableCell>
                                        <TableCell>{Number(record.overtime_hours)}h</TableCell>
                                        <TableCell>RM {displayAmount(record.amount)}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={record.status === 'paid' ? 'default' : 'secondary'}
                                                className={record.status === 'paid' ? 'bg-emerald-600' : ''}
                                            >
                                                {record.status === 'paid' ? 'Paid' : 'Unpaid'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {record.status === 'unpaid' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="mr-1 gap-1"
                                                    onClick={() => setStatus(record, 'paid')}
                                                >
                                                    <Check className="size-3" />
                                                    Paid
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="mr-1 gap-1"
                                                    onClick={() => setStatus(record, 'unpaid')}
                                                >
                                                    <X className="size-3" />
                                                    Unpaid
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive"
                                                onClick={() => remove(record)}
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

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>{t('add')} {t('payment')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-1">
                                <Label>{t('student')}</Label>
                                <Input
                                    list="students"
                                    placeholder={t('student_id')}
                                    value={addForm.data.student_id}
                                    onChange={(e) => addForm.setData('student_id', e.target.value)}
                                />
                                <datalist id="students" />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('month')}</Label>
                                <Select
                                    value={addForm.data.month}
                                    onValueChange={(v) => addForm.setData('month', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('month')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map((m) => (
                                            <SelectItem key={m} value={m}>
                                                {m}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('overtime')}</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={addForm.data.overtime_hours}
                                    onChange={(e) => addForm.setData('overtime_hours', e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('monthly_fee')}: RM {displayAmount(fee.monthly_fee)} ·{' '}
                                {t('overtime_rate')}: RM {displayAmount(fee.overtime_rate)}/h
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setOpen(false)}>
                                    {t('cancel')}
                                </Button>
                                <Button onClick={submit} disabled={addForm.processing}>
                                    {t('create')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </AppShell>
    );
}
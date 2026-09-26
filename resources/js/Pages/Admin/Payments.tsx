import { router, useForm } from '@inertiajs/react';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import { useState } from 'react';

import EmptyState from '@/Components/empty-state';
import PageHeader from '@/Components/page-header';
import StatusBadge from '@/Components/status-badge';
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

    const addForm = useForm({ student_id: '', month: '', overtime_hours: '0' });

    const submit = () =>
        addForm.post(route('admin.payments.store'), {
            onSuccess: () => {
                setOpen(false);
                addForm.reset();
            },
        });

    const setStatus = (record: Record, status: 'paid' | 'unpaid') =>
        router.patch(
            route('admin.payments.status', { record: record.id }),
            { status },
            { preserveScroll: true },
        );

    const remove = (record: Record) => {
        if (confirm(`${t('delete')} ${record.month}?`)) {
            router.delete(route('admin.payments.destroy', { record: record.id }), {
                preserveScroll: true,
            });
        }
    };

    const applyFilter = (key: 'month' | 'class', value: string) =>
        router.get(
            '/admin/payments',
            { ...filters, [key]: value === '__all' ? '' : value },
            { preserveState: true },
        );

    return (
        <AppShell nav={adminNav} title={t('admin')}>
            <PageHeader title={t('payments')} description="Track fees, overtime and receipts">
                <Button onClick={() => setOpen(true)} className="gap-1.5">
                    <Plus className="size-4" />
                    {t('add')} {t('payment')}
                </Button>
            </PageHeader>

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                    <Select value={filters.month || '__all'} onValueChange={(v) => applyFilter('month', v)}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('month')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all">All months</SelectItem>
                            {months.map((m) => (
                                <SelectItem key={m} value={m}>
                                    {m}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filters.class || '__all'} onValueChange={(v) => applyFilter('class', v)}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('class')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all">All classes</SelectItem>
                            {classes.map((c) => (
                                <SelectItem key={c} value={c}>
                                    {classLabel(c)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="ml-auto text-xs text-muted-foreground">
                        {t('monthly_fee')}: RM {Number(fee.monthly_fee).toFixed(2)} ·{' '}
                        {t('overtime_rate')}: RM {Number(fee.overtime_rate).toFixed(2)}/h
                    </span>
                </div>

                {records.length === 0 ? (
                    <EmptyState
                        icon={Receipt}
                        title="No payment records"
                        description="Add a payment record to start tracking fees."
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
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
                                        <TableCell>RM {Number(record.amount).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={record.status}
                                                label={record.status === 'paid' ? 'Paid' : 'Unpaid'}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="mr-1"
                                                onClick={() =>
                                                    setStatus(
                                                        record,
                                                        record.status === 'unpaid' ? 'paid' : 'unpaid',
                                                    )
                                                }
                                            >
                                                {record.status === 'unpaid' ? 'Mark paid' : 'Mark unpaid'}
                                            </Button>
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
                    </div>
                )}
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('add')} {t('payment')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>{t('student')} ID</Label>
                            <Input
                                value={addForm.data.student_id}
                                onChange={(e) => addForm.setData('student_id', e.target.value)}
                                placeholder="e.g. 1"
                            />
                            {addForm.errors.student_id && (
                                <p className="text-xs text-destructive">{addForm.errors.student_id}</p>
                            )}
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
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            {t('cancel')}
                        </Button>
                        <Button onClick={submit} disabled={addForm.processing}>
                            {t('create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}
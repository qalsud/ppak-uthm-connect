import { router, useForm } from '@inertiajs/react';
import { CalendarPlus, Plus, Receipt, Trash2 } from 'lucide-react';
import { useState } from 'react';

import ConfirmDialog from '@/Components/confirm-dialog';
import EmptyState from '@/Components/empty-state';
import PageHeader from '@/Components/page-header';
import StatCard from '@/Components/stat-card';
import StatusBadge from '@/Components/status-badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
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

type PaymentRecord = {
    id: number;
    month: string;
    amount: string;
    overtime_hours: string;
    status: 'paid' | 'unpaid';
    paid_on: string | null;
    student: { id: number; name: string; class: string };
};

type Props = {
    records: PaymentRecord[];
    months: string[];
    classes: string[];
    students: Array<{ id: number; name: string; class: string }>;
    fee: { monthly_fee: string; overtime_rate: string };
    summary: {
        collected_month: number;
        outstanding: number;
        unpaid_count: number;
        current_month: string;
    };
    filters: { month: string; class: string; status: string };
};

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : c === '6bintang' ? '6 Bintang' : c);

export default function Payments({ records, months, classes, students, fee, summary, filters }: Props) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [genOpen, setGenOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<PaymentRecord | null>(null);

    const addForm = useForm({ student_id: '', month: '', overtime_hours: '0' });
    const genForm = useForm({ month: summary.current_month });

    const submit = () =>
        addForm.post(route('admin.payments.store'), {
            onSuccess: () => {
                setOpen(false);
                addForm.reset();
            },
        });

    const generate = () =>
        genForm.post(route('admin.payments.generate'), {
            preserveScroll: true,
            onSuccess: () => setGenOpen(false),
        });

    const setStatus = (record: PaymentRecord, status: 'paid' | 'unpaid') =>
        router.patch(
            route('admin.payments.status', { record: record.id }),
            { status },
            { preserveScroll: true },
        );

    const confirmRemove = () => {
        if (!deleteTarget) {
            return;
        }

        router.delete(route('admin.payments.destroy', { record: deleteTarget.id }), {
            preserveScroll: true,
            onFinish: () => setDeleteTarget(null),
        });
    };

    const applyFilter = (key: 'month' | 'class' | 'status', value: string) =>
        router.get(
            '/admin/payments',
            { ...filters, [key]: value === '__all' ? '' : value },
            { preserveState: true, preserveScroll: true },
        );

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('payments')} description={t('track_fees_desc')}>
                <Button variant="outline" className="gap-1.5" onClick={() => setGenOpen(true)}>
                    <CalendarPlus className="size-4" />
                    {t('generate_fees')}
                </Button>
                <Button onClick={() => setOpen(true)} className="gap-1.5">
                    <Plus className="size-4" />
                    {t('add')} {t('payment')}
                </Button>
            </PageHeader>

            {/* Summary */}
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                    label={`${t('collected')} · ${summary.current_month}`}
                    value={`RM ${summary.collected_month.toFixed(2)}`}
                    icon={Receipt}
                />
                <StatCard
                    label={t('outstanding_total')}
                    value={`RM ${summary.outstanding.toFixed(2)}`}
                    icon={Receipt}
                />
                <StatCard
                    label={t('unpaid_records')}
                    value={summary.unpaid_count}
                    icon={Receipt}
                />
            </div>

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                    <Select value={filters.month || '__all'} onValueChange={(v) => applyFilter('month', v)}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('month')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all">{t('all_months')}</SelectItem>
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
                            <SelectItem value="__all">{t('all_classes')}</SelectItem>
                            {classes.map((c) => (
                                <SelectItem key={c} value={c}>
                                    {classLabel(c)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filters.status || '__all'} onValueChange={(v) => applyFilter('status', v)}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder={t('status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all">{t('status_all')}</SelectItem>
                            <SelectItem value="unpaid">{t('unpaid')}</SelectItem>
                            <SelectItem value="paid">{t('paid')}</SelectItem>
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
                        title={t('payments_empty_title')}
                        description={t('payments_empty_desc')}
                    />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-2 p-3 lg:hidden">
                            {records.map((record) => (
                                <div key={record.id} className="rounded-xl border p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{record.student.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {classLabel(record.student.class)} · {record.month}
                                            </p>
                                            <p className="text-sm font-semibold">
                                                RM {Number(record.amount).toFixed(2)}
                                                {Number(record.overtime_hours) > 0
                                                    ? ` · ${Number(record.overtime_hours)}h OT`
                                                    : ''}
                                            </p>
                                            {record.paid_on && (
                                                <p className="text-[11px] text-muted-foreground">
                                                    {t('paid_on')}: {record.paid_on}
                                                </p>
                                            )}
                                        </div>
                                        <StatusBadge
                                            status={record.status}
                                            label={record.status === 'paid' ? t('paid') : t('unpaid')}
                                        />
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() =>
                                                setStatus(record, record.status === 'unpaid' ? 'paid' : 'unpaid')
                                            }
                                        >
                                            {record.status === 'unpaid' ? t('mark_paid') : t('mark_unpaid')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive"
                                            onClick={() => setDeleteTarget(record)}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto lg:block">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>{t('student')}</TableHead>
                                        <TableHead>{t('class')}</TableHead>
                                        <TableHead>{t('month')}</TableHead>
                                        <TableHead>{t('overtime')}</TableHead>
                                        <TableHead>{t('amount')}</TableHead>
                                        <TableHead>{t('status')}</TableHead>
                                        <TableHead>{t('paid_on')}</TableHead>
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
                                                    label={record.status === 'paid' ? t('paid') : t('unpaid')}
                                                />
                                            </TableCell>
                                            <TableCell>{record.paid_on ?? '—'}</TableCell>
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
                                                    {record.status === 'unpaid' ? t('mark_paid') : t('mark_unpaid')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive"
                                                    onClick={() => setDeleteTarget(record)}
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

            {/* Add payment */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t('add')} {t('payment')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>{t('student')}</Label>
                            <Select
                                value={addForm.data.student_id}
                                onValueChange={(v) => addForm.setData('student_id', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('select_student')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map((s) => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                            {s.name} · {classLabel(s.class)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                            {addForm.errors.month && (
                                <p className="text-xs text-destructive">{addForm.errors.month}</p>
                            )}
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

            {/* Generate monthly fees */}
            <Dialog open={genOpen} onOpenChange={setGenOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('generate_fees')}</DialogTitle>
                        <DialogDescription>
                            {t('generate_fees_desc').replace(':month', genForm.data.month)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1">
                        <Label>{t('month')}</Label>
                        <Select value={genForm.data.month} onValueChange={(v) => genForm.setData('month', v)}>
                            <SelectTrigger>
                                <SelectValue />
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGenOpen(false)}>
                            {t('cancel')}
                        </Button>
                        <Button onClick={generate} disabled={genForm.processing}>
                            {t('generate')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(v) => !v && setDeleteTarget(null)}
                title={`${t('delete')} ${deleteTarget?.month ?? ''} ${t('payment').toLowerCase()}?`}
                description={t('cannot_be_undone')}
                confirmLabel={t('delete')}
                onConfirm={confirmRemove}
            />
        </AppShell>
    );
}

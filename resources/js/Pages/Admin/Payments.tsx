import { router, useForm } from '@inertiajs/react';
import { CalendarPlus, Pencil, Plus, Receipt, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import ConfirmDialog from '@/Components/confirm-dialog';
import EmptyState from '@/Components/empty-state';
import FormDialog from '@/Components/form-dialog';
import PageHeader from '@/Components/page-header';
import Pagination from '@/Components/pagination';
import StatCard from '@/Components/stat-card';
import StatusBadge from '@/Components/status-badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { FormField } from '@/Components/ui/form-field';
import { Input } from '@/Components/ui/input';
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
import { useClassLabel as useClassLabelHook } from '@/lib/lists';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import type { Paginator } from '@/types';
import AppShell from '@/Layouts/app-shell';

type PaymentRecord = {
    id: number;
    month: string;
    amount: string;
    overtime_hours: string;
    status: 'paid' | 'unpaid';
    paid_on: string | null;
    due_on: string | null;
    student: { id: number; name: string; class: string };
};

type Props = {
    records: Paginator<PaymentRecord>;
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
    filters: { month: string; class: string; status: string; search: string };
};


export default function Payments({ records, months, classes, students, fee, summary, filters }: Props) {
    const { t } = useI18n();
    const classLabel = useClassLabelHook();
    const [open, setOpen] = useState(false);
    const [genOpen, setGenOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<PaymentRecord | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PaymentRecord | null>(null);
    const [search, setSearch] = useState(filters.search);
    const firstRender = useRef(true);

    const rows = records.data;

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;

            return;
        }

        const id = setTimeout(() => {
            if (search !== filters.search) {
                router.get(
                    '/admin/payments',
                    { ...filters, search },
                    { preserveState: true, preserveScroll: true, replace: true },
                );
            }
        }, 350);

        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const addForm = useForm({ student_id: '', month: '', overtime_hours: '0' });
    const genForm = useForm({ month: summary.current_month });
    const editForm = useForm({ month: '', amount: '', overtime_hours: '0', due_on: '' });

    const submit = () =>
        addForm.post(route('admin.payments.store'), {
            onSuccess: () => {
                setOpen(false);
                addForm.reset();
            },
        });

    const openEdit = (record: PaymentRecord) => {
        setEditTarget(record);
        editForm.setData({
            month: record.month,
            amount: String(record.amount),
            overtime_hours: String(record.overtime_hours),
            due_on: record.due_on ?? '',
        });
        editForm.clearErrors();
    };

    const submitEdit = () => {
        if (!editTarget) {
            return;
        }

        editForm.put(route('admin.payments.update', { record: editTarget.id }), {
            preserveScroll: true,
            onSuccess: () => setEditTarget(null),
        });
    };

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
                    <div className="relative w-full min-w-56 sm:w-auto sm:flex-1">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('search_students')}
                            className="pl-9"
                        />
                    </div>
                </div>

                {rows.length === 0 ? (
                    <EmptyState
                        icon={Receipt}
                        title={t('payments_empty_title')}
                        description={t('payments_empty_desc')}
                    />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-2 p-3 lg:hidden">
                            {rows.map((record) => (
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
                                        {record.status === 'paid' && (
                                            <Button size="sm" variant="ghost" asChild title={t('view_receipt')}>
                                                <a
                                                    href={route('admin.payments.receipt', { record: record.id })}
                                                    className="gap-1"
                                                >
                                                    <Receipt className="size-4" />
                                                </a>
                                            </Button>
                                        )}
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
                                            onClick={() => openEdit(record)}
                                            title={t('edit')}
                                        >
                                            <Pencil className="size-4" />
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
                                    {rows.map((record) => (
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
                                                {record.status === 'paid' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        asChild
                                                        title={t('view_receipt')}
                                                    >
                                                        <a
                                                            href={route('admin.payments.receipt', {
                                                                record: record.id,
                                                            })}
                                                        >
                                                            <Receipt className="size-4" />
                                                        </a>
                                                    </Button>
                                                )}
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

                        <Pagination
                            links={records.links}
                            from={records.from}
                            to={records.to}
                            total={records.total}
                        />
                    </>
                )}
            </Card>

            {/* Add payment */}
            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={`${t('add')} ${t('payment')}`}
                onSubmit={submit}
                submitLabel={t('create')}
                processing={addForm.processing}
                maxWidth="max-w-lg"
            >
                <FormField label={t('student')} error={addForm.errors.student_id}>
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
                </FormField>

                <FormField label={t('month')} error={addForm.errors.month}>
                    <Select value={addForm.data.month} onValueChange={(v) => addForm.setData('month', v)}>
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
                </FormField>

                <FormField label={t('overtime')}>
                    <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={addForm.data.overtime_hours}
                        onChange={(e) => addForm.setData('overtime_hours', e.target.value)}
                    />
                </FormField>
            </FormDialog>

            {/* Edit payment */}
            <FormDialog
                open={editTarget !== null}
                onOpenChange={(v) => !v && setEditTarget(null)}
                title={`${t('edit')} ${t('payment')}`}
                description={editTarget?.student.name}
                onSubmit={submitEdit}
                submitLabel={t('save')}
                processing={editForm.processing}
                maxWidth="max-w-lg"
            >
                <FormField label={t('month')} error={editForm.errors.month}>
                    <Select value={editForm.data.month} onValueChange={(v) => editForm.setData('month', v)}>
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
                </FormField>

                <FormField label={`${t('amount')} (RM)`} error={editForm.errors.amount}>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.data.amount}
                        onChange={(e) => editForm.setData('amount', e.target.value)}
                    />
                </FormField>

                <FormField label={t('overtime')} error={editForm.errors.overtime_hours}>
                    <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={editForm.data.overtime_hours}
                        onChange={(e) => editForm.setData('overtime_hours', e.target.value)}
                    />
                </FormField>

                <FormField label={t('due_on')} error={editForm.errors.due_on}>
                    <Input
                        type="date"
                        value={editForm.data.due_on}
                        onChange={(e) => editForm.setData('due_on', e.target.value)}
                    />
                </FormField>
            </FormDialog>

            {/* Generate monthly fees */}
            <FormDialog
                open={genOpen}
                onOpenChange={setGenOpen}
                title={t('generate_fees')}
                description={t('generate_fees_desc').replace(':month', genForm.data.month)}
                onSubmit={generate}
                submitLabel={t('generate')}
                processing={genForm.processing}
                maxWidth="max-w-lg"
            >
                <FormField label={t('month')}>
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
                </FormField>
            </FormDialog>

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

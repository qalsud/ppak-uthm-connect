import { router, useForm } from '@inertiajs/react';
import { CreditCard, Eye, RotateCcw, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import EmptyState from '@/Components/empty-state';
import FormDialog from '@/Components/form-dialog';
import PageHeader from '@/Components/page-header';
import Pagination from '@/Components/pagination';
import StatCard from '@/Components/stat-card';
import StatusBadge from '@/Components/status-badge';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
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
import { formatDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import type { Paginator } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Covered = { id: number; month: string; amount: number; status: string };

type Payment = {
    id: number;
    amount: string;
    status: 'pending' | 'paid' | 'refunded' | 'failed';
    paid_at: string | null;
    refunded_at: string | null;
    refunded_amount: string | null;
    refund_reason: string | null;
    stripe_session_id: string | null;
    student: { id: number; name: string; class: string } | null;
    user: { id: number; name: string; email: string } | null;
    covered: Covered[];
};

type Props = {
    payments: Paginator<Payment>;
    signals: {
        collected: number;
        refunded: number;
        paid_count: number;
        refunded_count: number;
    };
    stripeConfigured: boolean;
    filters: { status: string; search: string };
};

const STATUSES = ['pending', 'paid', 'refunded', 'failed'] as const;

const variant = (status: Payment['status']) =>
    status === 'paid' ? 'paid' : status === 'pending' ? 'pending' : status === 'failed' ? 'rejected' : 'neutral';

export default function Transactions({ payments, signals, stripeConfigured, filters }: Props) {
    const { t } = useI18n();
    const [target, setTarget] = useState<Payment | null>(null);
    const [search, setSearch] = useState(filters.search);
    const firstRender = useRef(true);

    const rows = payments.data;

    const refundForm = useForm({ reason: '' });

    const visit = (params: Partial<{ status: string; search: string }>) =>
        router.get(
            '/admin/transactions',
            {
                status: params.status ?? filters.status,
                search: params.search ?? search,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );

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

    const openDetail = (payment: Payment) => {
        refundForm.reset();
        refundForm.clearErrors();
        setTarget(payment);
    };

    const refundable = target?.status === 'paid' && stripeConfigured;

    const submit = () => {
        if (!target) {
            return;
        }

        if (!refundable) {
            setTarget(null);

            return;
        }

        refundForm.post(route('admin.transactions.refund', { payment: target.id }), {
            preserveScroll: true,
            onSuccess: () => setTarget(null),
        });
    };

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('transactions')} description={t('transactions_desc')} />

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label={t('collected')} value={`RM ${signals.collected.toFixed(2)}`} icon={CreditCard} />
                <StatCard label={t('refunded_total')} value={`RM ${signals.refunded.toFixed(2)}`} icon={RotateCcw} />
                <StatCard label={t('paid')} value={signals.paid_count} icon={CreditCard} />
            </div>

            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                    <Select value={filters.status || '__all'} onValueChange={(v) => visit({ status: v === '__all' ? '' : v })}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all">{t('status_all')}</SelectItem>
                            {STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {t(s, s)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                        icon={CreditCard}
                        title={t('no_transactions_title')}
                        description={t('no_transactions_desc')}
                    />
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-2 p-3 lg:hidden">
                            {rows.map((payment) => (
                                <button
                                    key={payment.id}
                                    type="button"
                                    onClick={() => openDetail(payment)}
                                    className="flex w-full items-start justify-between gap-2 rounded-xl border p-3 text-left"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">{payment.student?.name ?? '—'}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {payment.user?.name ?? '—'}
                                            {payment.paid_at ? ` · ${formatDate(payment.paid_at)}` : ''}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold">
                                            RM {Number(payment.amount).toFixed(2)}
                                        </p>
                                    </div>
                                    <StatusBadge
                                        status={variant(payment.status)}
                                        label={t(payment.status, payment.status)}
                                    />
                                </button>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto lg:block">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>{t('date')}</TableHead>
                                        <TableHead>{t('student')}</TableHead>
                                        <TableHead>{t('parent')}</TableHead>
                                        <TableHead>{t('amount')}</TableHead>
                                        <TableHead>{t('status')}</TableHead>
                                        <TableHead className="text-right">{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell>
                                                {payment.paid_at ? formatDate(payment.paid_at) : '—'}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {payment.student?.name ?? '—'}
                                            </TableCell>
                                            <TableCell>{payment.user?.name ?? '—'}</TableCell>
                                            <TableCell>RM {Number(payment.amount).toFixed(2)}</TableCell>
                                            <TableCell>
                                                <StatusBadge
                                                    status={variant(payment.status)}
                                                    label={t(payment.status, payment.status)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost" onClick={() => openDetail(payment)}>
                                                    <Eye className="size-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <Pagination
                            links={payments.links}
                            from={payments.from}
                            to={payments.to}
                            total={payments.total}
                        />
                    </>
                )}
            </Card>

            <FormDialog
                open={target !== null}
                onOpenChange={(v) => !v && setTarget(null)}
                title={`${t('transaction')} #${target?.id ?? ''}`}
                onSubmit={submit}
                submitLabel={refundable ? t('refund') : t('dismiss')}
                processing={refundForm.processing}
                maxWidth="max-w-lg"
            >
                {target && (
                    <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <p className="text-[11px] text-muted-foreground">{t('student')}</p>
                                <p className="font-medium">{target.student?.name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground">{t('parent')}</p>
                                <p className="font-medium">{target.user?.name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground">{t('amount')}</p>
                                <p className="font-medium">RM {Number(target.amount).toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground">{t('status')}</p>
                                <StatusBadge status={variant(target.status)} label={t(target.status, target.status)} />
                            </div>
                        </div>

                        {target.stripe_session_id && (
                            <div>
                                <p className="text-[11px] text-muted-foreground">{t('session')}</p>
                                <p className="truncate font-mono text-xs">{target.stripe_session_id}</p>
                            </div>
                        )}

                        <div>
                            <p className="mb-1 text-[11px] text-muted-foreground">{t('covered_months')}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {target.covered.length > 0 ? (
                                    target.covered.map((c) => (
                                        <span
                                            key={c.id}
                                            className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium"
                                        >
                                            {c.month} · RM {c.amount.toFixed(2)}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                )}
                            </div>
                        </div>

                        {target.status === 'refunded' && (
                            <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                                {t('refunded')}
                                {target.refunded_at ? ` · ${formatDate(target.refunded_at)}` : ''}
                                {target.refund_reason ? ` · ${target.refund_reason}` : ''}
                            </p>
                        )}

                        {refundable && (
                            <>
                                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                    {t('refund_confirm')}
                                </p>
                                <FormField label={t('refund_reason')} error={refundForm.errors.reason}>
                                    <Input
                                        value={refundForm.data.reason}
                                        onChange={(e) => refundForm.setData('reason', e.target.value)}
                                    />
                                </FormField>
                            </>
                        )}

                        {target.status === 'paid' && !stripeConfigured && (
                            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                {t('payments.refund_unavailable')}
                            </p>
                        )}
                    </div>
                )}
            </FormDialog>
        </AppShell>
    );
}

import { router } from '@inertiajs/react';
import { CreditCard, Wallet } from 'lucide-react';
import { useState } from 'react';

import PageHeader from '@/Components/page-header';
import StatusBadge from '@/Components/status-badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { localDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { parentBottomNav, parentNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type FeeRecord = {
    id: number;
    month: string;
    amount: string;
    overtime_hours: string;
    due_on: string | null;
    status: 'paid' | 'unpaid';
    paid_on: string | null;
};

type Child = {
    id: number;
    name: string;
    class: string;
    totals: { unpaid: number; paid: number };
    financial_records: FeeRecord[];
};

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : '6 Bintang');

export default function ParentFinancials({
    children,
    fee,
}: {
    children: Child[];
    fee: { monthly_fee: string; overtime_rate: string };
}) {
    const { t } = useI18n();
    const [paying, setPaying] = useState<number | null>(null);
    const [selected, setSelected] = useState<Record<number, number[]>>({});
    const today = localDate();

    const toggle = (childId: number, recordId: number) =>
        setSelected((prev) => {
            const list = prev[childId] ?? [];

            return {
                ...prev,
                [childId]: list.includes(recordId)
                    ? list.filter((x) => x !== recordId)
                    : [...list, recordId],
            };
        });

    const selectedIds = (child: Child) =>
        (selected[child.id] ?? []).filter((id) =>
            child.financial_records.some((r) => r.id === id && r.status === 'unpaid'),
        );

    const selectedTotal = (child: Child) =>
        child.financial_records
            .filter((r) => selectedIds(child).includes(r.id))
            .reduce((sum, r) => sum + Number(r.amount), 0);

    const checkout = (child: Child) => {
        const ids = selectedIds(child);

        setPaying(child.id);
        router.post(
            route('parent.payments.checkout'),
            ids.length > 0 ? { student_id: child.id, record_ids: ids } : { student_id: child.id },
            { preserveScroll: true, onFinish: () => setPaying(null) },
        );
    };

    return (
        <AppShell nav={parentNav} bottomNav={parentBottomNav} title={t('parent')}>
            <PageHeader
                title={t('financials')}
                description={`${t('monthly_fee')} RM ${Number(fee.monthly_fee).toFixed(0)} · ${t('overtime_rate')} RM ${Number(fee.overtime_rate).toFixed(0)}/h`}
            />

            <div className="space-y-4">
                {children.map((child) => {
                    const ids = selectedIds(child);
                    const total = selectedTotal(child);

                    return (
                        <Card key={child.id} className="rounded-2xl border-0 shadow-sm">
                            <CardContent className="space-y-4 pt-5">
                                {/* Balance header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">{child.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {classLabel(child.class)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] text-muted-foreground">
                                            {t('outstanding')}
                                        </p>
                                        <p
                                            className={`text-xl font-bold ${
                                                child.totals.unpaid > 0 ? 'text-amber-600' : 'text-emerald-600'
                                            }`}
                                        >
                                            RM {child.totals.unpaid.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                {child.totals.unpaid > 0 && (
                                    <Button
                                        onClick={() => checkout(child)}
                                        disabled={paying === child.id}
                                        className="h-11 w-full rounded-xl font-semibold"
                                    >
                                        <CreditCard className="mr-2 size-4" />
                                        {paying === child.id
                                            ? 'Redirecting…'
                                            : ids.length > 0
                                              ? `${t('pay_selected')} · RM ${total.toFixed(2)}`
                                              : `${t('pay_all')} · RM ${child.totals.unpaid.toFixed(2)}`}
                                    </Button>
                                )}

                                {/* Records */}
                                <div className="divide-y rounded-xl border">
                                    {child.financial_records.length === 0 ? (
                                        <p className="py-6 text-center text-sm text-muted-foreground">
                                            {t('no_data')}
                                        </p>
                                    ) : (
                                        child.financial_records.map((r) => {
                                            const overdue = r.status === 'unpaid' && r.due_on && r.due_on < today;

                                            return (
                                                <label
                                                    key={r.id}
                                                    className="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-3"
                                                >
                                                    <div className="flex min-w-0 items-start gap-2.5">
                                                        {r.status === 'unpaid' && (
                                                            <input
                                                                type="checkbox"
                                                                className="mt-1 size-4 shrink-0 accent-primary"
                                                                checked={ids.includes(r.id)}
                                                                onChange={() => toggle(child.id, r.id)}
                                                            />
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium">{r.month}</p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                RM {Number(r.amount).toFixed(2)}
                                                                {Number(r.overtime_hours) > 0
                                                                    ? ` · ${Number(r.overtime_hours)}h OT`
                                                                    : ''}
                                                                {r.due_on && r.status === 'unpaid'
                                                                    ? ` · ${t('due_on')} ${r.due_on}`
                                                                    : ''}
                                                                {r.paid_on
                                                                    ? ` · ${t('paid')} ${r.paid_on}`
                                                                    : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="flex shrink-0 items-center gap-1.5">
                                                        {overdue && (
                                                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                                                {t('overdue')}
                                                            </span>
                                                        )}
                                                        <StatusBadge
                                                            status={r.status}
                                                            label={r.status === 'paid' ? t('paid') : t('unpaid')}
                                                        />
                                                    </span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {children.length === 0 && (
                    <Card className="rounded-2xl border-0 shadow-sm">
                        <CardContent className="flex flex-col items-center gap-2 py-14 text-muted-foreground">
                            <Wallet className="size-6" />
                            <p className="text-sm">{t('no_data')}</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppShell>
    );
}

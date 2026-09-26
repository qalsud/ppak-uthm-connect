import { router } from '@inertiajs/react';
import { CreditCard, Wallet } from 'lucide-react';
import { useState } from 'react';

import PageHeader from '@/Components/page-header';
import StatusBadge from '@/Components/status-badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { useI18n } from '@/lib/i18n';
import { parentBottomNav, parentNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Record = {
    id: number;
    month: string;
    amount: string;
    overtime_hours: string;
    status: 'paid' | 'unpaid';
    paid_on: string | null;
};

type Child = {
    id: number;
    name: string;
    class: string;
    totals: { unpaid: number; paid: number };
    financial_records: Record[];
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

    const checkout = (studentId: number) => {
        setPaying(studentId);
        router.post(
            route('parent.payments.checkout'),
            { student_id: studentId },
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
                {children.map((child) => (
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
                                    onClick={() => checkout(child.id)}
                                    disabled={paying === child.id}
                                    className="h-11 w-full rounded-xl font-semibold"
                                >
                                    <CreditCard className="mr-2 size-4" />
                                    {paying === child.id
                                        ? 'Redirecting…'
                                        : `Pay RM ${child.totals.unpaid.toFixed(2)}`}
                                </Button>
                            )}

                            {/* Records */}
                            <div className="divide-y rounded-xl border">
                                {child.financial_records.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-muted-foreground">
                                        {t('no_data')}
                                    </p>
                                ) : (
                                    child.financial_records.map((r) => (
                                        <div
                                            key={r.id}
                                            className="flex items-center justify-between gap-3 px-3.5 py-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium">{r.month}</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    RM {Number(r.amount).toFixed(2)}
                                                    {Number(r.overtime_hours) > 0
                                                        ? ` · ${Number(r.overtime_hours)}h OT`
                                                        : ''}
                                                    {r.paid_on
                                                        ? ` · paid ${new Date(r.paid_on).toLocaleDateString()}`
                                                        : ''}
                                                </p>
                                            </div>
                                            <StatusBadge
                                                status={r.status}
                                                label={r.status === 'paid' ? 'Paid' : 'Unpaid'}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}

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
import { router } from '@inertiajs/react';
import { CreditCard } from 'lucide-react';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { useI18n } from '@/lib/i18n';
import PageHeader from '@/Components/page-header';
import { parentNav } from '@/lib/navigation';
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
        <AppShell nav={parentNav} title={t('parent')}>
            <PageHeader title={t('financials')} description="Monthly fees, overtime and receipts" />
            <p className="mb-6 text-sm text-muted-foreground">
                {t('monthly_fee')}: RM {Number(fee.monthly_fee).toFixed(2)} · {t('overtime_rate')}: RM{' '}
                {Number(fee.overtime_rate).toFixed(2)}/h
            </p>

            <div className="space-y-6">
                {children.map((child) => (
                    <Card key={child.id}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">{child.name}</CardTitle>
                                    <CardDescription>{classLabel(child.class)}</CardDescription>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground">
                                        {t('outstanding')}
                                    </p>
                                    <p className="text-xl font-bold text-amber-600">
                                        RM {child.totals.unpaid.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {child.financial_records.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">
                                    {t('no_data')}
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('month')}</TableHead>
                                            <TableHead>{t('overtime')}</TableHead>
                                            <TableHead>{t('amount')}</TableHead>
                                            <TableHead>{t('status')}</TableHead>
                                            <TableHead>{t('paid_on')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {child.financial_records.map((r) => (
                                            <TableRow key={r.id}>
                                                <TableCell>{r.month}</TableCell>
                                                <TableCell>{Number(r.overtime_hours)}h</TableCell>
                                                <TableCell>RM {Number(r.amount).toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={r.status === 'paid' ? 'default' : 'secondary'}
                                                        className={r.status === 'paid' ? 'bg-emerald-600' : ''}
                                                    >
                                                        {r.status === 'paid' ? 'Paid' : 'Unpaid'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {r.paid_on ? new Date(r.paid_on).toLocaleDateString() : '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {child.totals.unpaid > 0 && (
                                <div className="mt-4 flex justify-end">
                                    <Button onClick={() => checkout(child.id)} disabled={paying === child.id} className="gap-2">
                                        <CreditCard className="size-4" />
                                        {paying === child.id ? '...' : t('pay')} RM {child.totals.unpaid.toFixed(2)}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </AppShell>
    );
}
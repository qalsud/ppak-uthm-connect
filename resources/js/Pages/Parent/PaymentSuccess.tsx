import { CheckCircle2, Download } from 'lucide-react';

import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { useI18n } from '@/lib/i18n';
import { parentNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Payment = {
    id: number;
    amount: string;
    status: 'pending' | 'paid';
    paid_at: string | null;
    student: { name: string };
};

type Record = { id: number; month: string; amount: string; paid_on: string | null };

export default function PaymentSuccess({
    payment,
    records,
}: {
    payment: Payment;
    records: Record[];
}) {
    const { t } = useI18n();
    const paid = payment.status === 'paid';

    return (
        <AppShell nav={parentNav} title={t('parent')}>
            <div className="mx-auto max-w-2xl space-y-6">
                <Card>
                    <CardHeader className="items-center text-center">
                        <CheckCircle2
                            className={`mb-2 size-12 ${paid ? 'text-emerald-500' : 'text-amber-500'}`}
                        />
                        <CardTitle className="text-xl">
                            {paid ? 'Payment Successful' : 'Payment Under Review'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('student')}</span>
                            <span className="font-medium">{payment.student.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('amount')}</span>
                            <span className="font-bold">RM {Number(payment.amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('status')}</span>
                            <Badge variant={paid ? 'default' : 'secondary'} className={paid ? 'bg-emerald-600' : ''}>
                                {payment.status}
                            </Badge>
                        </div>
                        {payment.paid_at && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('payments.paid_on')}</span>
                                <span>{new Date(payment.paid_at).toLocaleString()}</span>
                            </div>
                        )}

                        {paid && (
                            <Button asChild className="w-full gap-2">
                                <a href={route('parent.payments.receipt', { payment: payment.id })} target="_blank">
                                    <Download className="size-4" />
                                    {t('payments.download')}
                                </a>
                            </Button>
                        )}
                        {!paid && (
                            <p className="rounded bg-amber-50 p-3 text-xs text-amber-700">
                                {t('payments.not_paid')}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {records.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('financials')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('month')}</TableHead>
                                        <TableHead>{t('amount')}</TableHead>
                                        <TableHead>{t('payments.paid_on')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell>{r.month}</TableCell>
                                            <TableCell>RM {Number(r.amount).toFixed(2)}</TableCell>
                                            <TableCell>
                                                {r.paid_on ? new Date(r.paid_on).toLocaleDateString() : '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppShell>
    );
}
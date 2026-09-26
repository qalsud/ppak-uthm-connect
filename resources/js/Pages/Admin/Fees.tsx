import { useForm } from '@inertiajs/react';
import { Calculator, Save } from 'lucide-react';

import PageHeader from '@/Components/page-header';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { formatDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Fee = { monthly_fee: string; overtime_rate: string; updated_at?: string };

export default function Fees({ fee }: { fee: Fee }) {
    const { t } = useI18n();

    const form = useForm({
        monthly_fee: parseFloat(fee.monthly_fee).toString(),
        overtime_rate: parseFloat(fee.overtime_rate).toString(),
    });

    const submit = () => form.put(route('admin.fees.update'));

    const monthly = parseFloat(form.data.monthly_fee) || 0;
    const overtime = parseFloat(form.data.overtime_rate) || 0;
    const example = monthly + overtime * 2;

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('fee_settings')} description={t('set_fee_desc')} />

            <div className="grid max-w-3xl gap-4 lg:grid-cols-2">
                <Card className="rounded-2xl border-0 shadow-sm">
                    <CardContent className="space-y-4 pt-6">
                        <div className="space-y-1.5">
                            <Label htmlFor="fee">{t('monthly_fee')} (RM)</Label>
                            <Input
                                id="fee"
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.data.monthly_fee}
                                onChange={(e) => form.setData('monthly_fee', e.target.value)}
                            />
                            {form.errors.monthly_fee && (
                                <p className="text-xs text-destructive">{form.errors.monthly_fee}</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="ot">{t('overtime_rate')} (RM / hour)</Label>
                            <Input
                                id="ot"
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.data.overtime_rate}
                                onChange={(e) => form.setData('overtime_rate', e.target.value)}
                            />
                            {form.errors.overtime_rate && (
                                <p className="text-xs text-destructive">{form.errors.overtime_rate}</p>
                            )}
                        </div>
                        <Button onClick={submit} disabled={form.processing} className="gap-1.5">
                            <Save className="size-4" />
                            {t('save')}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Calculator className="size-4 text-primary" />
                            {t('example')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                            <span className="text-muted-foreground">{t('monthly_fee')}</span>
                            <span className="font-medium">RM {monthly.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                            <span className="text-muted-foreground">{t('overtime')} (2h)</span>
                            <span className="font-medium">RM {(overtime * 2).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2">
                            <span className="font-medium">{t('amount')}</span>
                            <span className="font-bold">RM {example.toFixed(2)}</span>
                        </div>
                        {fee.updated_at && (
                            <p className="pt-1 text-xs text-muted-foreground">
                                {t('updated')}: {formatDate(fee.updated_at)}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}

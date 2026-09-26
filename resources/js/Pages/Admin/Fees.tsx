import { useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';

import PageHeader from '@/Components/page-header';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { useI18n } from '@/lib/i18n';
import { adminNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Fee = { monthly_fee: string; overtime_rate: string };

export default function Fees({ fee }: { fee: Fee }) {
    const { t } = useI18n();

    const form = useForm({
        monthly_fee: parseFloat(fee.monthly_fee).toString(),
        overtime_rate: parseFloat(fee.overtime_rate).toString(),
    });

    const submit = () => form.put(route('admin.fees.update'));

    return (
        <AppShell nav={adminNav} title={t('admin')}>
            <PageHeader title={t('fee_settings')} description="Set the monthly fee and overtime rate" />

            <Card className="max-w-xl rounded-2xl border-0 shadow-sm">
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
                            <p className="text-xs text-destructive">
                                {form.errors.overtime_rate}
                            </p>
                        )}
                    </div>
                    <Button onClick={submit} disabled={form.processing} className="gap-1.5">
                        <Save className="size-4" />
                        {t('save')}
                    </Button>
                </CardContent>
            </Card>
        </AppShell>
    );
}
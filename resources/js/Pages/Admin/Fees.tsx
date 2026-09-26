import { useForm } from '@inertiajs/react';

import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { useI18n } from '@/lib/i18n';
import { adminNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Fee = {
    monthly_fee: string;
    overtime_rate: string;
};

export default function Fees({ fee }: { fee: Fee }) {
    const { t } = useI18n();

    const form = useForm({
        monthly_fee: parseFloat(fee.monthly_fee).toString(),
        overtime_rate: parseFloat(fee.overtime_rate).toString(),
    });

    const submit = () => {
        form.put(route('admin.fees.update'));
    };

    return (
        <AppShell nav={adminNav} title={t('admin')}>
            <h1 className="mb-6 text-2xl font-bold">{t('fee_settings')}</h1>

            <Card className="max-w-lg">
                <CardHeader>
                    <CardTitle>{t('fee_settings')}</CardTitle>
                    <CardDescription>RM310 / RM6</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="fee">{t('monthly_fee')}</Label>
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
                    <div className="space-y-1">
                        <Label htmlFor="ot">{t('overtime_rate')}</Label>
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
                    <Button onClick={submit} disabled={form.processing}>
                        {t('save')}
                    </Button>
                </CardContent>
            </Card>
        </AppShell>
    );
}
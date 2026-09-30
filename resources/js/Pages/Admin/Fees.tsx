import { router, useForm } from '@inertiajs/react';
import { Calculator, History, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import PageHeader from '@/Components/page-header';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { FormField } from '@/Components/ui/form-field';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { formatDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Current = {
    id: number | null;
    monthly_fee: number;
    overtime_rate: number;
    inherited: boolean;
};

type FeeRow = {
    id: number;
    centre_id: number | null;
    centre: string | null;
    monthly_fee: number;
    overtime_rate: number;
    is_active: boolean;
    updated_at: string | null;
};

type Props = {
    feeSettings: FeeRow[];
    centres: Array<{ id: number; name: string; short_name: string | null }>;
    activeCentreId: number | null;
    current: { global: Current; perCentre: Record<string, Current> };
};

export default function Fees({ feeSettings, centres, activeCentreId, current }: Props) {
    const { t } = useI18n();
    const [scope, setScope] = useState<string>(activeCentreId ? String(activeCentreId) : 'global');

    const currentFor = (value: string): Current =>
        value === 'global' ? current.global : current.perCentre[value] ?? current.global;

    const form = useForm({
        centre_id: scope === 'global' ? '' : scope,
        monthly_fee: String(currentFor(scope).monthly_fee),
        overtime_rate: String(currentFor(scope).overtime_rate),
    });

    useEffect(() => {
        const scoped = currentFor(scope);

        form.setData({
            centre_id: scope === 'global' ? '' : scope,
            monthly_fee: String(scoped.monthly_fee),
            overtime_rate: String(scoped.overtime_rate),
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scope]);

    const save = () => form.put(route('admin.fees.update'), { preserveScroll: true });

    const newVersion = () => form.post(route('admin.fees.store'), { preserveScroll: true });

    const deactivate = (fee: FeeRow) =>
        router.delete(route('admin.fees.destroy', { fee: fee.id }), { preserveScroll: true });

    const monthly = parseFloat(form.data.monthly_fee) || 0;
    const overtime = parseFloat(form.data.overtime_rate) || 0;
    const example = monthly + overtime * 2;
    const scoped = currentFor(scope);

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('fee_settings')} description={t('set_fee_desc')} />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Label className="text-xs text-muted-foreground">{t('fee_rate_for')}</Label>
                <Select value={scope} onValueChange={setScope}>
                    <SelectTrigger className="w-56">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="global">{t('global_rate')}</SelectItem>
                        {centres.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                                {c.short_name ?? c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {scoped.inherited && (
                    <Badge variant="secondary">{t('inherits_global')}</Badge>
                )}
            </div>

            <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
                <Card className="rounded-2xl border-0 shadow-sm">
                    <CardContent className="space-y-4 pt-6">
                        <FormField label={`${t('monthly_fee')} (RM)`} error={form.errors.monthly_fee}>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.data.monthly_fee}
                                onChange={(e) => form.setData('monthly_fee', e.target.value)}
                            />
                        </FormField>
                        <FormField label={`${t('overtime_rate')} (RM / ${t('overtime').toLowerCase()})`} error={form.errors.overtime_rate}>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.data.overtime_rate}
                                onChange={(e) => form.setData('overtime_rate', e.target.value)}
                            />
                        </FormField>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button onClick={save} disabled={form.processing} className="gap-1.5">
                                <Save className="size-4" />
                                {t('save')}
                            </Button>
                            <Button
                                onClick={newVersion}
                                disabled={form.processing}
                                variant="outline"
                                title={t('new_version_hint')}
                            >
                                {t('save_new_version')}
                            </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{t('new_version_hint')}</p>
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
                    </CardContent>
                </Card>
            </div>

            {/* Rate history */}
            <Card className="mt-4 max-w-4xl rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <History className="size-4 text-primary" />
                        {t('rate_history')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {feeSettings.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        feeSettings.map((fee) => (
                            <div
                                key={fee.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                        {fee.centre ?? t('global_rate')}
                                        {fee.is_active && (
                                            <Badge variant="secondary" className="ml-2 text-[10px]">
                                                {t('active')}
                                            </Badge>
                                        )}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        RM {fee.monthly_fee.toFixed(2)} · {t('overtime_rate')}: RM{' '}
                                        {fee.overtime_rate.toFixed(2)}/h
                                        {fee.updated_at ? ` · ${formatDate(fee.updated_at)}` : ''}
                                    </p>
                                </div>
                                {fee.is_active && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive"
                                        onClick={() => deactivate(fee)}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                )}
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </AppShell>
    );
}

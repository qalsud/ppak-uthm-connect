import { useForm } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Settings as SettingsIcon } from 'lucide-react';
import { useState } from 'react';

import PageHeader from '@/Components/page-header';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { FormCheckbox, FormField } from '@/Components/ui/form-field';
import { Input } from '@/Components/ui/input';
import { useI18n } from '@/lib/i18n';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Setting = {
    key: string;
    /** Key relative to its group, e.g. "due_day" for "fees.due_day". */
    field: string;
    type: 'int' | 'bool' | 'float' | 'string';
    min: number | null;
    max: number | null;
    default: string | number | boolean | null;
    value: string | number | boolean | null;
};

type Group = { group: string; settings: Setting[] };

type JobStatus = {
    command: string;
    last_run: string | null;
    last_run_human: string | null;
    stale: boolean;
};

type FormShape = { settings: Record<string, Record<string, string | boolean>> };

export default function AdminSettings({
    groups,
    scheduler,
}: {
    groups: Group[];
    scheduler: Record<string, JobStatus>;
}) {
    const { t } = useI18n();
    const [active, setActive] = useState(groups[0]?.group ?? '');

    const initial: FormShape['settings'] = {};
    groups.forEach((group) => {
        initial[group.group] = {};
        group.settings.forEach((setting) => {
            initial[group.group][setting.field] =
                setting.type === 'bool'
                    ? Boolean(setting.value)
                    : String(setting.value ?? '');
        });
    });

    const form = useForm<FormShape>({ settings: initial });

    const current = groups.find((g) => g.group === active);
    const errors = form.errors as Record<string, string>;

    const valueOf = (group: string, field: string) => form.data.settings[group]?.[field];

    const setValue = (group: string, field: string, value: string | boolean) =>
        form.setData('settings', {
            ...form.data.settings,
            [group]: { ...form.data.settings[group], [field]: value },
        });

    const submit = () => form.put(route('admin.settings.update'), { preserveScroll: true });

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('settings')} description={t('settings_desc')} />

            <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                {/* Group picker */}
                <Card className="h-fit rounded-2xl border-0 shadow-sm">
                    <CardContent className="p-2">
                        <nav className="space-y-0.5">
                            {groups.map((g) => (
                                <button
                                    key={g.group}
                                    type="button"
                                    onClick={() => setActive(g.group)}
                                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                                        g.group === active
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-accent'
                                    }`}
                                >
                                    <span className="truncate">
                                        {t(`setting_group.${g.group}`, g.group)}
                                    </span>
                                    <span className="shrink-0 text-[10px] opacity-70">
                                        {g.settings.length}
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </CardContent>
                </Card>

                {/* Values */}
                <Card className="rounded-2xl border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <SettingsIcon className="size-4 text-primary" />
                            {t(`setting_group.${active}`, active)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {current?.settings.map((setting) =>
                            setting.type === 'bool' ? (
                                <FormCheckbox
                                    key={setting.key}
                                    label={t(`setting.${setting.key}`, setting.key)}
                                    description={t(`setting.${setting.key}_hint`, '') || undefined}
                                    checked={Boolean(valueOf(current.group, setting.field))}
                                    onChange={(v) => setValue(current.group, setting.field, v)}
                                />
                            ) : (
                                <FormField
                                    key={setting.key}
                                    label={t(`setting.${setting.key}`, setting.key)}
                                    hint={t(`setting.${setting.key}_hint`, '') || undefined}
                                    error={errors[`settings.${setting.key}`]}
                                >
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Input
                                            type="number"
                                            min={setting.min ?? undefined}
                                            max={setting.max ?? undefined}
                                            value={String(valueOf(current.group, setting.field) ?? '')}
                                            onChange={(e) =>
                                                setValue(current.group, setting.field, e.target.value)
                                            }
                                            className="w-40"
                                        />
                                        <span className="text-[11px] text-muted-foreground">
                                            {t('settings_using_default')}: {String(setting.default)}
                                        </span>
                                    </div>
                                </FormField>
                            ),
                        )}

                        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                            <Button onClick={submit} disabled={form.processing}>
                                {t('save_settings')}
                            </Button>
                            <p className="text-[11px] text-muted-foreground">{t('settings_hint')}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Scheduler health */}
            <Card className="mt-4 rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('scheduler')}</CardTitle>
                    <p className="text-[11px] text-muted-foreground">{t('scheduler_desc')}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                    {Object.entries(scheduler).map(([name, job]) => (
                        <div
                            key={name}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
                        >
                            <div className="min-w-0">
                                <p className="font-mono text-xs">{job.command}</p>
                                <p className="text-[11px] text-muted-foreground">
                                    {t('scheduler_last')}:{' '}
                                    {job.last_run_human ?? t('scheduler_never')}
                                </p>
                            </div>
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                    job.stale
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'bg-emerald-50 text-emerald-700'
                                }`}
                            >
                                {job.stale ? (
                                    <AlertTriangle className="size-3.5" />
                                ) : (
                                    <CheckCircle2 className="size-3.5" />
                                )}
                                {job.stale ? t('scheduler_stale') : t('scheduler_ok')}
                            </span>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </AppShell>
    );
}

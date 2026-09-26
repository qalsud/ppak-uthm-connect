import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import type { PageProps } from '@/types';
import { useI18n } from '@/lib/i18n';
import { parentNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Child = { id: number; name: string; class: string };
type Existing = {
    id: number;
    date: string;
    arrival_time: string | null;
    sleep_status: string;
    bath_status: string;
    health_status: string | null;
    parent_notes: string | null;
};

type Page = PageProps<{
    children: Child[];
    selected: Child | null;
    existing: Existing | null;
}>;

export default function ParentDailyUpdate() {
    const { t } = useI18n();
    const { props } = usePage<Page>();
    const { children, selected, existing } = props;
    const [selectedId, setSelectedId] = useState<number | null>(selected?.id ?? null);

    const form = useForm({
        student_id: selected?.id?.toString() ?? '',
        date: new Date().toISOString().slice(0, 10),
        arrival_time: existing?.arrival_time ?? '',
        sleep_status: existing?.sleep_status ?? 'Good',
        bath_status: existing?.bath_status ?? 'Done',
        health_status: existing?.health_status ?? '',
        parent_notes: existing?.parent_notes ?? '',
    });

    const chooseChild = (id: number) => {
        setSelectedId(id);
        router.get('/parent/daily-update', { student_id: id }, { preserveState: true });
    };

    const submit = () => {
        form.post(route('parent.daily-update.store'));
    };

    const pill = (
        name: 'sleep_status' | 'bath_status',
        value: string,
        label: string,
        options: string[],
    ) => (
        <div className="space-y-1">
            <Label>{label}</Label>
            <div className="flex gap-2">
                {options.map((option) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => form.setData(name, option)}
                        className={`rounded-full border px-4 py-1.5 text-sm ${
                            form.data[name] === option
                                ? 'border-brand-blue bg-brand-blue text-white'
                                : 'border-border bg-card hover:bg-accent'
                        }`}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <AppShell nav={parentNav} title={t('parent')}>
            <h1 className="mb-6 text-2xl font-bold">{t('daily_update')}</h1>

            <div className="mb-4 flex flex-wrap gap-2">
                {children.map((child) => (
                    <Badge
                        key={child.id}
                        variant={selectedId === child.id ? 'default' : 'outline'}
                        className="cursor-pointer py-1.5 text-sm"
                        onClick={() => chooseChild(child.id)}
                    >
                        {child.name} · {child.class}
                    </Badge>
                ))}
            </div>

            {selected ? (
                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle>{selected.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>{t('date')}</Label>
                                <Input
                                    type="date"
                                    value={form.data.date}
                                    onChange={(e) => form.setData('date', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Arrival Time</Label>
                                <Input
                                    type="time"
                                    value={form.data.arrival_time}
                                    onChange={(e) => form.setData('arrival_time', e.target.value)}
                                />
                            </div>
                        </div>

                        {pill('sleep_status', 'sleep', 'Sleep', ['Good', 'Poor'])}
                        {pill('bath_status', 'bath', 'Bath', ['Done', 'Not Done'])}

                        <div className="space-y-1">
                            <Label>Health Status</Label>
                            <Input
                                value={form.data.health_status}
                                onChange={(e) => form.setData('health_status', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>{t('notes')}</Label>
                            <Textarea
                                rows={3}
                                value={form.data.parent_notes}
                                onChange={(e) => form.setData('parent_notes', e.target.value)}
                            />
                        </div>

                        {form.errors.student_id && (
                            <p className="text-xs text-destructive">{form.errors.student_id}</p>
                        )}

                        <Button onClick={submit} disabled={form.processing}>
                            {t('save')}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        {t('no_data')}
                    </CardContent>
                </Card>
            )}
        </AppShell>
    );
}
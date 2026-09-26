import { router, useForm, usePage } from '@inertiajs/react';
import { CalendarCheck } from 'lucide-react';

import PageHeader from '@/Components/page-header';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import type { PageProps } from '@/types';
import { useI18n } from '@/lib/i18n';
import { localDate } from '@/lib/date';
import { parentBottomNav, parentNav } from '@/lib/navigation';
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

    const form = useForm({
        student_id: selected?.id?.toString() ?? '',
        date: localDate(),
        arrival_time: existing?.arrival_time ?? '',
        sleep_status: existing?.sleep_status ?? 'Good',
        bath_status: existing?.bath_status ?? 'Done',
        health_status: existing?.health_status ?? '',
        parent_notes: existing?.parent_notes ?? '',
    });

    const chooseChild = (id: number) =>
        router.get('/parent/daily-update', { student_id: id }, { preserveState: true });

    const submit = () => form.post(route('parent.daily-update.store'));

    const Segmented = ({
        label,
        name,
        options,
    }: {
        label: string;
        name: 'sleep_status' | 'bath_status';
        options: { value: string; label: string; tone: string }[];
    }) => (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="grid grid-cols-2 gap-2">
                {options.map((o) => {
                    const active = form.data[name] === o.value;

                    return (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => form.setData(name, o.value)}
                            className={`h-12 rounded-xl border text-sm font-semibold transition ${
                                active
                                    ? `${o.tone} border-transparent`
                                    : 'border-input bg-card text-muted-foreground'
                            }`}
                        >
                            {o.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <AppShell nav={parentNav} bottomNav={parentBottomNav} title={t('parent')}>
            <PageHeader
                title={t('daily_update')}
                description="Let the teachers know how your child is today"
            />

            {children.length > 1 && (
                <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                    {children.map((child) => (
                        <button
                            key={child.id}
                            onClick={() => chooseChild(child.id)}
                            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${
                                selected?.id === child.id
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-input bg-card text-muted-foreground'
                            }`}
                        >
                            {child.name}
                        </button>
                    ))}
                </div>
            )}

            {existing && (
                <Card className="mb-4 rounded-2xl border-0 bg-muted/50 p-4 shadow-none">
                    <p className="text-xs text-muted-foreground">
                        Last submitted {existing.date}
                        {existing.health_status ? ` · health: ${existing.health_status}` : ''}
                    </p>
                </Card>
            )}

            {selected ? (
                <Card className="rounded-2xl border-0 shadow-sm">
                    <CardContent className="space-y-5 pt-5">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                                <CalendarCheck className="size-5" />
                            </span>
                            <div>
                                <p className="font-semibold">{selected.name}</p>
                                <p className="text-xs text-muted-foreground">{selected.class}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>{t('date')}</Label>
                                <Input
                                    type="date"
                                    className="h-11"
                                    max={localDate()}
                                    value={form.data.date}
                                    onChange={(e) => form.setData('date', e.target.value)}
                                />
                                {form.errors.date && (
                                    <p className="text-xs text-destructive">{form.errors.date}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Arrival time</Label>
                                <Input
                                    type="time"
                                    className="h-11"
                                    value={form.data.arrival_time}
                                    onChange={(e) => form.setData('arrival_time', e.target.value)}
                                />
                                {form.errors.arrival_time && (
                                    <p className="text-xs text-destructive">
                                        {form.errors.arrival_time}
                                    </p>
                                )}
                            </div>
                        </div>

                        <Segmented
                            label="Sleeping status"
                            name="sleep_status"
                            options={[
                                { value: 'Good', label: '😴 Good', tone: 'bg-emerald-100 text-emerald-700' },
                                { value: 'Poor', label: '😟 Poor', tone: 'bg-rose-100 text-rose-700' },
                            ]}
                        />

                        <Segmented
                            label="Bath status"
                            name="bath_status"
                            options={[
                                { value: 'Done', label: '🛁 Done', tone: 'bg-emerald-100 text-emerald-700' },
                                { value: 'Not Done', label: '🚫 Not done', tone: 'bg-amber-100 text-amber-700' },
                            ]}
                        />

                        <div className="space-y-2">
                            <Label>Health status</Label>
                            <Input
                                className="h-11"
                                placeholder="e.g. Healthy, slight fever…"
                                value={form.data.health_status}
                                onChange={(e) => form.setData('health_status', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{t('notes')}</Label>
                            <Textarea
                                rows={3}
                                placeholder="Any instructions for the teachers…"
                                value={form.data.parent_notes}
                                onChange={(e) => form.setData('parent_notes', e.target.value)}
                            />
                        </div>

                        {form.errors.student_id && (
                            <p className="text-xs text-destructive">{form.errors.student_id}</p>
                        )}

                        {Object.keys(form.errors).length > 0 && (
                            <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                Please check the highlighted fields and try again.
                            </div>
                        )}

                        <Button
                            onClick={submit}
                            disabled={form.processing}
                            className="h-12 w-full rounded-xl text-sm font-semibold"
                        >
                            {form.processing ? 'Saving…' : 'Submit update'}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="rounded-2xl border-0 shadow-sm">
                    <CardContent className="py-14 text-center text-sm text-muted-foreground">
                        {t('no_data')}
                    </CardContent>
                </Card>
            )}
        </AppShell>
    );
}
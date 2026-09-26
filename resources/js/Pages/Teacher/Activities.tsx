import { useForm } from '@inertiajs/react';
import { CalendarCheck } from 'lucide-react';

import PageHeader from '@/Components/page-header';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import { useI18n } from '@/lib/i18n';
import { teacherBottomNav, teacherNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Student = { id: number; name: string; class: string };
type FieldMap = Record<string, string>;

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : c === '6bintang' ? '6 Bintang' : c);

export default function Activities({
    students,
    today,
    fields,
    records,
}: {
    students: Student[];
    today: string;
    fields: FieldMap;
    records: Array<{
        id: number;
        date: string;
        treatment_notes: string | null;
        student: { id: number; name: string; class: string };
    }>;
}) {
    const { t } = useI18n();

    const form = useForm({
        student_id: '',
        date: today,
        treatment_notes: '',
        statuses: Object.fromEntries(
            Object.keys(fields).map((k) => [k, 'no']),
        ) as Record<string, 'yes' | 'no'>,
    });

    const toggle = (field: string) =>
        form.setData('statuses', {
            ...form.data.statuses,
            [field]: form.data.statuses[field] === 'yes' ? 'no' : 'yes',
        });

    const submit = () => form.post(route('teacher.activities.store'));

    return (
        <AppShell nav={teacherNav} bottomNav={teacherBottomNav} title={t('teacher')}>
            <PageHeader
                title={t('daily_activities')}
                description="Record today's classroom activities"
            />

            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardContent className="space-y-4 pt-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>{t('student')}</Label>
                            <Select
                                value={form.data.student_id}
                                onValueChange={(v) => form.setData('student_id', v)}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder={t('select_student')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.name} · {classLabel(s.class)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.errors.student_id && (
                                <p className="text-xs text-destructive">{form.errors.student_id}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('date')}</Label>
                            <Input
                                type="date"
                                className="h-11"
                                value={form.data.date}
                                max={today}
                                onChange={(e) => form.setData('date', e.target.value)}
                            />
                            {form.errors.date && (
                                <p className="text-xs text-destructive">{form.errors.date}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(fields).map(([key, label]) => {
                            const yes = form.data.statuses[key] === 'yes';

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => toggle(key)}
                                    className={`flex h-14 flex-col items-start justify-center rounded-xl border px-3 text-left text-sm transition ${
                                        yes
                                            ? 'border-emerald-300 bg-emerald-50'
                                            : 'border-input bg-card'
                                    }`}
                                >
                                    <span className="text-[13px] font-medium">{label}</span>
                                    <span
                                        className={`text-[11px] font-semibold ${
                                            yes ? 'text-emerald-600' : 'text-muted-foreground'
                                        }`}
                                    >
                                        {yes ? '✓ Yes' : 'No'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="space-y-2">
                        <Label>Treatment / {t('notes')}</Label>
                        <Textarea
                            rows={2}
                            value={form.data.treatment_notes}
                            onChange={(e) => form.setData('treatment_notes', e.target.value)}
                        />
                    </div>

                    <Button
                        onClick={submit}
                        disabled={form.processing}
                        className="h-12 w-full rounded-xl font-semibold"
                    >
                        {form.processing ? 'Saving…' : t('save')}
                    </Button>
                </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarCheck className="size-4 text-primary" />
                        {t('recent_records')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {records.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            {t('no_data')}
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {records.map((r) => (
                                <div
                                    key={r.id}
                                    className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">
                                            {r.student.name}
                                        </p>
                                        <p className="truncate text-[11px] text-muted-foreground">
                                            {r.treatment_notes || '—'}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {r.date}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </AppShell>
    );
}
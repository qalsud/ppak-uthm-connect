import { router, useForm } from '@inertiajs/react';
import { BookOpen, CalendarDays, Info, LineChart, Save, User } from 'lucide-react';

import PageHeader from '@/Components/page-header';
import RatingChip from '@/Components/rating-chip';
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
import { formatDate, localDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { teacherBottomNav, teacherNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Student = { id: number; name: string; class: string };

type Record = {
    id: number;
    date: string;
    sub_theme: string | null;
    activity_done: string;
    child_proficiency: string;
    permata_activity: string;
    free_activity: string;
    development_proficiency: string;
    notes: string | null;
    student: { name: string; class: string };
    teacher: { name: string } | null;
};

type Summary = {
    count: number;
    last_date: string | null;
    latest: {
        activity_performance: string;
        skill_mastery: string;
        development_area: string;
    } | null;
};

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : c === '6bintang' ? '6 Bintang' : c);

const emptyForm = {
    student_id: '',
    date: localDate(),
    sub_theme: '',
    activity_done: '',
    child_proficiency: '',
    permata_activity: '',
    free_activity: '',
    development_proficiency: '',
    notes: '',
};

export default function Progress({
    students,
    records,
    summary,
    permata,
    free,
    development,
    grades,
    filters,
}: {
    students: Student[];
    records: Record[];
    summary: Summary | null;
    permata: string[];
    free: string[];
    development: string[];
    grades: string[];
    filters: { student: string; class: string };
}) {
    const { t } = useI18n();

    const form = useForm({ ...emptyForm, student_id: filters.student || '' });

    const ready = form.data.student_id !== '' && form.data.date !== '';

    const submit = () =>
        form.post(route('teacher.progress.store'), {
            preserveScroll: true,
            onSuccess: () =>
                form.reset(
                    'sub_theme',
                    'activity_done',
                    'child_proficiency',
                    'permata_activity',
                    'free_activity',
                    'development_proficiency',
                    'notes',
                ),
        });

    const applyFilter = (key: 'student' | 'class', value: string) =>
        router.get(
            '/teacher/progress',
            { ...filters, [key]: value === '__all' ? '' : value },
            { preserveState: true, preserveScroll: true },
        );

    const selectField = (opts: {
        label: string;
        name: keyof typeof form.data;
        options: string[];
        hint?: string;
    }) => (
        <div className="space-y-1.5">
            <Label>{opts.label}</Label>
            <Select value={String(form.data[opts.name])} onValueChange={(v) => form.setData(opts.name, v as never)}>
                <SelectTrigger className="h-11">
                    <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                    {opts.options.map((o) => (
                        <SelectItem key={o} value={o}>
                            {o}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {opts.hint && <p className="text-[11px] text-muted-foreground">{opts.hint}</p>}
            {form.errors[opts.name] && (
                <p className="text-xs text-destructive">{form.errors[opts.name]}</p>
            )}
        </div>
    );

    return (
        <AppShell nav={teacherNav} bottomNav={teacherBottomNav} title={t('teacher')}>
            <PageHeader title={t('progress')} description={t('progress_desc')} />

            {/* Record progress */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen className="size-4 text-primary" />
                        {t('progress_record')}
                    </CardTitle>
                    {!ready && (
                        <p className="flex items-center gap-1.5 text-xs text-amber-600">
                            <Info className="size-3.5" />
                            {t('select_prompt')}
                        </p>
                    )}
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Lesson */}
                    <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('lesson')}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
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
                            <div className="space-y-1.5">
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
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>{t('sub_theme')}</Label>
                                <Input
                                    className="h-11"
                                    placeholder={t('sub_theme_hint')}
                                    value={form.data.sub_theme}
                                    onChange={(e) => form.setData('sub_theme', e.target.value)}
                                />
                                {form.errors.sub_theme && (
                                    <p className="text-xs text-destructive">{form.errors.sub_theme}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Activities */}
                    <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('activities_today')}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {selectField({
                                label: t('permata_activity'),
                                name: 'permata_activity',
                                options: permata,
                            })}
                            {selectField({
                                label: t('free_activity'),
                                name: 'free_activity',
                                options: free,
                            })}
                        </div>
                    </div>

                    {/* Assessment */}
                    <div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {t('assessment')}
                            </p>
                            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Info className="size-3.5" />
                                {t('rating_guide')}:
                                <RatingChip value="Good" />
                                <RatingChip value="Average" />
                                <RatingChip value="Poor" />
                            </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {selectField({
                                label: t('activity_performance'),
                                name: 'activity_done',
                                options: grades,
                                hint: t('activity_performance_hint'),
                            })}
                            {selectField({
                                label: t('skill_mastery'),
                                name: 'child_proficiency',
                                options: grades,
                                hint: t('skill_mastery_hint'),
                            })}
                            {selectField({
                                label: t('development_area'),
                                name: 'development_proficiency',
                                options: development,
                                hint: t('development_area_hint'),
                            })}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label>{t('notes')}</Label>
                        <Textarea
                            rows={2}
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
                        />
                    </div>

                    <Button
                        onClick={submit}
                        disabled={form.processing || !ready}
                        className="h-12 w-full rounded-xl font-semibold"
                    >
                        <Save className="size-4" />
                        {form.processing ? t('saving') : t('save')}
                    </Button>
                </CardContent>
            </Card>

            {/* History */}
            <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <LineChart className="size-4 text-primary" />
                        {t('progress_history')}
                    </CardTitle>
                </CardHeader>

                <div className="flex flex-wrap items-center gap-3 border-y px-4 py-3">
                    <Select
                        value={filters.student || '__all'}
                        onValueChange={(v) => applyFilter('student', v)}
                    >
                        <SelectTrigger className="w-52">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all">{t('all_students')}</SelectItem>
                            {students.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                    {s.name} · {classLabel(s.class)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filters.class || '__all'} onValueChange={(v) => applyFilter('class', v)}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all">{t('all_classes')}</SelectItem>
                            <SelectItem value="5tahun">5 Tahun</SelectItem>
                            <SelectItem value="6bintang">6 Bintang</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="ml-auto text-xs text-muted-foreground">
                        {records.length} {t('records')}
                    </span>
                </div>

                {/* Per-student summary */}
                {summary && (
                    <div className="grid grid-cols-3 gap-3 border-b bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <User className="size-4 text-muted-foreground" />
                            <div>
                                <p className="text-[11px] text-muted-foreground">{t('records')}</p>
                                <p className="text-sm font-semibold">{summary.count}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarDays className="size-4 text-muted-foreground" />
                            <div>
                                <p className="text-[11px] text-muted-foreground">{t('last_recorded')}</p>
                                <p className="text-sm font-semibold">
                                    {summary.last_date ? formatDate(summary.last_date) : '—'}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] text-muted-foreground">{t('latest_assessment')}</p>
                            {summary.latest ? (
                                <div className="flex flex-wrap gap-1.5">
                                    <RatingChip value={summary.latest.activity_performance} />
                                    <RatingChip value={summary.latest.skill_mastery} />
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                        {summary.latest.development_area}
                                    </span>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">—</p>
                            )}
                        </div>
                    </div>
                )}

                <CardContent className="pt-4">
                    {records.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-sm font-medium">{t('no_progress_title')}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{t('no_progress_desc')}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {records.map((r) => (
                                <div key={r.id} className="rounded-xl border p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">
                                                {r.student.name}
                                                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                                    · {classLabel(r.student.class)}
                                                </span>
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(r.date)}
                                                {r.sub_theme ? ` · ${r.sub_theme}` : ''}
                                            </p>
                                        </div>
                                        {r.teacher && (
                                            <span className="shrink-0 text-[11px] text-muted-foreground">
                                                {r.teacher.name}
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <RatingChip value={r.activity_done} />
                                        <RatingChip value={r.child_proficiency} />
                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                            {r.development_proficiency}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            PERMATA: {r.permata_activity} · {t('free_activity')}: {r.free_activity}
                                        </span>
                                    </div>

                                    {r.notes && (
                                        <p className="mt-2 rounded bg-muted px-2 py-1.5 text-xs text-muted-foreground">
                                            {r.notes}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </AppShell>
    );
}

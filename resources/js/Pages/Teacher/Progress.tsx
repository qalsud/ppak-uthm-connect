import { router, useForm } from '@inertiajs/react';
import { BookOpen, CalendarDays, Info, LineChart, Save, User } from 'lucide-react';

import PageHeader from '@/Components/page-header';
import PhotoThumb from '@/Components/photo-thumb';
import PhotoUpload from '@/Components/photo-upload';
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
import {
    listLabel,
    useClassLabel as useClassLabelHook,
    useList,
    useLists,
} from '@/lib/lists';
import type { PhotoInfo } from '@/lib/photo';
import { actionRoute, actionUrl, shellFor } from '@/lib/shell';
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
    photo?: PhotoInfo | null;
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
    photo: null as File | null,
};

export default function Progress({
    students,
    records,
    summary,
    assignedClass,
    filters,
    shell: shellProp,
}: {
    shell?: string;
    students: Student[];
    records: Record[];
    summary: Summary | null;
    assignedClass?: string | null;
    filters: { student: string; class: string };
}) {
    const { t } = useI18n();
    const classLabel = useClassLabelHook();
    const lists = useLists();
    const permataOptions = useList('progress_permata');
    const freeOptions = useList('progress_free');
    const developmentOptions = useList('progress_development');
    const gradeOptions = useList('progress_grade');
    const classOptions = useList('class');
    const shell = shellFor(shellProp);

    const progressLabel = (group: string, value?: string | null) => listLabel(lists, group, value);

    const form = useForm({ ...emptyForm, student_id: filters.student || '' });

    const ready = form.data.student_id !== '' && form.data.date !== '';

    const submit = () =>
        form.post(actionRoute(shell.isAdmin, 'progress.store'), {
            forceFormData: true,
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
                    'photo',
                ),
        });

    const applyFilter = (key: 'student' | 'class', value: string) =>
        router.get(
            actionUrl(shell.isAdmin, 'progress'),
            { ...filters, [key]: value === '__all' ? '' : value },
            { preserveState: true, preserveScroll: true },
        );

    const selectField = (opts: {
        label: string;
        name: keyof typeof form.data;
        options: { value: string; label: string }[];
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
                        <SelectItem key={o.value} value={o.value}>
                            {o.label}
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
        <AppShell nav={shell.nav} bottomNav={shell.bottomNav} title={t(shell.title)}>
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
                                options: permataOptions,
                            })}
                            {selectField({
                                label: t('free_activity'),
                                name: 'free_activity',
                                options: freeOptions,
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
                                options: gradeOptions,
                                hint: t('activity_performance_hint'),
                            })}
                            {selectField({
                                label: t('skill_mastery'),
                                name: 'child_proficiency',
                                options: gradeOptions,
                                hint: t('skill_mastery_hint'),
                            })}
                            {selectField({
                                label: t('development_area'),
                                name: 'development_proficiency',
                                options: developmentOptions,
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

                    {/* Photo */}
                    <div className="space-y-1.5">
                        <Label>{t('add_photo_optional')}</Label>
                        <PhotoUpload
                            value={form.data.photo}
                            onChange={(file) => form.setData('photo', file)}
                            hint={t('progress_photo_hint')}
                            error={form.errors.photo}
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
                    {!assignedClass && (
                        <Select value={filters.class || '__all'} onValueChange={(v) => applyFilter('class', v)}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all">{t('all_classes')}</SelectItem>
                                {classOptions.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>
                                        {c.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
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
                                        {progressLabel('progress_development', summary.latest.development_area)}
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
                                            {progressLabel('progress_development', r.development_proficiency)}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            PERMATA: {progressLabel('progress_permata', r.permata_activity)} ·{' '}
                                            {t('free_activity')}: {progressLabel('progress_free', r.free_activity)}
                                        </span>
                                    </div>

                                    {r.notes && (
                                        <p className="mt-2 rounded bg-muted px-2 py-1.5 text-xs text-muted-foreground">
                                            {r.notes}
                                        </p>
                                    )}

                                    {r.photo && (
                                        <div className="mt-2">
                                            <PhotoThumb photo={r.photo} size="size-20" />
                                        </div>
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

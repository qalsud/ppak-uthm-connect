import { router, useForm } from '@inertiajs/react';
import {
    BookOpen,
    CalendarDays,
    ChevronDown,
    Download,
    Info,
    Layers,
    LineChart,
    Pencil,
    Save,
    Trash2,
    User,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import ConfirmDialog from '@/Components/confirm-dialog';
import FilterTabs from '@/Components/filter-tabs';
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
import { formatDate, localDate, shiftDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import {
    listLabel,
    useClassLabel as useClassLabelHook,
    useList,
    useLists,
} from '@/lib/lists';
import type { PhotoInfo } from '@/lib/photo';
import { actionRoute, actionUrl, shellFor } from '@/lib/shell';
import { cn } from '@/lib/utils';
import AppShell from '@/Layouts/app-shell';

type Student = { id: number; name: string; class: string; centre_id: number | null };

type Centre = { id: number; name: string; short_name: string | null };

type IndividualRecord = {
    id: number;
    date: string;
    sub_theme: string | null;
    activity_done: string;
    child_proficiency: string;
    permata_activity: string;
    free_activity: string;
    development_proficiency: string;
    notes: string | null;
    student: { id: number; name: string; class: string };
    teacher: { name: string } | null;
    photo?: PhotoInfo | null;
};

type GroupActivity = {
    id: number;
    date: string;
    sub_theme: string | null;
    activity_done: string;
    child_proficiency: string;
    permata_activity: string;
    free_activity: string;
    development_proficiency: string;
    notes: string | null;
    teacher: { name: string } | null;
    photo?: PhotoInfo | null;
    participant_count: number;
    records: Array<{
        id: number;
        activity_done: string;
        child_proficiency: string;
        student: { id: number; name: string; class: string };
    }>;
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

type Rating = { activity_done: string; child_proficiency: string };

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

const DEFAULT_RATING: Rating = { activity_done: 'Good', child_proficiency: 'Good' };

export default function Progress({
    students,
    centres,
    records,
    groupActivities,
    summary,
    assignedClass,
    filters,
    shell: shellProp,
}: {
    shell?: string;
    students: Student[];
    centres: Centre[];
    records: IndividualRecord[];
    groupActivities: GroupActivity[];
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

    const [mode, setMode] = useState<'individual' | 'group'>('individual');
    const [historyFilter, setHistoryFilter] = useState<'all' | 'individual' | 'group'>('all');

    // Progress-report period (defaults to the last 90 days).
    const [reportFrom, setReportFrom] = useState(shiftDate(localDate(), -90));
    const [reportTo, setReportTo] = useState(localDate());

    const progressLabel = (group: string, value?: string | null) => listLabel(lists, group, value);

    const form = useForm({ ...emptyForm, student_id: filters.student || '' });
    const [deleteTarget, setDeleteTarget] = useState<IndividualRecord | null>(null);

    const ready = form.data.student_id !== '' && form.data.date !== '';

    const defaultCentre = centres.length === 1 ? String(centres[0].id) : '';

    const groupForm = useForm({
        class: assignedClass ?? '',
        centre_id: defaultCentre,
        date: localDate(),
        sub_theme: '',
        permata_activity: '',
        free_activity: '',
        development_proficiency: '',
        notes: '',
        photo: null as File | null,
        replace_existing: false,
    });

    const [groupParticipants, setGroupParticipants] = useState<number[]>([]);
    const [groupRatings, setGroupRatings] = useState<Record<number, Rating>>({});
    const [conflicts, setConflicts] = useState<Array<{ id: number; name: string }>>([]);
    const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
    const [groupDeleteTarget, setGroupDeleteTarget] = useState<GroupActivity | null>(null);

    const groupStudents = students.filter(
        (student) =>
            student.class === groupForm.data.class &&
            String(student.centre_id ?? '') === groupForm.data.centre_id,
    );

    const groupReady =
        groupForm.data.class !== '' &&
        groupForm.data.centre_id !== '' &&
        groupForm.data.date !== '' &&
        groupParticipants.length > 0;

    const allSelected =
        groupStudents.length > 0 &&
        groupStudents.every((student) => groupParticipants.includes(student.id));

    // Ask the server which children already have a record, so the teacher sees
    // the conflict before saving. The server still enforces skip/replace.
    useEffect(() => {
        if (groupParticipants.length === 0 || groupForm.data.date === '') {
            setConflicts([]);

            return;
        }

        let active = true;

        window.axios
            .post(actionRoute(shell.isAdmin, 'progress.group.conflicts'), {
                date: groupForm.data.date,
                student_ids: groupParticipants,
            })
            .then(({ data }) => {
                if (active) {
                    setConflicts(data.conflicts ?? []);
                }
            })
            .catch(() => {
                // ignore transient errors; the store endpoint re-checks
            });

        return () => {
            active = false;
        };
    }, [groupParticipants, groupForm.data.date, shell.isAdmin]);

    const editRecord = (record: IndividualRecord) => {
        form.setData({
            student_id: String(record.student.id),
            date: record.date,
            sub_theme: record.sub_theme ?? '',
            activity_done: record.activity_done,
            child_proficiency: record.child_proficiency,
            permata_activity: record.permata_activity,
            free_activity: record.free_activity,
            development_proficiency: record.development_proficiency,
            notes: record.notes ?? '',
            photo: null,
        });
        form.clearErrors();
        setMode('individual');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmDelete = () => {
        if (!deleteTarget) {
            return;
        }

        router.delete(actionRoute(shell.isAdmin, 'progress.destroy', { record: deleteTarget.id }), {
            preserveScroll: true,
            onFinish: () => setDeleteTarget(null),
        });
    };

    const confirmDeleteGroup = () => {
        if (!groupDeleteTarget) {
            return;
        }

        router.delete(
            actionRoute(shell.isAdmin, 'progress.group.destroy', { group: groupDeleteTarget.id }),
            {
                preserveScroll: true,
                onFinish: () => setGroupDeleteTarget(null),
            },
        );
    };

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

    const resetGroupParticipants = () => {
        setGroupParticipants([]);
        setGroupRatings({});
        setConflicts([]);
    };

    const setGroupClass = (value: string) => {
        groupForm.setData('class', value);
        resetGroupParticipants();
    };

    const setGroupCentre = (value: string) => {
        groupForm.setData('centre_id', value);
        resetGroupParticipants();
    };

    const toggleParticipant = (id: number, checked: boolean) => {
        if (checked) {
            setGroupParticipants((current) => [...current, id]);
            setGroupRatings((current) => ({ ...current, [id]: current[id] ?? DEFAULT_RATING }));
        } else {
            setGroupParticipants((current) => current.filter((value) => value !== id));
        }
    };

    const toggleAllParticipants = () => {
        if (allSelected) {
            resetGroupParticipants();

            return;
        }

        const ids = groupStudents.map((student) => student.id);

        setGroupParticipants(ids);
        setGroupRatings(
            Object.fromEntries(ids.map((id) => [id, { ...DEFAULT_RATING }])) as Record<number, Rating>,
        );
    };

    const setRating = (id: number, field: keyof Rating, value: string) =>
        setGroupRatings((current) => ({
            ...current,
            [id]: { ...(current[id] ?? DEFAULT_RATING), [field]: value },
        }));

    const submitGroup = () => {
        if (!groupReady) {
            return;
        }

        groupForm.transform((data) => ({
            ...data,
            participants: groupParticipants.map((id) => ({
                student_id: id,
                activity_done: groupRatings[id]?.activity_done ?? DEFAULT_RATING.activity_done,
                child_proficiency:
                    groupRatings[id]?.child_proficiency ?? DEFAULT_RATING.child_proficiency,
            })),
        }));

        groupForm.post(actionRoute(shell.isAdmin, 'progress.group.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                groupForm.reset(
                    'sub_theme',
                    'permata_activity',
                    'free_activity',
                    'development_proficiency',
                    'notes',
                    'photo',
                    'replace_existing',
                );
                resetGroupParticipants();
            },
        });
    };

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
                <SelectTrigger className="h-11" aria-label={opts.label}>
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

    const showIndividual = historyFilter !== 'group';
    const showGroups = historyFilter !== 'individual';
    const visibleCount =
        (showIndividual ? records.length : 0) + (showGroups ? groupActivities.length : 0);

    return (
        <AppShell nav={shell.nav} bottomNav={shell.bottomNav} title={t(shell.title)}>
            <PageHeader title={t('progress')} description={t('progress_desc')} />

            <FilterTabs
                value={mode}
                onChange={(value) => setMode(value as 'individual' | 'group')}
                tabs={[
                    { value: 'individual', label: t('progress.individual_mode') },
                    { value: 'group', label: t('progress.group_mode') },
                ]}
            />
            <p className="-mt-2 mb-4 text-xs text-muted-foreground">{t('progress.mode_desc')}</p>

            {mode === 'individual' ? (
                <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BookOpen className="size-4 text-primary" />
                            {t('progress_record')}
                        </CardTitle>
                        {!ready && (
                            <p className="flex items-center gap-1.5 text-xs text-amber-700">
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
                                        <SelectTrigger className="h-11" aria-label={t('student')}>
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
                                        aria-label={t('date')}
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
                                        aria-label={t('sub_theme')}
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
                                aria-label={t('notes')}
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
            ) : (
                <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Layers className="size-4 text-primary" />
                            {t('progress.group_mode')}
                        </CardTitle>
                        {!groupReady && (
                            <p className="flex items-center gap-1.5 text-xs text-amber-700">
                                <Info className="size-3.5" />
                                {t('select_prompt')}
                            </p>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label>{t('class')}</Label>
                                <Select
                                    value={groupForm.data.class}
                                    onValueChange={setGroupClass}
                                    disabled={Boolean(assignedClass)}
                                >
                                    <SelectTrigger className="h-11" aria-label={t('class')}>
                                        <SelectValue placeholder={t('class')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {groupForm.errors.class && (
                                    <p className="text-xs text-destructive">{groupForm.errors.class}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('centre')}</Label>
                                <Select value={groupForm.data.centre_id} onValueChange={setGroupCentre}>
                                    <SelectTrigger className="h-11" aria-label={t('centre')}>
                                        <SelectValue placeholder={t('select_centre')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {centres.map((centre) => (
                                            <SelectItem key={centre.id} value={String(centre.id)}>
                                                {centre.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {groupForm.errors.centre_id && (
                                    <p className="text-xs text-destructive">{groupForm.errors.centre_id}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('date')}</Label>
                                <Input
                                    type="date"
                                    className="h-11"
                                    max={localDate()}
                                    aria-label={t('date')}
                                    value={groupForm.data.date}
                                    onChange={(e) => groupForm.setData('date', e.target.value)}
                                />
                                {groupForm.errors.date && (
                                    <p className="text-xs text-destructive">{groupForm.errors.date}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>{t('sub_theme')}</Label>
                                <Input
                                    className="h-11"
                                    placeholder={t('sub_theme_hint')}
                                    aria-label={t('sub_theme')}
                                    value={groupForm.data.sub_theme}
                                    onChange={(e) => groupForm.setData('sub_theme', e.target.value)}
                                />
                                {groupForm.errors.sub_theme && (
                                    <p className="text-xs text-destructive">{groupForm.errors.sub_theme}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {t('activities_today')}
                            </p>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="space-y-1.5">
                                    <Label>{t('permata_activity')}</Label>
                                    <Select
                                        value={groupForm.data.permata_activity}
                                        onValueChange={(v) => groupForm.setData('permata_activity', v)}
                                    >
                                        <SelectTrigger className="h-11" aria-label={t('permata_activity')}>
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {permataOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {groupForm.errors.permata_activity && (
                                        <p className="text-xs text-destructive">
                                            {groupForm.errors.permata_activity}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label>{t('free_activity')}</Label>
                                    <Select
                                        value={groupForm.data.free_activity}
                                        onValueChange={(v) => groupForm.setData('free_activity', v)}
                                    >
                                        <SelectTrigger className="h-11" aria-label={t('free_activity')}>
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {freeOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {groupForm.errors.free_activity && (
                                        <p className="text-xs text-destructive">
                                            {groupForm.errors.free_activity}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label>{t('development_area')}</Label>
                                    <Select
                                        value={groupForm.data.development_proficiency}
                                        onValueChange={(v) =>
                                            groupForm.setData('development_proficiency', v)
                                        }
                                    >
                                        <SelectTrigger className="h-11" aria-label={t('development_area')}>
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {developmentOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {groupForm.errors.development_proficiency && (
                                        <p className="text-xs text-destructive">
                                            {groupForm.errors.development_proficiency}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t('notes')}</Label>
                            <Textarea
                                rows={2}
                                aria-label={t('notes')}
                                value={groupForm.data.notes}
                                onChange={(e) => groupForm.setData('notes', e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t('add_photo_optional')}</Label>
                            <PhotoUpload
                                value={groupForm.data.photo}
                                onChange={(file) => groupForm.setData('photo', file)}
                                hint={t('progress.group_photo_hint')}
                                error={groupForm.errors.photo}
                            />
                        </div>

                        <div>
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        {t('progress.participants')}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {t('progress.per_child_rating')}
                                    </p>
                                </div>
                                {groupStudents.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={toggleAllParticipants}
                                    >
                                        {allSelected ? t('progress.clear_selection') : t('select_all')}
                                    </Button>
                                )}
                            </div>

                            {groupStudents.length === 0 ? (
                                <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                                    {t('progress.no_students')}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {groupStudents.map((student) => {
                                        const selected = groupParticipants.includes(student.id);
                                        const rating = groupRatings[student.id] ?? DEFAULT_RATING;

                                        return (
                                            <div
                                                key={student.id}
                                                className={cn(
                                                    'rounded-xl border p-3 transition-colors',
                                                    selected && 'border-primary/40 bg-primary/[0.03]',
                                                )}
                                            >
                                                <label className="flex cursor-pointer items-center gap-2.5">
                                                    <input
                                                        type="checkbox"
                                                        className="size-4 accent-primary"
                                                        checked={selected}
                                                        onChange={(e) =>
                                                            toggleParticipant(student.id, e.target.checked)
                                                        }
                                                    />
                                                    <span className="text-sm font-medium">
                                                        {student.name}
                                                    </span>
                                                </label>

                                                {selected && (
                                                    <div className="mt-2 grid gap-2 pl-6 sm:grid-cols-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-[11px]">
                                                                {t('activity_performance')}
                                                            </Label>
                                                            <Select
                                                                value={rating.activity_done}
                                                                onValueChange={(value) =>
                                                                    setRating(
                                                                        student.id,
                                                                        'activity_done',
                                                                        value,
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="h-9">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {gradeOptions.map((option) => (
                                                                        <SelectItem
                                                                            key={option.value}
                                                                            value={option.value}
                                                                        >
                                                                            {option.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[11px]">
                                                                {t('skill_mastery')}
                                                            </Label>
                                                            <Select
                                                                value={rating.child_proficiency}
                                                                onValueChange={(value) =>
                                                                    setRating(
                                                                        student.id,
                                                                        'child_proficiency',
                                                                        value,
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="h-9">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {gradeOptions.map((option) => (
                                                                        <SelectItem
                                                                            key={option.value}
                                                                            value={option.value}
                                                                        >
                                                                            {option.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {(groupForm.errors as Record<string, string>).participants && (
                                <p className="mt-2 text-xs text-destructive">
                                    {(groupForm.errors as Record<string, string>).participants}
                                </p>
                            )}
                        </div>

                        {conflicts.length > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                <p className="font-semibold">{t('progress.group_conflicts_title')}</p>
                                <p className="mt-0.5">
                                    {conflicts.map((conflict) => conflict.name).join(', ')}
                                </p>
                                <label className="mt-2 flex items-start gap-2">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 size-4 accent-primary"
                                        checked={groupForm.data.replace_existing}
                                        onChange={(e) =>
                                            groupForm.setData('replace_existing', e.target.checked)
                                        }
                                    />
                                    <span>{t('progress.group_replace')}</span>
                                </label>
                            </div>
                        )}

                        <Button
                            onClick={submitGroup}
                            disabled={groupForm.processing || !groupReady}
                            className="h-12 w-full rounded-xl font-semibold"
                        >
                            <Users className="size-4" />
                            {groupForm.processing ? t('saving') : t('save')}
                        </Button>
                    </CardContent>
                </Card>
            )}

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
                        <SelectTrigger className="w-52" aria-label={t('student')}>
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
                            <SelectTrigger className="w-40" aria-label={t('class')}>
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
                        {visibleCount} {t('records')}
                    </span>
                </div>

                <div className="border-b px-4 py-3">
                    <FilterTabs
                        className="mb-0"
                        value={historyFilter}
                        onChange={(value) =>
                            setHistoryFilter(value as 'all' | 'individual' | 'group')
                        }
                        tabs={[
                            { value: 'all', label: t('notification.all') },
                            { value: 'individual', label: t('progress.individual_mode') },
                            { value: 'group', label: t('progress.group_mode') },
                        ]}
                    />
                </div>

                {/* Progress report download (per selected student) */}
                {filters.student && (
                    <div className="flex flex-wrap items-end gap-3 border-b bg-muted/20 px-4 py-3">
                        <div className="w-full space-y-1 md:w-40">
                            <Label className="text-[11px]">{t('from')}</Label>
                            <Input
                                type="date"
                                className="h-9"
                                aria-label={t('from')}
                                value={reportFrom}
                                onChange={(e) => setReportFrom(e.target.value)}
                            />
                        </div>
                        <div className="w-full space-y-1 md:w-40">
                            <Label className="text-[11px]">{t('to')}</Label>
                            <Input
                                type="date"
                                className="h-9"
                                aria-label={t('to')}
                                value={reportTo}
                                onChange={(e) => setReportTo(e.target.value)}
                            />
                        </div>
                        <a
                            href={actionRoute(shell.isAdmin, 'progress.report', {
                                student: filters.student,
                                from: reportFrom,
                                to: reportTo,
                            })}
                        >
                            <Button variant="outline" className="gap-1.5">
                                <Download className="size-4" />
                                {t('progress_report')}
                            </Button>
                        </a>
                    </div>
                )}

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
                    {visibleCount === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-sm font-medium">{t('no_progress_title')}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{t('no_progress_desc')}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {showGroups &&
                                groupActivities.map((group) => {
                                    const expanded = expandedGroups.includes(group.id);

                                    return (
                                        <div
                                            key={`g${group.id}`}
                                            className="rounded-xl border border-indigo-200/70 bg-indigo-50/40 p-3"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                                                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                                            {t('progress.group_activity')}
                                                        </span>
                                                        {group.sub_theme ?? t('progress')}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {formatDate(group.date)}
                                                        {' · '}
                                                        {group.participant_count} {t('children')}
                                                        {group.teacher ? ` · ${group.teacher.name}` : ''}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setExpandedGroups((current) =>
                                                                current.includes(group.id)
                                                                    ? current.filter((id) => id !== group.id)
                                                                    : [...current, group.id],
                                                            )
                                                        }
                                                        className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                                                        aria-label={t('progress.participants')}
                                                        aria-expanded={expanded}
                                                    >
                                                        <ChevronDown
                                                            className={cn(
                                                                'size-4 transition-transform',
                                                                expanded && 'rotate-180',
                                                            )}
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setGroupDeleteTarget(group)}
                                                        className="rounded-md p-1 text-destructive hover:bg-accent"
                                                        aria-label={t('delete')}
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                                    {progressLabel(
                                                        'progress_development',
                                                        group.development_proficiency,
                                                    )}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    PERMATA:{' '}
                                                    {progressLabel('progress_permata', group.permata_activity)} ·{' '}
                                                    {t('free_activity')}:{' '}
                                                    {progressLabel('progress_free', group.free_activity)}
                                                </span>
                                            </div>

                                            {group.notes && (
                                                <p className="mt-2 rounded bg-white/70 px-2 py-1.5 text-xs text-muted-foreground">
                                                    {group.notes}
                                                </p>
                                            )}

                                            {group.photo && (
                                                <div className="mt-2">
                                                    <PhotoThumb photo={group.photo} size="size-20" />
                                                </div>
                                            )}

                                            {expanded && (
                                                <div className="mt-2 space-y-1 rounded-lg bg-white/80 p-2">
                                                    {group.records.map((record) => (
                                                        <div
                                                            key={record.id}
                                                            className="flex flex-wrap items-center justify-between gap-2 text-xs"
                                                        >
                                                            <span className="font-medium">
                                                                {record.student.name}
                                                            </span>
                                                            <span className="flex items-center gap-1.5">
                                                                <RatingChip value={record.activity_done} />
                                                                <RatingChip value={record.child_proficiency} />
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                            {showIndividual &&
                                records.map((r) => (
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
                                            <div className="flex shrink-0 items-center gap-1">
                                                {r.teacher && (
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {r.teacher.name}
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => editRecord(r)}
                                                    className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                                                    aria-label={t('edit')}
                                                >
                                                    <Pencil className="size-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(r)}
                                                    className="rounded-md p-1 text-destructive hover:bg-accent"
                                                    aria-label={t('delete')}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <RatingChip value={r.activity_done} />
                                            <RatingChip value={r.child_proficiency} />
                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                                {progressLabel('progress_development', r.development_proficiency)}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground">
                                                PERMATA: {progressLabel('progress_permata', r.permata_activity)} ·{' '}
                                                {t('free_activity')}:{' '}
                                                {progressLabel('progress_free', r.free_activity)}
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

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(v) => !v && setDeleteTarget(null)}
                title={`${t('delete')} ${deleteTarget?.student.name ?? ''}?`}
                description={t('cannot_be_undone')}
                confirmLabel={t('delete')}
                onConfirm={confirmDelete}
            />

            <ConfirmDialog
                open={groupDeleteTarget !== null}
                onOpenChange={(v) => !v && setGroupDeleteTarget(null)}
                title={`${t('delete')} ${t('progress.group_activity')}?`}
                description={t('progress.group_delete_desc')}
                confirmLabel={t('delete')}
                onConfirm={confirmDeleteGroup}
            />
        </AppShell>
    );
}

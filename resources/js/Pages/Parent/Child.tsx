import { Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, BookOpen, CalendarCheck, CreditCard, GraduationCap, History, MessagesSquare, Pill, Ruler } from 'lucide-react';
import { useState } from 'react';

import PageHeader from '@/Components/page-header';
import PhotoThumb from '@/Components/photo-thumb';
import RatingChip from '@/Components/rating-chip';
import StatusBadge from '@/Components/status-badge';
import AttendanceActions, { type AttendanceSummary } from '@/Components/attendance-actions';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { useI18n } from '@/lib/i18n';
import { formatDate } from '@/lib/date';
import { parentBottomNav, parentNav } from '@/lib/navigation';
import type { PhotoInfo } from '@/lib/photo';
import type { PageProps } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Child = { id: number; name: string; age: number | null; class: string; unpaid: number; attendance?: AttendanceSummary };
type Update = {
    id: number;
    date: string;
    arrival_time: string | null;
    sleep_status: string;
    bath_status: string;
    health_status: string | null;
    parent_notes: string | null;
};
type Activity = {
    id: number;
    date: string;
    treatment_notes: string | null;
    teacher: { name: string } | null;
    [key: string]: unknown;
};
type Progress = {
    id: number;
    date: string;
    sub_theme: string | null;
    activity_done: string;
    child_proficiency: string;
    permata_activity: string;
    free_activity: string;
    development_proficiency: string;
    notes: string | null;
    photo?: PhotoInfo | null;
};
type HistoryRow = {
    id: number;
    date: string;
    day: string;
    status: 'none' | 'school' | 'home';
    arrived_at: string | null;
    departed_at: string | null;
    temperature: string | null;
    health_note: string | null;
};

type Medication = {
    id: number;
    date: string;
    medicine: string;
    dosage: string | null;
    time_due: string | null;
    notes: string | null;
    status: 'pending' | 'given' | 'declined';
    given_at: string | null;
    given_by: string | null;
};

type Growth = {
    id: number;
    date: string;
    height_cm: number | null;
    weight_kg: number | null;
    bmi: number | null;
    notes: string | null;
};

type Page = PageProps<{
    child: Child;
    updates: Update[];
    activities: Activity[];
    progress: Progress[];
    attendanceHistory: HistoryRow[];
    medications: Medication[];
    growth: Growth[];
    fields: Record<string, string>;
}>;

export default function ParentChild() {
    const { t } = useI18n();
    const { props } = usePage<Page>();
    const { child, updates, activities, progress, attendanceHistory, medications, growth, fields } = props;
    const [paying, setPaying] = useState(false);
    const [showMed, setShowMed] = useState(false);

    const medForm = useForm({
        date: new Date().toISOString().slice(0, 10),
        medicine: '',
        dosage: '',
        time_due: '',
        notes: '',
    });

    const submitMed = () =>
        medForm.post(route('parent.medications.store', { student: child.id }), {
            preserveScroll: true,
            onSuccess: () => {
                medForm.reset();
                setShowMed(false);
            },
        });

    const checkout = () => {
        setPaying(true);
        router.post(
            route('parent.payments.checkout'),
            { student_id: child.id },
            { preserveScroll: true, onFinish: () => setPaying(false) },
        );
    };

    return (
        <AppShell nav={parentNav} bottomNav={parentBottomNav} title={t('parent')}>
            <PageHeader title={child.name} description={`${child.class}${child.age ? ` · ${child.age} thn` : ''}`}>
                <Link href="/parent">
                    <Button variant="outline" className="gap-1.5">
                        <ArrowLeft className="size-4" />
                        {t('dashboard')}
                    </Button>
                </Link>
            </PageHeader>

            {/* Balance + quick actions */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardContent className="space-y-4 pt-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-navy text-white">
                                <GraduationCap className="size-6" />
                            </span>
                            <div>
                                <p className="text-xs text-muted-foreground">{t('outstanding')}</p>
                                <p
                                    className={`text-xl font-bold ${child.unpaid > 0 ? 'text-amber-600' : 'text-emerald-600'}`}
                                >
                                    RM {child.unpaid.toFixed(2)}
                                </p>
                            </div>
                        </div>
                        <StatusBadge
                            status={child.unpaid > 0 ? 'unpaid' : 'paid'}
                            label={child.unpaid > 0 ? 'Unpaid' : 'Paid up'}
                        />
                    </div>

                    {child.unpaid > 0 && (
                        <Button onClick={checkout} disabled={paying} className="h-11 w-full rounded-xl font-semibold">
                            <CreditCard className="mr-2 size-4" />
                            {paying ? 'Redirecting…' : `Pay RM ${child.unpaid.toFixed(2)}`}
                        </Button>
                    )}

                    <AttendanceActions
                        studentId={child.id}
                        studentName={child.name}
                        attendance={child.attendance}
                        role="parent"
                    />

                    <div className="grid grid-cols-2 gap-2">
                        <Link href={`/parent/daily-update?student_id=${child.id}`}>
                            <Button variant="outline" className="h-11 w-full gap-1.5">
                                <CalendarCheck className="size-4" />
                                {t('daily_update')}
                            </Button>
                        </Link>
                        <Link href="/parent/messages">
                            <Button variant="outline" className="h-11 w-full gap-1.5">
                                <MessagesSquare className="size-4" />
                                {t('messages')}
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Attendance history */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <History className="size-4 text-primary" />
                        {t('attendance_history')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {attendanceHistory.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        <div className="space-y-1.5">
                            {attendanceHistory.map((row) => {
                                const meta =
                                    row.status === 'school'
                                        ? { label: t('at_school'), cls: 'bg-sky-100 text-sky-700' }
                                        : row.status === 'home'
                                          ? { label: t('back_home'), cls: 'bg-emerald-100 text-emerald-700' }
                                          : { label: t('not_arrived'), cls: 'bg-slate-100 text-slate-600' };

                                return (
                                    <div
                                        key={row.id}
                                        className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium">{formatDate(row.date)}</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {t('arrived_at')}: {row.arrived_at ?? '—'} ·{' '}
                                                {t('departed_at')}: {row.departed_at ?? '—'}
                                                {row.temperature ? ` · ${row.temperature}°C` : ''}
                                            </p>
                                        </div>
                                        <span
                                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.cls}`}
                                        >
                                            {meta.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Daily updates */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarCheck className="size-4 text-primary" />
                        {t('daily_updates')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {updates.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        <div className="space-y-2">
                            {updates.map((u) => (
                                <div key={u.id} className="rounded-xl bg-muted/50 px-3 py-2.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{u.date}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {u.arrival_time ? `Tiba ${u.arrival_time}` : ''}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Tidur: {u.sleep_status} · Mandi: {u.bath_status}
                                        {u.health_status ? ` · Sihat: ${u.health_status}` : ''}
                                    </p>
                                    {u.parent_notes && (
                                        <p className="mt-1 text-[11px] italic">{u.parent_notes}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Medication */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Pill className="size-4 text-primary" />
                        {t('medication')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {medications.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('no_medication')}</p>
                    ) : (
                        medications.map((m) => (
                            <div key={m.id} className="flex items-start justify-between gap-2 rounded-xl border p-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                        {m.medicine}
                                        {m.dosage ? ` · ${m.dosage}` : ''}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {m.date}
                                        {m.time_due ? ` · ${m.time_due}` : ''}
                                        {m.given_at ? ` · ${t('given_at')} ${m.given_at}` : ''}
                                    </p>
                                    {m.notes && <p className="text-[11px] text-muted-foreground">{m.notes}</p>}
                                </div>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                        m.status === 'given'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : m.status === 'declined'
                                              ? 'bg-rose-100 text-rose-700'
                                              : 'bg-amber-100 text-amber-700'
                                    }`}
                                >
                                    {t(m.status)}
                                </span>
                            </div>
                        ))
                    )}

                    {showMed && (
                        <div className="space-y-2 rounded-xl border p-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="med-date">{t('date')}</Label>
                                    <Input
                                        id="med-date"
                                        type="date"
                                        value={medForm.data.date}
                                        onChange={(e) => medForm.setData('date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="med-time">{t('time_due')}</Label>
                                    <Input
                                        id="med-time"
                                        type="time"
                                        value={medForm.data.time_due}
                                        onChange={(e) => medForm.setData('time_due', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="med-medicine">{t('medicine')}</Label>
                                <Input
                                    id="med-medicine"
                                    value={medForm.data.medicine}
                                    onChange={(e) => medForm.setData('medicine', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="med-dosage">{t('dosage')}</Label>
                                <Input
                                    id="med-dosage"
                                    placeholder="e.g. 5ml"
                                    value={medForm.data.dosage}
                                    onChange={(e) => medForm.setData('dosage', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="med-notes">{t('medication_notes')}</Label>
                                <Input
                                    id="med-notes"
                                    value={medForm.data.notes}
                                    onChange={(e) => medForm.setData('notes', e.target.value)}
                                />
                            </div>
                            {(medForm.errors.medicine || medForm.errors.date) && (
                                <p className="text-xs text-destructive">
                                    {medForm.errors.medicine ?? medForm.errors.date}
                                </p>
                            )}
                            <Button
                                onClick={submitMed}
                                disabled={medForm.processing}
                                className="h-10 w-full rounded-xl"
                            >
                                {t('request_medication')}
                            </Button>
                        </div>
                    )}

                    <Button
                        variant="outline"
                        className="w-full rounded-xl"
                        onClick={() => setShowMed((v) => !v)}
                    >
                        <Pill className="mr-2 size-4" />
                        {t('request_medication')}
                    </Button>
                </CardContent>
            </Card>

            {/* Growth */}
            {growth.length > 0 && (
                <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Ruler className="size-4 text-primary" />
                            {t('growth')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-xl bg-muted/50 py-2">
                                <p className="text-lg font-bold">{growth[0].height_cm ?? '—'}</p>
                                <p className="text-[10px] text-muted-foreground">{t('height_cm')}</p>
                            </div>
                            <div className="rounded-xl bg-muted/50 py-2">
                                <p className="text-lg font-bold">{growth[0].weight_kg ?? '—'}</p>
                                <p className="text-[10px] text-muted-foreground">{t('weight_kg')}</p>
                            </div>
                            <div className="rounded-xl bg-muted/50 py-2">
                                <p className="text-lg font-bold">{growth[0].bmi ?? '—'}</p>
                                <p className="text-[10px] text-muted-foreground">{t('bmi')}</p>
                            </div>
                        </div>
                        {growth.length > 1 && (
                            <div className="space-y-1">
                                {growth.slice(1).map((g) => (
                                    <div
                                        key={g.id}
                                        className="flex justify-between text-[11px] text-muted-foreground"
                                    >
                                        <span>{g.date}</span>
                                        <span>
                                            {g.height_cm ?? '—'} cm · {g.weight_kg ?? '—'} kg · {t('bmi')}{' '}
                                            {g.bmi ?? '—'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-[10px] text-muted-foreground">{t('bmi_note')}</p>
                    </CardContent>
                </Card>
            )}

            {/* Activities */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen className="size-4 text-primary" />
                        {t('daily_activities')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activities.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        <div className="space-y-3">
                            {activities.map((a) => (
                                <div key={a.id} className="rounded-xl border p-3">
                                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{a.date}</span>
                                        <span>{a.teacher?.name ?? ''}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {Object.entries(fields).map(([key, label]) => {
                                            const yes = a[key] === 'yes';
                                            return (
                                                <div
                                                    key={key}
                                                    className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1 text-[11px]"
                                                >
                                                    <span
                                                        className={`size-1.5 rounded-full ${yes ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
                                                    />
                                                    <span className="flex-1 truncate">{label}</span>
                                                    <span className={yes ? 'text-emerald-600' : 'text-muted-foreground'}>
                                                        {yes ? 'Ya' : 'Tidak'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {a.treatment_notes && (
                                        <p className="mt-2 rounded-lg bg-muted/50 px-2 py-1.5 text-[11px]">
                                            <span className="text-muted-foreground">
                                                {t('treatment_notes')}:{' '}
                                            </span>
                                            {a.treatment_notes}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Progress */}
            <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen className="size-4 text-primary" />
                        {t('progress')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {progress.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        <div className="space-y-2">
                            {progress.map((p) => (
                                <div key={p.id} className="rounded-xl border p-3">
                                    <div className="flex items-center justify-between gap-2 text-sm">
                                        <span className="font-medium">
                                            {p.sub_theme ?? t('progress')}
                                        </span>
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {formatDate(p.date)}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <RatingChip value={p.activity_done} />
                                        <RatingChip value={p.child_proficiency} />
                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                            {p.development_proficiency}
                                        </span>
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                                        {t('permata_activity')}: {p.permata_activity} · {t('free_activity')}:{' '}
                                        {p.free_activity}
                                    </p>
                                    {p.notes && (
                                        <p className="mt-1 text-[11px] italic text-muted-foreground">
                                            {p.notes}
                                        </p>
                                    )}
                                    {p.photo && (
                                        <div className="mt-2">
                                            <PhotoThumb photo={p.photo} size="size-20" />
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
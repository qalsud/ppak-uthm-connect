import { router } from '@inertiajs/react';
import { CalendarClock, CalendarOff, ChevronLeft, ChevronRight, Pill, UserCheck } from 'lucide-react';
import { useState } from 'react';

import AttendanceActions, { type AttendanceSummary } from '@/Components/attendance-actions';
import type { Collector } from '@/Components/checkout-dialog';
import ConfirmDialog from '@/Components/confirm-dialog';
import PageHeader from '@/Components/page-header';
import { ProofLink, type Proof } from '@/Components/proof-upload';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { localDate, shiftDate, futureDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { actionRoute, actionUrl, shellFor } from '@/lib/shell';
import AppShell from '@/Layouts/app-shell';

type Student = {
    id: number;
    name: string;
    class: string;
    allergies?: string | null;
    alerts?: string[];
    collectors?: Collector[];
    attendance: AttendanceSummary;
};

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : c === '6bintang' ? '6 Bintang' : c);

type Medication = {
    id: number;
    student: string | null;
    medicine: string;
    dosage: string | null;
    time_due: string | null;
    notes: string | null;
    status: 'pending' | 'given' | 'declined';
    given_at: string | null;
    given_by: string | null;
};

type Absence = {
    id: number;
    student: string | null;
    start_date: string;
    end_date: string;
    days: number;
    type: 'sick' | 'personal' | 'other';
    reason: string | null;
    status: 'pending' | 'approved' | 'declined';
    review_note: string | null;
    reviewed_by: string | null;
    requested_by: string | null;
    attachments: Proof[];
};

export default function TeacherAttendance({
    students,
    selectedClass,
    assignedClass,
    date,
    isToday,
    counts,
    medications,
    absenceRequests,
    upcomingAbsences,
    absenceCounts,
    shellProp,
}: {
    shellProp?: string;
    students: Student[];
    selectedClass: string;
    assignedClass?: string | null;
    date: string;
    isToday: boolean;
    counts: { school: number; home: number; absent: number; none: number };
    medications: Medication[];
    absenceRequests: Absence[];
    upcomingAbsences: Absence[];
    absenceCounts: { pending: number; approved: number };
}) {
    const { t } = useI18n();
    const shell = shellFor(shellProp);
    const [markAllOpen, setMarkAllOpen] = useState(false);

    const act = (id: number, status: 'given' | 'declined') =>
        router.post(
            actionRoute(shell.isAdmin, 'medications.update', { medication: id }),
            { status },
            { preserveScroll: true },
        );

    const review = (id: number, status: 'approved' | 'declined') =>
        router.post(
            actionRoute(shell.isAdmin, 'absences.update', { absence: id }),
            { status },
            { preserveScroll: true },
        );

    const reload = (params: { class?: string; date?: string }) => {
        router.get(
            actionUrl(shell.isAdmin, 'attendance'),
            { class: params.class ?? selectedClass, date: params.date ?? date },
            { preserveState: true, preserveScroll: true },
        );
    };

    const statusMeta = (status: AttendanceSummary['status']) =>
        status === 'school'
            ? { label: t('at_school'), cls: 'bg-sky-100 text-sky-700' }
            : status === 'home'
              ? { label: t('back_home'), cls: 'bg-emerald-100 text-emerald-700' }
              : status === 'absent'
                ? { label: t('absent'), cls: 'bg-rose-100 text-rose-700' }
                : { label: t('not_arrived'), cls: 'bg-slate-100 text-slate-600' };

    const summary = [
        { label: t('at_school'), value: counts.school, cls: 'text-sky-600' },
        { label: t('back_home'), value: counts.home, cls: 'text-emerald-600' },
        { label: t('absent'), value: counts.absent, cls: 'text-rose-600' },
        { label: t('not_arrived'), value: counts.none, cls: 'text-slate-500' },
    ];

    return (
        <AppShell nav={shell.nav} bottomNav={shell.bottomNav} title={t(shell.title)}>
            <PageHeader title={t('attendance')} description={t('attendance_register')}>
                <div className="flex flex-wrap items-center gap-2">
                    {!assignedClass && (
                        <div className="w-40">
                            <Select value={selectedClass} onValueChange={(v) => reload({ class: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5tahun">5 Tahun</SelectItem>
                                    <SelectItem value="6bintang">6 Bintang</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <Button
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setMarkAllOpen(true)}
                    >
                        <UserCheck className="size-4" />
                        {t('mark_all_present')}
                    </Button>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-10"
                            aria-label={t('previous_day')}
                            onClick={() => reload({ date: shiftDate(date, -1) })}
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                        <input
                            type="date"
                            value={date}
                            max={futureDate(90)}
                            onChange={(e) => reload({ date: e.target.value })}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        />
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-10"
                            aria-label={t('next_day')}
                            onClick={() => reload({ date: shiftDate(date, 1) })}
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>
                    {!isToday && (
                        <Button variant="outline" size="sm" className="h-10" onClick={() => reload({ date: localDate() })}>
                            {t('today')}
                        </Button>
                    )}
                </div>
            </PageHeader>

            {/* Summary */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {summary.map((s) => (
                    <Card key={s.label} className="rounded-2xl border-0 shadow-sm">
                        <CardContent className="py-4 text-center">
                            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
                            <p className="text-[11px] text-muted-foreground">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Absences: today's, plus everything upcoming for this class */}
            {(absenceRequests.length > 0 || upcomingAbsences.length > 0) && (
                <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <CalendarOff className="size-4 text-primary" />
                            {t('absences')}
                            {absenceCounts.pending > 0 && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                    {absenceCounts.pending} {t('pending')}
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {/* Anything still to come — actionable from any date. */}
                        {upcomingAbsences.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t('upcoming_absences')}
                                </p>
                                {upcomingAbsences.map((a) => (
                                    <div
                                        key={a.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed p-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium">
                                                {a.student} · {t(`absence.${a.type}`)} · {a.days}{' '}
                                                {t('absence_days')}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {a.start_date === a.end_date
                                                    ? a.start_date
                                                    : `${a.start_date} → ${a.end_date}`}
                                                {a.reason ? ` · ${a.reason}` : ''}
                                            </p>
                                            {a.attachments.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-1.5">
                                                    {a.attachments.map((proof) => (
                                                        <ProofLink key={proof.id} proof={proof} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs"
                                                onClick={() => reload({ date: a.start_date })}
                                            >
                                                {t('view_day')}
                                            </Button>
                                            {a.status === 'pending' ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        className="h-8 rounded-lg text-xs"
                                                        onClick={() => review(a.id, 'approved')}
                                                    >
                                                        {t('approve')}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 rounded-lg text-xs"
                                                        onClick={() => review(a.id, 'declined')}
                                                    >
                                                        {t('decline')}
                                                    </Button>
                                                </>
                                            ) : (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                                    {t(a.status)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* The absences actually covering the day being viewed. */}
                        {absenceRequests.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t('absences_this_day')}
                                </p>
                                {absenceRequests.map((a) => (
                                    <div
                                        key={a.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium">
                                                {a.student} · {t(`absence.${a.type}`)} · {a.days}{' '}
                                                {t('absence_days')}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {a.start_date === a.end_date
                                                    ? a.start_date
                                                    : `${a.start_date} → ${a.end_date}`}
                                                {a.reason ? ` · ${a.reason}` : ''}
                                            </p>
                                            {a.attachments.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-1.5">
                                                    {a.attachments.map((proof) => (
                                                        <ProofLink key={proof.id} proof={proof} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {a.status === 'pending' ? (
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="h-8 rounded-lg text-xs"
                                                    onClick={() => review(a.id, 'approved')}
                                                >
                                                    {t('approve')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 rounded-lg text-xs"
                                                    onClick={() => review(a.id, 'declined')}
                                                >
                                                    {t('decline')}
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                                {t(a.status)}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Today's medication requests */}
            {medications.length > 0 && (
                <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Pill className="size-4 text-primary" />
                            {t('medications')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {medications.map((m) => (
                            <div
                                key={m.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                        {m.student} · {m.medicine}
                                        {m.dosage ? ` · ${m.dosage}` : ''}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {m.time_due ? `${m.time_due}` : ''}
                                        {m.notes ? ` · ${m.notes}` : ''}
                                        {m.given_at ? ` · ${t('given_at')} ${m.given_at}` : ''}
                                    </p>
                                </div>
                                {m.status === 'pending' ? (
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className="h-8 rounded-lg text-xs"
                                            onClick={() => act(m.id, 'given')}
                                        >
                                            {t('mark_given')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 rounded-lg text-xs"
                                            onClick={() => act(m.id, 'declined')}
                                        >
                                            {t('mark_not_given')}
                                        </Button>
                                    </div>
                                ) : (
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                            m.status === 'given'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-rose-100 text-rose-700'
                                        }`}
                                    >
                                        {t(m.status)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarClock className="size-4 text-primary" />
                        {classLabel(selectedClass)}
                        {!isToday && (
                            <span className="text-xs font-normal text-muted-foreground">
                                · {date}
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>

                {/* Mobile cards */}
                <CardContent className="space-y-3 lg:hidden">
                    {students.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        students.map((s) => (
                            <div key={s.id} className="rounded-xl border p-3">
                                <p className="mb-2 font-medium">{s.name}</p>
                                {s.allergies && (
                                    <p className="mb-2 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700">
                                        {t('allergies')}: {s.allergies}
                                    </p>
                                )}
                                {s.alerts && s.alerts.length > 0 && (
                                    <div className="mb-2 flex flex-wrap gap-1">
                                        {s.alerts.map((a) => (
                                            <span
                                                key={a}
                                                className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700"
                                            >
                                                {t(`alert.${a}`)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <AttendanceActions
                                    studentId={s.id}
                                    studentName={s.name}
                                    attendance={s.attendance}
                                    role="teacher"
                                    date={date}
                                    collectors={s.collectors ?? []}
                                                    isAdmin={shell.isAdmin}
                                />
                            </div>
                        ))
                    )}
                </CardContent>

                {/* Desktop table */}
                <CardContent className="hidden lg:block">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead>{t('name')}</TableHead>
                                <TableHead>{t('arrived_at')}</TableHead>
                                <TableHead>{t('departed_at')}</TableHead>
                                <TableHead>{t('status')}</TableHead>
                                <TableHead className="text-right">{t('action')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map((s) => {
                                const meta = statusMeta(s.attendance.status);

                                return (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">
                                            {s.name}
                                            {s.allergies && (
                                                <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                                                    {t('allergies')}: {s.allergies}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>{s.attendance.arrived_at ?? '—'}</TableCell>
                                        <TableCell>{s.attendance.departed_at ?? '—'}</TableCell>
                                        <TableCell>
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.cls}`}
                                            >
                                                {meta.label}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="ml-auto flex w-64 justify-end">
                                                <AttendanceActions
                                                    studentId={s.id}
                                                    studentName={s.name}
                                                    attendance={s.attendance}
                                                    role="teacher"
                                                    date={date}
                                                    showChip={false}
                                                    collectors={s.collectors ?? []}
                                                    isAdmin={shell.isAdmin}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <ConfirmDialog
                open={markAllOpen}
                onOpenChange={setMarkAllOpen}
                title={t('mark_all_present')}
                description={t('mark_all_present_desc')}
                confirmLabel={t('mark_all_present')}
                destructive={false}
                onConfirm={() =>
                    router.post(
                        actionRoute(shell.isAdmin, 'attendance.mark-all'),
                        { class: selectedClass, date },
                        { preserveScroll: true, onFinish: () => setMarkAllOpen(false) },
                    )
                }
            />
        </AppShell>
    );
}

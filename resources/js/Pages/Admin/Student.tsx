import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, BookOpen, CalendarCheck, CreditCard, GraduationCap, History, Users } from 'lucide-react';

import PageHeader from '@/Components/page-header';
import PhotoThumb from '@/Components/photo-thumb';
import RatingChip from '@/Components/rating-chip';
import StatusBadge from '@/Components/status-badge';
import StudentProfileCard, { type StudentProfile } from '@/Components/student-profile-card';
import ChildContactsManager, { type Contacts } from '@/Components/child-contacts-manager';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { formatDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { listLabel, useLists } from '@/lib/lists';
import type { PhotoInfo } from '@/lib/photo';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import type { PageProps } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Student = {
    id: number;
    name: string;
    age: number | null;
    class: string;
    parent: { id: number; name: string; email: string } | null;
    unpaid: number;
};

type HistoryRow = {
    id: number;
    date: string;
    status: 'none' | 'school' | 'home' | 'absent';
    arrived_at: string | null;
    departed_at: string | null;
    photo: PhotoInfo | null;
    note: string | null;
    photo_override: boolean;
};

type Progress = {
    id: number;
    date: string;
    sub_theme: string | null;
    activity_done: string;
    child_proficiency: string;
    development_proficiency: string;
    permata_activity: string;
    free_activity: string;
    notes: string | null;
    photo?: PhotoInfo | null;
};

type Page = PageProps<{
    student: Student;
    profile: StudentProfile;
    contacts: Contacts;
    attendance: HistoryRow[];
    updates: Array<{
        id: number;
        date: string;
        arrival_time: string | null;
        sleep_status: string;
        bath_status: string;
        health_status: string | null;
        parent_notes: string | null;
    }>;
    activities: Array<{ id: number; date: string; teacher: { name: string } | null; [key: string]: unknown }>;
    progress: Progress[];
    payments: Array<{
        id: number;
        month: string;
        amount: string;
        status: 'paid' | 'unpaid';
        paid_on: string | null;
    }>;
    fields: Record<string, string>;
}>;

export default function AdminStudent() {
    const { t } = useI18n();
    const lists = useLists();
    const { props } = usePage<Page>();
    const { student, profile, contacts, attendance, updates, activities, progress, payments, fields } = props;

    const statusMeta = (status: HistoryRow['status']) =>
        status === 'school'
            ? { label: t('at_school'), cls: 'bg-sky-100 text-sky-700' }
            : status === 'home'
              ? { label: t('back_home'), cls: 'bg-emerald-100 text-emerald-700' }
              : status === 'absent'
                ? { label: t('absent'), cls: 'bg-rose-100 text-rose-700' }
                : { label: t('not_arrived'), cls: 'bg-slate-100 text-slate-600' };

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader
                title={student.name}
                description={`${student.class}${student.age ? ` · ${student.age}` : ''}`}
            >
                <Link href="/admin/students">
                    <Button variant="outline" className="gap-1.5">
                        <ArrowLeft className="size-4" />
                        {t('students')}
                    </Button>
                </Link>
            </PageHeader>

            <div className="mb-4 grid gap-4 lg:grid-cols-2">
                <StudentProfileCard profile={profile} />
                <ChildContactsManager studentId={student.id} contacts={contacts} />
            </div>

            {/* Summary */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardContent className="grid gap-3 pt-5 sm:grid-cols-3">
                    <div className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-brand-navy text-white">
                            <GraduationCap className="size-5" />
                        </span>
                        <div>
                            <p className="text-xs text-muted-foreground">{t('class')}</p>
                            <p className="text-sm font-semibold">{student.class}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                            <Users className="size-5" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">{t('parent')}</p>
                            <p className="truncate text-sm font-semibold">
                                {student.parent?.name ?? t('unassigned')}
                            </p>
                            {student.parent && (
                                <p className="truncate text-[11px] text-muted-foreground">
                                    {student.parent.email}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                            <CreditCard className="size-5" />
                        </span>
                        <div>
                            <p className="text-xs text-muted-foreground">{t('outstanding')}</p>
                            <p
                                className={`text-sm font-semibold ${
                                    student.unpaid > 0 ? 'text-amber-600' : 'text-emerald-600'
                                }`}
                            >
                                RM {student.unpaid.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Attendance */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarCheck className="size-4 text-primary" />
                        {t('attendance_history')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {attendance.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        <div className="space-y-1.5">
                            {attendance.map((row) => {
                                const meta = statusMeta(row.status);

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
                                            </p>
                                            {row.photo_override && (
                                                <p className="text-[11px] text-amber-600">
                                                    {t('photo_override')}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            {row.photo && <PhotoThumb photo={row.photo} size="size-10" />}
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.cls}`}
                                            >
                                                {meta.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Progress */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
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
                                        <span className="font-medium">{p.sub_theme ?? t('progress')}</span>
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {formatDate(p.date)}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <RatingChip value={p.activity_done} />
                                        <RatingChip value={p.child_proficiency} />
                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                            {listLabel(lists, 'progress_development', p.development_proficiency)}
                                        </span>
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                                        {t('permata_activity')}: {listLabel(lists, 'progress_permata', p.permata_activity)} ·{' '}
                                        {t('free_activity')}: {listLabel(lists, 'progress_free', p.free_activity)}
                                    </p>
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

            {/* Daily updates */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <History className="size-4 text-primary" />
                        {t('daily_updates')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {updates.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        <div className="space-y-2">
                            {updates.map((u) => (
                                <div key={u.id} className="rounded-xl bg-muted/50 px-3 py-2.5 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{formatDate(u.date)}</span>
                                        <span className="text-muted-foreground">
                                            {u.arrival_time ? `${t('arrived_at')} ${u.arrival_time}` : ''}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-muted-foreground">
                                        {u.sleep_status} · {u.bath_status}
                                        {u.health_status ? ` · ${u.health_status}` : ''}
                                    </p>
                                    {u.parent_notes && <p className="mt-1 italic">{u.parent_notes}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Activities */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarCheck className="size-4 text-primary" />
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
                                        <span>{formatDate(a.date as string)}</span>
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
                                                        className={`size-1.5 rounded-full ${
                                                            yes ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                                                        }`}
                                                    />
                                                    <span className="flex-1 truncate">{label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Payments */}
            <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CreditCard className="size-4 text-primary" />
                        {t('payments')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {payments.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        <div className="space-y-1.5">
                            {payments.map((p) => (
                                <div
                                    key={p.id}
                                    className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-xs"
                                >
                                    <span className="font-medium">{p.month}</span>
                                    <span className="flex items-center gap-2">
                                        <span>RM {Number(p.amount).toFixed(2)}</span>
                                        <StatusBadge
                                            status={p.status}
                                            label={p.status === 'paid' ? t('paid') : t('unpaid')}
                                        />
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

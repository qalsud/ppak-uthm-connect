import { Link, usePage } from '@inertiajs/react';
import {
    BellRing,
    BookOpen,
    CalendarCheck,
    CheckCircle2,
    FileText,
    Plus,
    XCircle,
} from 'lucide-react';

import PageHeader from '@/Components/page-header';
import StatCard from '@/Components/stat-card';
import StatusBadge from '@/Components/status-badge';
import AttendanceActions, { type AttendanceSummary } from '@/Components/attendance-actions';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { useI18n } from '@/lib/i18n';
import { teacherBottomNav, teacherNav } from '@/lib/navigation';
import type { PageProps } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Student = {
    id: number;
    name: string;
    class: string;
    activity_logged: boolean;
    update_received: boolean;
    attendance?: AttendanceSummary;
};

type Page = PageProps<{
    students: Student[];
    today: string;
    activityCount: number;
    updateCount: number;
    memoCount: number;
    recentActivities: Array<{ id: number; date: string; student: string }>;
}>;

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : '6 Bintang');

export default function TeacherDashboard() {
    const { t } = useI18n();
    const { props } = usePage<Page>();

    const students = props.students as Page['students'];
    const activityCount = (props.activityCount as number) ?? 0;
    const updateCount = (props.updateCount as number) ?? 0;
    const memoCount = (props.memoCount as number) ?? 0;
    const recentActivities = props.recentActivities as Page['recentActivities'];

    const actions = [
        { label: t('record_new'), href: '/teacher/activities', icon: CalendarCheck, tint: 'bg-sky-100 text-sky-600' },
        { label: t('progress'), href: '/teacher/progress', icon: BookOpen, tint: 'bg-violet-100 text-violet-600' },
        { label: t('daily_updates'), href: '/teacher/daily-updates', icon: BellRing, tint: 'bg-amber-100 text-amber-600' },
        { label: t('memos'), href: '/teacher/memos', icon: FileText, tint: 'bg-emerald-100 text-emerald-600' },
    ];

    return (
        <AppShell nav={teacherNav} bottomNav={teacherBottomNav} title={t('teacher')}>
            <PageHeader
                title={`${t('welcome')}, ${props.auth.user.name.split(' ')[0]}`}
                description="Here's what's happening in class today"
            >
                <Link href="/teacher/activities" className="hidden sm:block">
                    <Button className="gap-1.5">
                        <Plus className="size-4" />
                        {t('record_new')}
                    </Button>
                </Link>
            </PageHeader>

            {/* Quick actions */}
            <div className="mb-6 grid grid-cols-4 gap-3">
                {actions.map((a) => (
                    <Link key={a.href} href={a.href} className="flex flex-col items-center gap-2">
                        <span className={`flex size-14 items-center justify-center rounded-2xl ${a.tint}`}>
                            <a.icon className="size-6" />
                        </span>
                        <span className="text-center text-[11px] font-medium text-muted-foreground">
                            {a.label}
                        </span>
                    </Link>
                ))}
            </div>

            {/* KPIs */}
            <div className="mb-6 grid grid-cols-2 gap-3">
                <StatCard label={t('students')} value={students.length} icon={CalendarCheck} />
                <StatCard label={`${t('daily_activities')} (${t('today').toLowerCase()})`} value={activityCount} icon={CalendarCheck} />
                <StatCard label={`${t('daily_updates')} (${t('today').toLowerCase()})`} value={updateCount} icon={BellRing} />
                <StatCard label={t('memos')} value={memoCount} icon={FileText} />
            </div>

            {/* Students — cards on mobile, table on desktop */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('students')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 lg:hidden">
                    {students.map((s) => (
                        <div key={s.id} className="rounded-xl border p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{s.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {classLabel(s.class)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <StatusBadge
                                    status={s.activity_logged ? 'paid' : 'unpaid'}
                                    label={s.activity_logged ? 'Activity logged' : 'Activity pending'}
                                />
                                <StatusBadge
                                    status={s.update_received ? 'active' : 'neutral'}
                                    label={s.update_received ? 'Update received' : 'No update'}
                                />
                            </div>
                            <div className="mt-3">
                                <AttendanceActions
                                    studentId={s.id}
                                    attendance={s.attendance}
                                    role="teacher"
                                />
                            </div>
                        </div>
                    ))}
                </CardContent>
                <CardContent className="hidden lg:block">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead>{t('name')}</TableHead>
                                <TableHead>{t('class')}</TableHead>
                                <TableHead>{t('daily_activities')}</TableHead>
                                <TableHead>{t('daily_updates')}</TableHead>
                                <TableHead>Attendance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">{s.name}</TableCell>
                                    <TableCell>{classLabel(s.class)}</TableCell>
                                    <TableCell>
                                        {s.activity_logged ? (
                                            <StatusBadge status="paid" label="Logged" />
                                        ) : (
                                            <StatusBadge status="neutral" label="Not logged" />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {s.update_received ? (
                                            <StatusBadge status="active" label="Received" />
                                        ) : (
                                            <StatusBadge status="neutral" label="Pending" />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="min-w-[220px]">
                                            <AttendanceActions
                                                studentId={s.id}
                                                attendance={s.attendance}
                                                role="teacher"
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Recent activities */}
            <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen className="size-4 text-primary" />
                        {t('recent_records')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {recentActivities.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            {t('no_data')}
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {recentActivities.map((a) => (
                                <div
                                    key={a.id}
                                    className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5"
                                >
                                    <span className="text-sm font-medium">{a.student}</span>
                                    <span className="text-xs text-muted-foreground">{a.date}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </AppShell>
    );
}
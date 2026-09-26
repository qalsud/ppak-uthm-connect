import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    CalendarCheck,
    CheckCircle2,
    Clock,
    FileText,
    Plus,
    Users,
    XCircle,
} from 'lucide-react';

import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { useI18n } from '@/lib/i18n';
import { teacherNav } from '@/lib/navigation';
import type { PageProps } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Student = {
    id: number;
    name: string;
    class: string;
    activity_logged: boolean;
    update_received: boolean;
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

    const kpis = [
        { label: t('students'), value: students.length, icon: Users },
        { label: `${t('daily_activities')} (${t('today').toLowerCase()})`, value: activityCount, icon: CalendarCheck },
        { label: `${t('daily_updates')} (${t('today').toLowerCase()})`, value: updateCount, icon: Clock },
        { label: t('memos'), value: memoCount, icon: FileText },
    ];

    return (
        <AppShell nav={teacherNav} title={t('teacher')}>
            {/* Welcome hero */}
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {t('welcome')} back, {props.auth.user.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Here's what's happening in class today
                    </p>
                </div>
                <Link href="/teacher/activities">
                    <Button className="gap-1.5">
                        <Plus className="size-4" />
                        {t('record_new')}
                    </Button>
                </Link>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {kpis.map((kpi) => {
                    const Icon = kpi.icon;

                    return (
                        <Card key={kpi.label} className="rounded-2xl">
                            <CardContent className="flex items-center gap-3 py-4">
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                                    <Icon className="size-5" />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-xs text-muted-foreground">
                                        {kpi.label}
                                    </p>
                                    <p className="text-xl font-bold text-foreground">
                                        {kpi.value}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {/* Students table */}
                <Card className="rounded-2xl lg:col-span-2">
                    <CardHeader className="flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-base">{t('students')}</CardTitle>
                            <CardDescription>A sub copy here</CardDescription>
                        </div>
                        <Badge variant="secondary">{t('today')}</Badge>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('name')}</TableHead>
                                    <TableHead>{t('class')}</TableHead>
                                    <TableHead>{t('daily_activities')}</TableHead>
                                    <TableHead>{t('daily_updates')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">{s.name}</TableCell>
                                        <TableCell>{classLabel(s.class)}</TableCell>
                                        <TableCell>
                                            {s.activity_logged ? (
                                                <Badge className="bg-emerald-600 gap-1">
                                                    <CheckCircle2 className="size-3" /> Logged
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="gap-1">
                                                    <XCircle className="size-3" /> Not logged
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {s.update_received ? (
                                                <Badge className="bg-emerald-600 gap-1">
                                                    <CheckCircle2 className="size-3" /> Received
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="gap-1">
                                                    <XCircle className="size-3" /> Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Recent activities list */}
                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BookOpen className="size-4 text-primary" />
                            Recent activities
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentActivities.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                {t('no_data')}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {recentActivities.map((a) => (
                                    <div
                                        key={a.id}
                                        className="flex items-center justify-between rounded-lg border px-3 py-2"
                                    >
                                        <span className="text-sm font-medium">{a.student}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {a.date}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
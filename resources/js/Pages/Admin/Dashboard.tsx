import { Link, usePage } from '@inertiajs/react';
import {
    CalendarClock,
    GraduationCap,
    Plus,
    Users,
    UserCheck,
    Wallet,
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
import StatCard from '@/Components/stat-card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { useI18n } from '@/lib/i18n';
import { adminNav } from '@/lib/navigation';
import type { PageProps } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Stats = {
    students: number;
    teachers: number;
    parents: number;
    pending: number;
    memos: number;
    monthly_income: string;
};

type Page = PageProps<{
    stats: Stats;
    monthlyChart: Array<{ month: string; value: number }>;
    classDistribution: Array<{ label: string; value: number }>;
    recentPayments: Array<{
        id: number;
        student: string;
        month: string;
        amount: number;
        status: string;
        paid_on: string | null;
    }>;
}>;

export default function AdminDashboard() {
    const { t } = useI18n();
    const { props } = usePage<Page>();

    const stats = props.stats as Page['stats'];
    const monthlyChart = props.monthlyChart as Array<{ month: string; value: number }>;
    const classDistribution = props.classDistribution as Array<{ label: string; value: number }>;
    const recentPayments = props.recentPayments as Array<{
        id: number;
        student: string;
        month: string;
        amount: number;
        status: string;
        paid_on: string | null;
    }>;

    const maxBar = Math.max(...monthlyChart.map((m) => m.value), 1);
    const totalStudents = stats.students || 1;
    const donut = classDistribution.map((c) => (c.value / totalStudents) * 100);

    const kpis = [
        { label: t('students'), value: stats.students, icon: GraduationCap },
        { label: t('teachers'), value: stats.teachers, icon: Users },
        { label: t('parents'), value: stats.parents, icon: UserCheck },
        { label: t('pending'), value: stats.pending, icon: CalendarClock },
        { label: 'Income (month)', value: `RM ${Number(stats.monthly_income).toFixed(0)}`, icon: Wallet },
    ];

    return (
        <AppShell nav={adminNav} title={t('admin')}>
            {/* Welcome hero */}
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {t('welcome')} back, {props.auth.user.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Here's what's happening at PPAK today
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {stats.pending > 0 && (
                        <Badge variant="destructive" className="gap-1">
                            <CalendarClock className="size-3" />
                            {t('pending')}: {stats.pending}
                        </Badge>
                    )}
                    <Link href="/admin/students">
                        <Button className="gap-1.5">
                            <Plus className="size-4" />
                            {t('add')} {t('student')}
                        </Button>
                    </Link>
                </div>
            </div>

            {/* KPI stat cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {kpis.map((kpi) => (
                    <StatCard
                        key={kpi.label}
                        label={kpi.label}
                        value={kpi.value}
                        icon={kpi.icon}
                    />
                ))}
            </div>

            {/* Chart row */}
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <Card className="rounded-2xl lg:col-span-2">
                    <CardHeader className="flex-row items-center justify-between pb-0">
                        <div>
                            <CardTitle className="text-base">Monthly income</CardTitle>
                            <CardDescription>A sub copy here</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex h-48 items-end gap-2 pt-4">
                            {monthlyChart.map((m) => (
                                <div
                                    key={m.month}
                                    className="group flex flex-1 flex-col items-center gap-1"
                                >
                                    <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                                        {m.value > 0 ? m.value : ''}
                                    </span>
                                    <div
                                        className="w-full rounded-t-md bg-primary"
                                        style={{
                                            height: `${Math.max((m.value / maxBar) * 100, 2)}%`,
                                        }}
                                    />
                                    <span className="text-[10px] text-muted-foreground">
                                        {m.month}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader className="pb-0">
                        <CardTitle className="text-base">Class distribution</CardTitle>
                        <CardDescription>A sub copy here</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-around pt-4">
                        <div
                            className="size-28 rounded-full"
                            style={{
                                background: `conic-gradient(#437ef7 0 ${donut[0]}%, #aec9fe ${donut[0]}% 100%)`,
                            }}
                        >
                            <div className="flex size-full items-center justify-center rounded-full bg-card">
                                <span className="text-xl font-bold">{stats.students}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {classDistribution.map((c, i) => (
                                <div key={c.label} className="flex items-center gap-2 text-sm">
                                    <span
                                        className="size-2.5 rounded-full"
                                        style={{
                                            background: i === 0 ? '#437ef7' : '#aec9fe',
                                        }}
                                    />
                                    <span>{c.label}</span>
                                    <span className="text-muted-foreground">{c.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent payments (transaction style) */}
            <Card className="mt-6 rounded-2xl">
                <CardHeader className="flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-base">Recent payments</CardTitle>
                        <CardDescription>A sub copy here</CardDescription>
                    </div>
                    <Link href="/admin/payments" className="text-sm font-medium text-primary">
                        {t('view_all')}
                    </Link>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('student')}</TableHead>
                                <TableHead>{t('month')}</TableHead>
                                <TableHead>{t('amount')}</TableHead>
                                <TableHead>{t('status')}</TableHead>
                                <TableHead>{t('paid_on') ?? 'Paid on'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentPayments.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="py-8 text-center text-muted-foreground"
                                    >
                                        {t('no_data')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                recentPayments.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.student}</TableCell>
                                        <TableCell>{p.month}</TableCell>
                                        <TableCell>RM {p.amount.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={p.status === 'paid' ? 'default' : 'secondary'}
                                                className={p.status === 'paid' ? 'bg-emerald-600' : ''}
                                            >
                                                {p.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{p.paid_on ?? '—'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </AppShell>
    );
}
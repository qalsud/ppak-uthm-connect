import { Link, usePage } from '@inertiajs/react';
import {
    CalendarClock,
    ClipboardList,
    FileText,
    GraduationCap,
    Plus,
    Settings,
    TrendingUp,
    UserCheck,
    Users,
    Wallet,
} from 'lucide-react';

import PageHeader from '@/Components/page-header';
import DateChip from '@/Components/date-chip';
import StatCard from '@/Components/stat-card';
import StatusBadge from '@/Components/status-badge';
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
import { adminBottomNav, adminNav } from '@/lib/navigation';
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
    const monthlyChart = props.monthlyChart as Page['monthlyChart'];
    const classDistribution = props.classDistribution as Page['classDistribution'];
    const recentPayments = props.recentPayments as Page['recentPayments'];

    const maxBar = Math.max(...monthlyChart.map((m) => m.value), 1);
    const totalStudents = stats.students || 1;
    const donut = classDistribution.map((c) => (c.value / totalStudents) * 100);

    const actions = [
        { label: t('add') + ' ' + t('student'), href: '/admin/students', icon: GraduationCap, tint: 'bg-sky-100 text-sky-600' },
        { label: t('registrations'), href: '/admin/registrations', icon: ClipboardList, tint: 'bg-violet-100 text-violet-600' },
        { label: t('memos'), href: '/admin/memos', icon: FileText, tint: 'bg-amber-100 text-amber-600' },
        { label: t('fee_settings'), href: '/admin/fees', icon: Settings, tint: 'bg-emerald-100 text-emerald-600' },
    ];

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader
                title={`${t('welcome')}, ${props.auth.user.name.split(' ')[0]}`}
                description="Here's what's happening at PPAK today"
            >
                <DateChip />
                {stats.pending > 0 && (
                    <Badge variant="destructive" className="gap-1">
                        <CalendarClock className="size-3" />
                        {t('pending')}: {stats.pending}
                    </Badge>
                )}
                <Link href="/admin/students" className="hidden sm:block">
                    <Button className="gap-1.5">
                        <Plus className="size-4" />
                        {t('add')} {t('student')}
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
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <StatCard label={t('students')} value={stats.students} icon={GraduationCap} />
                <StatCard label={t('teachers')} value={stats.teachers} icon={Users} />
                <StatCard label={t('parent')} value={stats.parents} icon={UserCheck} />
                <StatCard label={t('pending')} value={stats.pending} icon={CalendarClock} />
                <StatCard
                    label="Income (month)"
                    value={`RM ${Number(stats.monthly_income).toFixed(0)}`}
                    icon={Wallet}
                />
            </div>

            {/* Chart + donut */}
            <div className="mb-6 grid gap-4 lg:grid-cols-3">
                <Card className="rounded-2xl border-0 shadow-sm lg:col-span-2">
                    <CardHeader className="pb-0">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="size-4 text-primary" />
                            Monthly income
                        </CardTitle>
                        <CardDescription>A sub copy here</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex h-44 items-end gap-1.5 pt-4">
                            {monthlyChart.map((m) => (
                                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                                    <div
                                        className="w-full rounded-t-md bg-primary"
                                        style={{ height: `${Math.max((m.value / maxBar) * 100, 2)}%` }}
                                    />
                                    <span className="text-[9px] text-muted-foreground">{m.month}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 shadow-sm">
                    <CardHeader className="pb-0">
                        <CardTitle className="text-base">Class distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-around pt-4">
                        <div
                            className="size-24 rounded-full"
                            style={{
                                background: `conic-gradient(#509cdb 0 ${donut[0]}%, #a9c9e6 ${donut[0]}% 100%)`,
                            }}
                        >
                            <div className="flex size-full items-center justify-center rounded-full bg-card">
                                <span className="text-lg font-bold">{stats.students}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {classDistribution.map((c, i) => (
                                <div key={c.label} className="flex items-center gap-2 text-sm">
                                    <span
                                        className="size-2.5 rounded-full"
                                        style={{ background: i === 0 ? '#509cdb' : '#a9c9e6' }}
                                    />
                                    <span>{c.label}</span>
                                    <span className="text-muted-foreground">{c.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent payments */}
            <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base">Recent payments</CardTitle>
                    <Link href="/admin/payments" className="text-sm font-medium text-primary">
                        {t('view_all')}
                    </Link>
                </CardHeader>
                <CardContent>
                    {/* Mobile cards */}
                    <div className="space-y-2 lg:hidden">
                        {recentPayments.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                {t('no_data')}
                            </p>
                        ) : (
                            recentPayments.map((p) => (
                                <div
                                    key={p.id}
                                    className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5"
                                >
                                    <div>
                                        <p className="text-sm font-medium">{p.student}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {p.month} · RM {p.amount.toFixed(2)}
                                        </p>
                                    </div>
                                    <StatusBadge
                                        status={p.status === 'paid' ? 'paid' : 'unpaid'}
                                        label={p.status}
                                    />
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden lg:block">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>{t('student')}</TableHead>
                                    <TableHead>{t('month')}</TableHead>
                                    <TableHead>{t('amount')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead>{t('paid_on')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentPayments.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.student}</TableCell>
                                        <TableCell>{p.month}</TableCell>
                                        <TableCell>RM {p.amount.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={p.status === 'paid' ? 'paid' : 'unpaid'}
                                                label={p.status}
                                            />
                                        </TableCell>
                                        <TableCell>{p.paid_on ?? '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </AppShell>
    );
}
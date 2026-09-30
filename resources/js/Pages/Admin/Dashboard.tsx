import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowUpRight,
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
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
    tiles: {
        unpaid_month: string;
        unpaid_count: number;
        unpaid_amount: number;
        students_active: number;
        not_checked_in: number;
    };
    monthOverMonth: {
        month: string;
        this_month: number;
        last_month: number;
        delta_pct: number | null;
    };
    year: number;
    years: number[];
}>;

export default function AdminDashboard() {
    const { t } = useI18n();
    const { props } = usePage<Page>();

    const stats = props.stats as Page['stats'];
    const monthlyChart = props.monthlyChart as Page['monthlyChart'];
    const classDistribution = props.classDistribution as Page['classDistribution'];
    const recentPayments = props.recentPayments as Page['recentPayments'];
    const tiles = props.tiles as Page['tiles'];
    const monthOverMonth = props.monthOverMonth as Page['monthOverMonth'];
    const year = props.year as Page['year'];
    const years = props.years as Page['years'];

    const maxBar = Math.max(...monthlyChart.map((m) => m.value), 1);
    const totalStudents = stats.students || 1;

    // Bars use pixel heights: a % height inside an auto-height flex parent
    // collapses to 0 (the chart rendered empty). Fixed chart area in px instead.
    const chartAreaPx = 140;

    // Build the donut from any number of classes (was hard-coded to two).
    const donutPalette = ['#509cdb', '#a9c9e6', '#7dd3fc', '#c4b5fd', '#fca5a5', '#fcd34d'];
    let donutAcc = 0;
    const donutSegments = classDistribution.map((c, i) => {
        const pct = (c.value / totalStudents) * 100;
        const segment = `${donutPalette[i % donutPalette.length]} ${donutAcc}% ${donutAcc + pct}%`;
        donutAcc += pct;

        return segment;
    });
    const donutBackground = `conic-gradient(${donutSegments.join(', ') || '#e2e8f0 0 100%'})`;

    const actions = [
        { label: t('add') + ' ' + t('student'), href: '/admin/students?create=1', icon: GraduationCap, tint: 'bg-sky-100 text-sky-600' },
        { label: t('registrations'), href: '/admin/registrations', icon: ClipboardList, tint: 'bg-violet-100 text-violet-600' },
        { label: t('memos'), href: '/admin/memos', icon: FileText, tint: 'bg-amber-100 text-amber-600' },
        { label: t('fee_settings'), href: '/admin/fees', icon: Settings, tint: 'bg-emerald-100 text-emerald-600' },
    ];

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader
                title={`${t('welcome')}, ${props.auth.user.name.split(' ')[0]}`}
                description={t('dashboard_subtitle')}
            >
                <DateChip />
                {stats.pending > 0 && (
                    <Link href="/admin/registrations">
                        <Badge variant="destructive" className="cursor-pointer gap-1">
                            <CalendarClock className="size-3" />
                            {t('pending')}: {stats.pending}
                        </Badge>
                    </Link>
                )}
                <Link href="/admin/students?create=1" className="hidden sm:block">
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
                    label={t('income')}
                    value={`RM ${Number(stats.monthly_income).toFixed(0)}`}
                    icon={Wallet}
                    hint={monthOverMonth.month}
                />
            </div>

            {/* Actionable tiles */}
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
                <Link href={`/admin/payments?month=${encodeURIComponent(tiles.unpaid_month)}&status=unpaid`}>
                    <Card className="rounded-2xl border-0 shadow-sm transition-colors hover:bg-muted/40">
                        <CardContent className="flex items-center justify-between pt-5">
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    {t('unpaid_this_month')} · {tiles.unpaid_month}
                                </p>
                                <p className="text-2xl font-bold">{tiles.unpaid_count}</p>
                                <p className="text-xs text-muted-foreground">
                                    RM {tiles.unpaid_amount.toFixed(2)}
                                </p>
                            </div>
                            <Wallet className="size-7 text-amber-600" />
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/register/attendance">
                    <Card className="rounded-2xl border-0 shadow-sm transition-colors hover:bg-muted/40">
                        <CardContent className="flex items-center justify-between pt-5">
                            <div>
                                <p className="text-xs text-muted-foreground">{t('not_checked_in_today')}</p>
                                <p className="text-2xl font-bold">{tiles.not_checked_in}</p>
                                <p className="text-xs text-muted-foreground">
                                    / {tiles.students_active} {t('students').toLowerCase()}
                                </p>
                            </div>
                            <CalendarClock className="size-7 text-sky-600" />
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Chart + donut */}
            <div className="mb-6 grid gap-4 lg:grid-cols-3">
                <Card className="rounded-2xl border-0 shadow-sm lg:col-span-2">
                    <CardHeader className="flex-row items-start justify-between gap-2 pb-0">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <TrendingUp className="size-4 text-primary" />
                                {t('monthly_income')}
                            </CardTitle>
                            <CardDescription>{t('chart_subtitle')}</CardDescription>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            {monthOverMonth.delta_pct !== null && (
                                <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
                                        monthOverMonth.delta_pct >= 0
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-rose-50 text-rose-700'
                                    }`}
                                    title={`${monthOverMonth.month}: RM ${monthOverMonth.this_month.toFixed(2)}`}
                                >
                                    {monthOverMonth.delta_pct >= 0 ? (
                                        <ArrowUpRight className="size-3.5" />
                                    ) : (
                                        <ArrowDownRight className="size-3.5" />
                                    )}
                                    {monthOverMonth.delta_pct}% {t('vs_last_month')}
                                </span>
                            )}
                            <Select
                                value={String(year)}
                                onValueChange={(v) =>
                                    router.get('/admin', { year: v }, { preserveState: true, preserveScroll: true })
                                }
                            >
                                <SelectTrigger className="h-8 w-24">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((y) => (
                                        <SelectItem key={y} value={String(y)}>
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex h-44 items-end gap-1.5 pt-4">
                            {monthlyChart.map((m) => (
                                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                                    <div
                                        className="w-full rounded-t-md bg-primary transition-all hover:bg-primary/80"
                                        style={{ height: `${Math.max((m.value / maxBar) * chartAreaPx, 3)}px` }}
                                        title={`RM ${m.value.toFixed(2)}`}
                                    />
                                    <span className="text-[9px] text-muted-foreground">{m.month}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 shadow-sm">
                    <CardHeader className="pb-0">
                        <CardTitle className="text-base">{t('class_distribution')}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-around pt-4">
                        <div
                            className="size-24 rounded-full"
                            style={{ background: donutBackground }}
                        >
                            <div className="flex size-16 items-center justify-center rounded-full bg-card">
                                <span className="text-lg font-bold">{stats.students}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {classDistribution.map((c, i) => (
                                <div key={c.label} className="flex items-center gap-2 text-sm">
                                    <span
                                        className="size-2.5 rounded-full"
                                        style={{ background: donutPalette[i % donutPalette.length] }}
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
                    <CardTitle className="text-base">{t('recent_payments')}</CardTitle>
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
                                                label={p.status === 'paid' ? t('paid') : t('unpaid')}
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
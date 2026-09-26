import { Link, usePage } from '@inertiajs/react';
import {
    BellRing,
    CalendarCheck,
    FileText,
    GraduationCap,
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
import { useI18n } from '@/lib/i18n';
import { parentNav } from '@/lib/navigation';
import type { PageProps } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Child = {
    id: number;
    name: string;
    age: number | null;
    class: string;
    unpaid: number;
    latest_update_date: string | null;
    latest_activity_date: string | null;
};

type Page = PageProps<{
    children: Child[];
    unpaidTotal: number;
    memoCount: number;
    unreadCount: number;
}>;

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : '6 Bintang');

export default function ParentDashboard() {
    const { t } = useI18n();
    const { props } = usePage<Page>();

    const children = props.children as Page['children'];
    const unpaidTotal = (props.unpaidTotal as number) ?? 0;
    const memoCount = (props.memoCount as number) ?? 0;
    const unreadCount = (props.unreadCount as number) ?? 0;

    const kpis = [
        { label: t('students'), value: children.length, icon: GraduationCap },
        { label: t('outstanding'), value: `RM ${unpaidTotal.toFixed(0)}`, icon: Wallet },
        { label: t('memos'), value: memoCount, icon: FileText },
        { label: t('messages'), value: unreadCount, icon: BellRing },
    ];

    return (
        <AppShell nav={parentNav} title={t('parent')}>
            {/* Welcome hero */}
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {t('welcome')} back, {props.auth.user.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Here's what's happening with your children today
                    </p>
                </div>
                <Link href="/parent/financials">
                    <Button className="gap-1.5">
                        <Wallet className="size-4" />
                        {t('financials')}
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
                                    <p className="truncate text-xl font-bold text-foreground">
                                        {kpi.value}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Children cards */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {children.map((child) => (
                    <Card key={child.id} className="rounded-2xl">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                                        <GraduationCap className="size-5" />
                                    </span>
                                    <div>
                                        <CardTitle className="text-base">{child.name}</CardTitle>
                                        <CardDescription>
                                            {classLabel(child.class)}
                                            {child.age ? ` · ${child.age} thn` : ''}
                                        </CardDescription>
                                    </div>
                                </div>
                                {child.unpaid > 0 ? (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                        RM {child.unpaid.toFixed(2)}
                                    </Badge>
                                ) : (
                                    <Badge className="bg-emerald-600">Paid up</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-lg border p-3">
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <CalendarCheck className="size-3.5" />
                                    {t('daily_update')}
                                </p>
                                <p className="mt-1 font-medium">
                                    {child.latest_update_date ?? t('no_data')}
                                </p>
                            </div>
                            <div className="rounded-lg border p-3">
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <BellRing className="size-3.5" />
                                    {t('activities')}
                                </p>
                                <p className="mt-1 font-medium">
                                    {child.latest_activity_date ?? t('no_data')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {children.length === 0 && (
                <Card className="mt-6 rounded-2xl">
                    <CardContent className="py-10 text-center text-muted-foreground">
                        {t('no_data')}
                    </CardContent>
                </Card>
            )}
        </AppShell>
    );
}
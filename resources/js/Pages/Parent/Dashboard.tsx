import { Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    BookOpen,
    CalendarCheck,
    ChevronRight,
    Eye,
    FileText,
    GraduationCap,
    MessagesSquare,
    Users,
    Wallet,
} from 'lucide-react';

import PageHeader from '@/Components/page-header';
import DateChip from '@/Components/date-chip';
import AttendanceActions, { type AttendanceSummary } from '@/Components/attendance-actions';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { useI18n } from '@/lib/i18n';
import { parentBottomNav, parentNav } from '@/lib/navigation';
import type { PageProps } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Child = {
    id: number;
    name: string;
    age: number | null;
    class: string;
    unpaid: number;
    attendance?: AttendanceSummary;
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

    const actions = [
        { label: t('daily_update'), href: '/parent/daily-update', icon: CalendarCheck, tint: 'bg-sky-100 text-sky-600' },
        { label: t('activities'), href: '/parent/activities', icon: BookOpen, tint: 'bg-violet-100 text-violet-600' },
        { label: t('financials'), href: '/parent/financials', icon: Wallet, tint: 'bg-emerald-100 text-emerald-600' },
        { label: t('messages'), href: '/parent/messages', icon: MessagesSquare, tint: 'bg-amber-100 text-amber-600' },
    ];

    return (
        <AppShell nav={parentNav} bottomNav={parentBottomNav} title={t('parent')}>
            <PageHeader
                title={`${t('welcome')}, ${props.auth.user.name.split(' ')[0]}`}
                description="Here's how your children are doing today"
            >
                <DateChip />
            </PageHeader>

            {unpaidTotal > 0 && (
                <Link href="/parent/financials">
                    <Card className="mb-5 flex items-center gap-3 rounded-2xl border-amber-200 bg-amber-50 p-4 shadow-none">
                        <AlertTriangle className="size-5 shrink-0 text-amber-600" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-amber-800">
                                Outstanding balance
                            </p>
                            <p className="text-xs text-amber-700">
                                RM {unpaidTotal.toFixed(2)} due — tap to pay
                            </p>
                        </div>
                        <ChevronRight className="size-5 text-amber-600" />
                    </Card>
                </Link>
            )}

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

            {/* Children */}
            <h2 className="mb-3 text-sm font-semibold text-foreground">{t('children')}</h2>
            <div className="space-y-3">
                {children.map((child) => (
                    <Card key={child.id} className="rounded-2xl border-0 shadow-sm">
                        <CardContent className="space-y-3 pt-4">
                            <div className="flex items-center gap-3">
                                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-navy text-white">
                                    <GraduationCap className="size-5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold">{child.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {classLabel(child.class)}
                                        {child.age ? ` · ${child.age} thn` : ''}
                                    </p>
                                </div>
                            </div>
                            <AttendanceActions
                                studentId={child.id}
                                attendance={child.attendance}
                                role="parent"
                            />

                            <Link href={route('parent.children.show', { student: child.id })}>
                                <Button variant="outline" className="h-10 w-full gap-1.5 rounded-xl">
                                    <Eye className="size-4" />
                                    {t('view_updates')}
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Memos + Teachers shortcuts */}
            <div className="mt-4 grid grid-cols-2 gap-3">
                <Link href="/parent/memos" className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                        <FileText className="size-5" />
                    </span>
                    <span className="flex-1 text-sm font-medium">{t('memos')}</span>
                    <span className="text-xs text-muted-foreground">{memoCount}</span>
                </Link>
                <Link href="/parent/teachers" className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                        <Users className="size-5" />
                    </span>
                    <span className="flex-1 text-sm font-medium">{t('teachers')}</span>
                </Link>
            </div>
        </AppShell>
    );
}
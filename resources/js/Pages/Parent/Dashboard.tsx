import { Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    BookOpen,
    CalendarCheck,
    ChevronRight,
    FileText,
    GraduationCap,
    MessagesSquare,
    Wallet,
} from 'lucide-react';

import PageHeader from '@/Components/page-header';
import StatusBadge from '@/Components/status-badge';
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
            />

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
            <h2 className="mb-3 text-sm font-semibold text-foreground">{t('students')}</h2>
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
                                <StatusBadge
                                    status={child.unpaid > 0 ? 'unpaid' : 'paid'}
                                    label={child.unpaid > 0 ? `RM ${child.unpaid.toFixed(0)}` : 'Paid up'}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-muted/60 p-2.5">
                                    <p className="text-[10px] text-muted-foreground">{t('daily_update')}</p>
                                    <p className="text-xs font-medium">
                                        {child.latest_update_date ?? '—'}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-muted/60 p-2.5">
                                    <p className="text-[10px] text-muted-foreground">{t('activities')}</p>
                                    <p className="text-xs font-medium">
                                        {child.latest_activity_date ?? '—'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Memos shortcut */}
            <Link href="/parent/memos" className="mt-4 flex items-center gap-3 rounded-2xl border bg-card p-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                    <FileText className="size-5" />
                </span>
                <span className="flex-1 text-sm font-medium">{t('memos')}</span>
                <span className="text-xs text-muted-foreground">{memoCount}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
        </AppShell>
    );
}
import { Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, BookOpen, CalendarCheck, CreditCard, GraduationCap, MessagesSquare } from 'lucide-react';
import { useState } from 'react';

import PageHeader from '@/Components/page-header';
import StatusBadge from '@/Components/status-badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useI18n } from '@/lib/i18n';
import { parentBottomNav, parentNav } from '@/lib/navigation';
import type { PageProps } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Child = { id: number; name: string; age: number | null; class: string; unpaid: number };
type Update = {
    id: number;
    date: string;
    arrival_time: string | null;
    sleep_status: string;
    bath_status: string;
    health_status: string | null;
    parent_notes: string | null;
};
type Activity = {
    id: number;
    date: string;
    teacher: { name: string } | null;
    [key: string]: unknown;
};
type Progress = {
    id: number;
    date: string;
    sub_theme: string | null;
    activity_done: string;
    child_proficiency: string;
    permata_activity: string;
    development_proficiency: string;
};

type Page = PageProps<{
    child: Child;
    updates: Update[];
    activities: Activity[];
    progress: Progress[];
    fields: Record<string, string>;
}>;

export default function ParentChild() {
    const { t } = useI18n();
    const { props } = usePage<Page>();
    const { child, updates, activities, progress, fields } = props;
    const [paying, setPaying] = useState(false);

    const checkout = () => {
        setPaying(true);
        router.post(
            route('parent.payments.checkout'),
            { student_id: child.id },
            { preserveScroll: true, onFinish: () => setPaying(false) },
        );
    };

    return (
        <AppShell nav={parentNav} bottomNav={parentBottomNav} title={t('parent')}>
            <PageHeader title={child.name} description={`${child.class}${child.age ? ` · ${child.age} thn` : ''}`}>
                <Link href="/parent">
                    <Button variant="outline" className="gap-1.5">
                        <ArrowLeft className="size-4" />
                        {t('dashboard')}
                    </Button>
                </Link>
            </PageHeader>

            {/* Balance + quick actions */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardContent className="space-y-4 pt-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-navy text-white">
                                <GraduationCap className="size-6" />
                            </span>
                            <div>
                                <p className="text-xs text-muted-foreground">{t('outstanding')}</p>
                                <p
                                    className={`text-xl font-bold ${child.unpaid > 0 ? 'text-amber-600' : 'text-emerald-600'}`}
                                >
                                    RM {child.unpaid.toFixed(2)}
                                </p>
                            </div>
                        </div>
                        <StatusBadge
                            status={child.unpaid > 0 ? 'unpaid' : 'paid'}
                            label={child.unpaid > 0 ? 'Unpaid' : 'Paid up'}
                        />
                    </div>

                    {child.unpaid > 0 && (
                        <Button onClick={checkout} disabled={paying} className="h-11 w-full rounded-xl font-semibold">
                            <CreditCard className="mr-2 size-4" />
                            {paying ? 'Redirecting…' : `Pay RM ${child.unpaid.toFixed(2)}`}
                        </Button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <Link href={`/parent/daily-update?student_id=${child.id}`}>
                            <Button variant="outline" className="h-11 w-full gap-1.5">
                                <CalendarCheck className="size-4" />
                                {t('daily_update')}
                            </Button>
                        </Link>
                        <Link href="/parent/messages">
                            <Button variant="outline" className="h-11 w-full gap-1.5">
                                <MessagesSquare className="size-4" />
                                {t('messages')}
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Daily updates */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarCheck className="size-4 text-primary" />
                        {t('daily_updates')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {updates.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        <div className="space-y-2">
                            {updates.map((u) => (
                                <div key={u.id} className="rounded-xl bg-muted/50 px-3 py-2.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{u.date}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {u.arrival_time ? `Tiba ${u.arrival_time}` : ''}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Tidur: {u.sleep_status} · Mandi: {u.bath_status}
                                        {u.health_status ? ` · Sihat: ${u.health_status}` : ''}
                                    </p>
                                    {u.parent_notes && (
                                        <p className="mt-1 text-[11px] italic">{u.parent_notes}</p>
                                    )}
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
                        <BookOpen className="size-4 text-primary" />
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
                                        <span>{a.date}</span>
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
                                                        className={`size-1.5 rounded-full ${yes ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
                                                    />
                                                    <span className="flex-1 truncate">{label}</span>
                                                    <span className={yes ? 'text-emerald-600' : 'text-muted-foreground'}>
                                                        {yes ? 'Ya' : 'Tidak'}
                                                    </span>
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

            {/* Progress */}
            <Card className="rounded-2xl border-0 shadow-sm">
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
                                <div key={p.id} className="rounded-xl bg-muted/50 px-3 py-2.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{p.sub_theme ?? t('progress')}</span>
                                        <span className="text-xs text-muted-foreground">{p.date}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Aktiviti: {p.activity_done} · Kemahiran: {p.child_proficiency} ·{' '}
                                        {p.development_proficiency}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </AppShell>
    );
}
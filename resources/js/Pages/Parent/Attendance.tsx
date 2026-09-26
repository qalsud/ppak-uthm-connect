import { CalendarClock, History } from 'lucide-react';

import AttendanceActions, { type AttendanceSummary } from '@/Components/attendance-actions';
import PageHeader from '@/Components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { formatDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { parentBottomNav, parentNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type HistoryRow = {
    id: number;
    date: string;
    day: string;
    status: 'none' | 'school' | 'home';
    arrived_at: string | null;
    departed_at: string | null;
};

type Child = {
    id: number;
    name: string;
    class: string;
    attendance: AttendanceSummary;
    history: HistoryRow[];
};

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : c === '6bintang' ? '6 Bintang' : c);

export default function ParentAttendance({ children }: { children: Child[] }) {
    const { t } = useI18n();

    const statusMeta = (status: HistoryRow['status']) =>
        status === 'school'
            ? { label: t('at_school'), cls: 'bg-sky-100 text-sky-700' }
            : status === 'home'
              ? { label: t('back_home'), cls: 'bg-emerald-100 text-emerald-700' }
              : { label: t('not_arrived'), cls: 'bg-slate-100 text-slate-600' };

    return (
        <AppShell nav={parentNav} bottomNav={parentBottomNav} title={t('parent')}>
            <PageHeader title={t('attendance')} description={t('attendance_subtitle')} />

            {children.length === 0 ? (
                <Card className="rounded-2xl border-0 shadow-sm">
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        {t('no_data')}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {children.map((child) => (
                        <Card key={child.id} className="rounded-2xl border-0 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">{child.name}</CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    {classLabel(child.class)}
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Today */}
                                <div>
                                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                        <CalendarClock className="size-4 text-primary" />
                                        {t('attendance_today')}
                                    </p>
                                    <AttendanceActions
                                        studentId={child.id}
                                        attendance={child.attendance}
                                        role="parent"
                                    />
                                </div>

                                {/* History */}
                                <div className="border-t pt-4">
                                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                        <History className="size-4 text-primary" />
                                        {t('attendance_history')}
                                    </p>
                                    {child.history.length === 0 ? (
                                        <p className="py-4 text-center text-sm text-muted-foreground">
                                            {t('no_data')}
                                        </p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {child.history.map((row) => {
                                                const meta = statusMeta(row.status);

                                                return (
                                                    <div
                                                        key={row.id}
                                                        className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="truncate text-xs font-medium">
                                                                {formatDate(row.date)}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {t('arrived_at')}: {row.arrived_at ?? '—'} ·{' '}
                                                                {t('departed_at')}: {row.departed_at ?? '—'}
                                                            </p>
                                                        </div>
                                                        <span
                                                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.cls}`}
                                                        >
                                                            {meta.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </AppShell>
    );
}

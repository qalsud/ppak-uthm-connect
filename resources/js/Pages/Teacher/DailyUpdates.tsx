import { router } from '@inertiajs/react';
import { CheckCircle2, XCircle } from 'lucide-react';

import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { useI18n } from '@/lib/i18n';
import PageHeader from '@/Components/page-header';
import { teacherBottomNav, teacherNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Student = {
    id: number;
    name: string;
    class: string;
    updated_today: boolean;
    latest_update: {
        date: string;
        arrival_time: string | null;
        sleep_status: string;
        bath_status: string;
        health_status: string | null;
        parent_notes: string | null;
    } | null;
    history: Array<{ date: string; sleep: string; bath: string; health: string | null }>;
};

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : '6 Bintang');

export default function DailyUpdates({
    students,
    selectedClass,
}: {
    students: Student[];
    selectedClass: string;
}) {
    const { t } = useI18n();

    const changeClass = (value: string) => {
        router.get('/teacher/daily-updates', { class: value }, { preserveState: true });
    };

    return (
        <AppShell nav={teacherNav} bottomNav={teacherBottomNav} title={t('teacher')}>
            <PageHeader title={t('daily_updates')} description="Morning updates received from parents">
                <div className="w-48">
                    <Select value={selectedClass} onValueChange={changeClass}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5tahun">5 Tahun</SelectItem>
                            <SelectItem value="6bintang">6 Bintang</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </PageHeader>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((student) => (
                    <Card key={student.id}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">{student.name}</CardTitle>
                                <Badge
                                    variant={student.updated_today ? 'default' : 'secondary'}
                                    className={student.updated_today ? 'bg-emerald-600' : ''}
                                >
                                    {student.updated_today ? (
                                        <CheckCircle2 className="size-3" />
                                    ) : (
                                        <XCircle className="size-3" />
                                    )}
                                    <span className="ml-1">
                                        {student.updated_today ? t('today') : t('not_updated')}
                                    </span>
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {classLabel(student.class)}
                            </p>
                        </CardHeader>
                        <CardContent className="text-sm">
                            {student.latest_update ? (
                                <dl className="space-y-1">
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Arrival</dt>
                                        <dd>{student.latest_update.arrival_time ?? '—'}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Sleep</dt>
                                        <dd>{student.latest_update.sleep_status}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Bath</dt>
                                        <dd>{student.latest_update.bath_status}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Health</dt>
                                        <dd>{student.latest_update.health_status ?? '—'}</dd>
                                    </div>
                                    {student.latest_update.parent_notes && (
                                        <p className="mt-2 rounded bg-muted p-2 text-xs">
                                            {student.latest_update.parent_notes}
                                        </p>
                                    )}
                                </dl>
                            ) : (
                                <p className="py-4 text-center text-muted-foreground">
                                    {t('no_data')}
                                </p>
                            )}

                            {student.history?.length > 0 && (
                                <div className="mt-3 border-t pt-3">
                                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Recent
                                    </p>
                                    <div className="space-y-1">
                                        {student.history.map((h, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between text-[11px] text-muted-foreground"
                                            >
                                                <span>{h.date}</span>
                                                <span>
                                                    {h.sleep} · {h.bath}
                                                    {h.health ? ` · ${h.health}` : ''}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </AppShell>
    );
}
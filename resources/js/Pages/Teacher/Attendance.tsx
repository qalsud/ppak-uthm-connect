import { router } from '@inertiajs/react';
import { CalendarClock } from 'lucide-react';

import AttendanceActions, { type AttendanceSummary } from '@/Components/attendance-actions';
import PageHeader from '@/Components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { localDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { teacherBottomNav, teacherNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Student = {
    id: number;
    name: string;
    class: string;
    attendance: AttendanceSummary;
};

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : c === '6bintang' ? '6 Bintang' : c);

export default function TeacherAttendance({
    students,
    selectedClass,
    assignedClass,
    date,
    isToday,
    counts,
}: {
    students: Student[];
    selectedClass: string;
    assignedClass?: string | null;
    date: string;
    isToday: boolean;
    counts: { school: number; home: number; none: number };
}) {
    const { t } = useI18n();

    const reload = (params: { class?: string; date?: string }) => {
        router.get(
            '/teacher/attendance',
            { class: params.class ?? selectedClass, date: params.date ?? date },
            { preserveState: true, preserveScroll: true },
        );
    };

    const statusMeta = (status: AttendanceSummary['status']) =>
        status === 'school'
            ? { label: t('at_school'), cls: 'bg-sky-100 text-sky-700' }
            : status === 'home'
              ? { label: t('back_home'), cls: 'bg-emerald-100 text-emerald-700' }
              : { label: t('not_arrived'), cls: 'bg-slate-100 text-slate-600' };

    const summary = [
        { label: t('at_school'), value: counts.school, cls: 'text-sky-600' },
        { label: t('back_home'), value: counts.home, cls: 'text-emerald-600' },
        { label: t('not_arrived'), value: counts.none, cls: 'text-slate-500' },
    ];

    return (
        <AppShell nav={teacherNav} bottomNav={teacherBottomNav} title={t('teacher')}>
            <PageHeader title={t('attendance')} description={t('attendance_register')}>
                <div className="flex flex-wrap items-center gap-2">
                    {!assignedClass && (
                        <div className="w-40">
                            <Select value={selectedClass} onValueChange={(v) => reload({ class: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5tahun">5 Tahun</SelectItem>
                                    <SelectItem value="6bintang">6 Bintang</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <input
                        type="date"
                        value={date}
                        max={localDate()}
                        onChange={(e) => reload({ date: e.target.value })}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    />
                </div>
            </PageHeader>

            {/* Summary */}
            <div className="mb-6 grid grid-cols-3 gap-3">
                {summary.map((s) => (
                    <Card key={s.label} className="rounded-2xl border-0 shadow-sm">
                        <CardContent className="py-4 text-center">
                            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
                            <p className="text-[11px] text-muted-foreground">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarClock className="size-4 text-primary" />
                        {classLabel(selectedClass)}
                        {!isToday && (
                            <span className="text-xs font-normal text-muted-foreground">
                                · {date}
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>

                {/* Mobile cards */}
                <CardContent className="space-y-3 lg:hidden">
                    {students.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        students.map((s) => (
                            <div key={s.id} className="rounded-xl border p-3">
                                <p className="mb-2 font-medium">{s.name}</p>
                                <AttendanceActions
                                    studentId={s.id}
                                    studentName={s.name}
                                    attendance={s.attendance}
                                    role="teacher"
                                    date={date}
                                />
                            </div>
                        ))
                    )}
                </CardContent>

                {/* Desktop table */}
                <CardContent className="hidden lg:block">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead>{t('name')}</TableHead>
                                <TableHead>{t('arrived_at')}</TableHead>
                                <TableHead>{t('departed_at')}</TableHead>
                                <TableHead>{t('status')}</TableHead>
                                <TableHead className="text-right">{t('action')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map((s) => {
                                const meta = statusMeta(s.attendance.status);

                                return (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">{s.name}</TableCell>
                                        <TableCell>{s.attendance.arrived_at ?? '—'}</TableCell>
                                        <TableCell>{s.attendance.departed_at ?? '—'}</TableCell>
                                        <TableCell>
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.cls}`}
                                            >
                                                {meta.label}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="ml-auto flex w-64 justify-end">
                                                <AttendanceActions
                                                    studentId={s.id}
                                                    studentName={s.name}
                                                    attendance={s.attendance}
                                                    role="teacher"
                                                    date={date}
                                                    showChip={false}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </AppShell>
    );
}

import {
    CalendarCheck,
    CheckCircle2,
    Clock,
    Users,
    XCircle,
} from 'lucide-react';

import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useI18n } from '@/lib/i18n';
import { teacherNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Student = {
    id: number;
    name: string;
    class: string;
    activity_logged: boolean;
    update_received: boolean;
};

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : '6 Bintang');

export default function TeacherDashboard({
    students,
    today,
}: {
    students: Student[];
    today: string;
}) {
    const { t } = useI18n();
    const logged = students.filter((s) => s.activity_logged).length;
    const updated = students.filter((s) => s.update_received).length;

    return (
        <AppShell nav={teacherNav} title={t('teacher')}>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">{t('teacher')} {t('dashboard')}</h1>
                <p className="text-sm text-muted-foreground">
                    {new Date(today).toLocaleDateString()}
                </p>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="size-4" /> {t('students')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-3xl font-bold">{students.length}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarCheck className="size-4" /> {t('daily_activities')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{logged}</p>
                        <p className="text-xs text-muted-foreground">{t('today')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="size-4" /> {t('daily_updates')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{updated}</p>
                        <p className="text-xs text-muted-foreground">{t('today')}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('students')}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {students.map((student) => (
                        <div
                            key={student.id}
                            className="flex items-center justify-between gap-3 rounded-lg border p-3"
                        >
                            <div>
                                <p className="font-medium">{student.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {classLabel(student.class)}
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-1">
                                <Badge
                                    variant={student.activity_logged ? 'default' : 'secondary'}
                                    className={student.activity_logged ? 'bg-emerald-600' : ''}
                                >
                                    {student.activity_logged ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                                    <span className="ml-1">{t('activity')}</span>
                                </Badge>
                                <Badge
                                    variant={student.update_received ? 'default' : 'secondary'}
                                    className={student.update_received ? 'bg-emerald-600' : ''}
                                >
                                    {student.update_received ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                                    <span className="ml-1">{t('daily_update')}</span>
                                </Badge>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </AppShell>
    );
}
import {
    CalendarClock,
    FileText,
    GraduationCap,
    Users,
    Wallet,
} from 'lucide-react';

import { Badge } from '@/Components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { useI18n } from '@/lib/i18n';
import { adminNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Stats = {
    students: number;
    teachers: number;
    parents: number;
    pending: number;
    memos: number;
    monthly_income: string;
};

export default function AdminDashboard({ stats }: { stats: Stats }) {
    const { t } = useI18n();

    const cards = [
        { label: t('students'), value: stats.students, icon: GraduationCap },
        { label: t('teachers'), value: stats.teachers, icon: Users },
        { label: t('parents'), value: stats.parents, icon: Users },
        { label: t('memos'), value: stats.memos, icon: FileText },
        { label: 'RM ' + Number(stats.monthly_income).toFixed(2), label2: 'Income (month)', value: 'Monthly', icon: Wallet },
    ];

    return (
        <AppShell nav={adminNav} title={t('admin')}>
            <div className="mb-6 flex items-center gap-3">
                <h1 className="text-2xl font-bold">{t('admin')} {t('dashboard')}</h1>
                {stats.pending > 0 && (
                    <Badge variant="destructive" className="gap-1">
                        <CalendarClock className="size-3" />
                        {t('pending')}: {stats.pending}
                    </Badge>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {cards.map((card) => {
                    const Icon = card.icon;

                    return (
                        <Card key={card.label}>
                            <CardHeader className="flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm text-muted-foreground">
                                    {card.label}
                                </CardTitle>
                                <Icon className="size-5 text-brand-blue" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{card.value}</p>
                                {card.label2 && (
                                    <CardDescription className="mt-1 text-xs">
                                        {card.label2}
                                    </CardDescription>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </AppShell>
    );
}
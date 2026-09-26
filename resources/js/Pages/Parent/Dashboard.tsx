import { AlertTriangle, BellRing, FileText, GraduationCap } from 'lucide-react';

import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useI18n } from '@/lib/i18n';
import { parentNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Child = {
    id: number;
    name: string;
    class: string;
    age: number | null;
};

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : '6 Bintang');

export default function ParentDashboard({
    children,
    unpaidTotal,
    memoCount,
}: {
    children: Child[];
    unpaidTotal: number;
    memoCount: number;
}) {
    const { t } = useI18n();

    const unpaid = Number(unpaidTotal);

    return (
        <AppShell nav={parentNav} title={t('parent')}>
            <h1 className="mb-1 text-2xl font-bold">{t('dashboard')}</h1>
            <p className="mb-6 text-sm text-muted-foreground">{t('welcome')}</p>

            {unpaid > 0 && (
                <Card className="mb-6 border-amber-300 bg-amber-50">
                    <CardContent className="flex items-center gap-3 py-4 text-amber-800">
                        <AlertTriangle className="size-5" />
                        <p className="text-sm">
                            Outstanding balance: <strong>RM {unpaid.toFixed(2)}</strong>
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {children.map((child) => (
                    <Card key={child.id}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="size-5 text-brand-blue" />
                                <CardTitle className="text-base">{child.name}</CardTitle>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {classLabel(child.class)}
                                {child.age ? ` · ${child.age} thn` : ''}
                            </p>
                        </CardHeader>
                        <CardContent className="flex gap-2">
                            <Badge variant="outline">{t('daily_update')}</Badge>
                            <Badge variant="outline">{t('activities')}</Badge>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {children.length === 0 && (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        {t('no_data')}
                    </CardContent>
                </Card>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                            <BellRing className="size-4" /> {t('memos')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{memoCount}</p>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
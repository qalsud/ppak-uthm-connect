import AppShell from '@/Layouts/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useI18n } from '@/lib/i18n';

export default function TeacherDashboard() {
    const { t } = useI18n();

    return (
        <AppShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">{t('teacher')} {t('dashboard')}</h1>
                    <p className="text-muted-foreground">Aktiviti harian Â· Perkembangan Â· Notis</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Aktiviti Harian</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">â€”</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Perkembangan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">â€”</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppShell>
    );
}

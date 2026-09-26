import AppShell from '@/Layouts/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useI18n } from '@/lib/i18n';

export default function AdminDashboard() {
    const { t } = useI18n();

    return (
        <AppShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">{t('admin')} {t('dashboard')}</h1>
                    <p className="text-muted-foreground">
                        {t('students')} Â· {t('payments')} Â· {t('memos')}
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{t('students')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">â€”</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{t('payments')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">â€”</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{t('memos')}</CardTitle>
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

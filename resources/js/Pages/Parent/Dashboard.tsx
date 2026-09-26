import AppShell from '@/Layouts/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useI18n } from '@/lib/i18n';

export default function ParentDashboard() {
    const { t } = useI18n();

    return (
        <AppShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">{t('parent')} {t('dashboard')}</h1>
                    <p className="text-muted-foreground">
                        Kemas kini harian Â· Aktiviti Â· Penyata kewangan Â· Notis
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        ['Kemas Kini Harian', 'Daily Update'],
                        ['Aktiviti & Perkembangan', 'Activities & Progress'],
                        ['Kewangan', 'Financial'],
                        ['Notis', 'Memos'],
                    ].map(([ms, en]) => (
                        <Card key={en}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">
                                    {t('locale') === 'ms' ? ms : en}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">â€”</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </AppShell>
    );
}

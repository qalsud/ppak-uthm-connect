import { BookOpen, CalendarCheck } from 'lucide-react';

import PageHeader from '@/Components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useI18n } from '@/lib/i18n';
import { parentBottomNav, parentNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Child = {
    id: number;
    name: string;
    latest_activity: {
        id: number;
        date: string;
        teacher: { name: string } | null;
        [key: string]: unknown;
    } | null;
    latest_progress: {
        id: number;
        date: string;
        sub_theme: string | null;
        activity_done: string;
        child_proficiency: string;
        permata_activity: string;
        free_activity: string;
        development_proficiency: string;
        notes: string | null;
    } | null;
};

type FieldMap = Record<string, string>;

export default function ParentActivities({
    children,
    fields,
}: {
    children: Child[];
    fields: FieldMap;
}) {
    const { t } = useI18n();

    return (
        <AppShell nav={parentNav} bottomNav={parentBottomNav} title={t('parent')}>
            <PageHeader
                title={t('activities')}
                description="Latest activity and learning progress"
            />

            <div className="space-y-4">
                {children.map((child) => (
                    <Card key={child.id} className="rounded-2xl border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">{child.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* Daily activities */}
                            <div>
                                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                    <CalendarCheck className="size-4 text-primary" />
                                    {t('daily_activities')}
                                </p>
                                {child.latest_activity ? (
                                    <>
                                        <p className="mb-2 text-xs text-muted-foreground">
                                            {child.latest_activity.date}
                                            {child.latest_activity.teacher
                                                ? ` · ${child.latest_activity.teacher.name}`
                                                : ''}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(fields).map(([key, label]) => {
                                                const yes = child.latest_activity?.[key] === 'yes';

                                                return (
                                                    <div
                                                        key={key}
                                                        className="flex items-center gap-2 rounded-xl bg-muted/50 px-2.5 py-2 text-xs"
                                                    >
                                                        <span
                                                            className={`size-2 shrink-0 rounded-full ${
                                                                yes ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                                                            }`}
                                                        />
                                                        <span className="flex-1 truncate">{label}</span>
                                                        <span
                                                            className={`font-semibold ${yes ? 'text-emerald-600' : 'text-muted-foreground'}`}
                                                        >
                                                            {yes ? 'Yes' : 'No'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <p className="py-4 text-center text-sm text-muted-foreground">
                                        {t('no_data')}
                                    </p>
                                )}
                            </div>

                            {/* Progress */}
                            <div>
                                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                    <BookOpen className="size-4 text-primary" />
                                    {t('progress')}
                                </p>
                                {child.latest_progress ? (
                                    <dl className="space-y-1.5">
                                        {[
                                            [t('date'), child.latest_progress.date],
                                            ['Sub-theme', child.latest_progress.sub_theme ?? '—'],
                                            ['Activity', child.latest_progress.activity_done],
                                            ['Proficiency', child.latest_progress.child_proficiency],
                                            ['PERMATA', child.latest_progress.permata_activity],
                                            ['Development', child.latest_progress.development_proficiency],
                                        ].map(([k, v]) => (
                                            <div
                                                key={k as string}
                                                className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2 text-xs"
                                            >
                                                <dt className="text-muted-foreground">{k}</dt>
                                                <dd className="font-medium">{v}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                ) : (
                                    <p className="py-4 text-center text-sm text-muted-foreground">
                                        {t('no_data')}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </AppShell>
    );
}
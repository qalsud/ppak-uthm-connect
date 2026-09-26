import { BookOpen, CalendarCheck } from 'lucide-react';

import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useI18n } from '@/lib/i18n';
import PageHeader from '@/Components/page-header';
import { parentNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Child = {
    id: number;
    name: string;
    latest_activity: {
        id: number;
        date: string;
        afternoon_sleep: string;
        medication: string;
        shower: string;
        brush_teeth: string;
        drink_milk: string;
        breakfast: string;
        lunch: string;
        afternoon_snack: string;
        eat_fruits: string;
        tantrum_crying: string;
        health_issues: string;
        injuries: string;
        treatment_notes: string | null;
        teacher: { name: string } | null;
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
        <AppShell nav={parentNav} title={t('parent')}>
            <PageHeader title={t('activities')} description="Latest activity and progress for each child" />

            <div className="space-y-6">
                {children.map((child) => (
                    <Card key={child.id}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">{child.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-6 lg:grid-cols-2">
                                <div>
                                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                        <CalendarCheck className="size-4 text-brand-blue" />
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
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {Object.entries(fields).map(([key, label]) => {
                                                    const value =
                                                        child.latest_activity?.[
                                                            key as keyof typeof child.latest_activity
                                                        ] === 'yes';

                                                    return (
                                                        <div
                                                            key={key}
                                                            className="flex items-center justify-between rounded border px-2 py-1 text-xs"
                                                        >
                                                            <span>{label}</span>
                                                            <Badge
                                                                variant={value ? 'default' : 'secondary'}
                                                                className={value ? 'bg-emerald-600' : ''}
                                                            >
                                                                {value ? 'Yes' : 'No'}
                                                            </Badge>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {child.latest_activity.treatment_notes && (
                                                <p className="mt-2 rounded bg-muted p-2 text-xs">
                                                    {child.latest_activity.treatment_notes}
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="py-6 text-center text-sm text-muted-foreground">
                                            {t('no_data')}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                        <BookOpen className="size-4 text-brand-blue" />
                                        {t('progress')}
                                    </p>
                                    {child.latest_progress ? (
                                        <dl className="space-y-1 text-sm">
                                            <div className="flex justify-between border-b py-1">
                                                <dt>{t('date')}</dt>
                                                <dd>{child.latest_progress.date}</dd>
                                            </div>
                                            <div className="flex justify-between border-b py-1">
                                                <dt>Sub-theme</dt>
                                                <dd>{child.latest_progress.sub_theme ?? '—'}</dd>
                                            </div>
                                            <div className="flex justify-between border-b py-1">
                                                <dt>Activity</dt>
                                                <dd>{child.latest_progress.activity_done}</dd>
                                            </div>
                                            <div className="flex justify-between border-b py-1">
                                                <dt>Proficiency</dt>
                                                <dd>{child.latest_progress.child_proficiency}</dd>
                                            </div>
                                            <div className="flex justify-between border-b py-1">
                                                <dt>PERMATA</dt>
                                                <dd>{child.latest_progress.permata_activity}</dd>
                                            </div>
                                            <div className="flex justify-between border-b py-1">
                                                <dt>Development</dt>
                                                <dd>{child.latest_progress.development_proficiency}</dd>
                                            </div>
                                        </dl>
                                    ) : (
                                        <p className="py-6 text-center text-sm text-muted-foreground">
                                            {t('no_data')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </AppShell>
    );
}
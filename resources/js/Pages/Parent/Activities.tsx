import { BookOpen, CalendarCheck } from 'lucide-react';

import PageHeader from '@/Components/page-header';
import PhotoThumb from '@/Components/photo-thumb';
import RatingChip from '@/Components/rating-chip';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useI18n } from '@/lib/i18n';
import { parentBottomNav, parentNav } from '@/lib/navigation';
import type { PhotoInfo } from '@/lib/photo';
import AppShell from '@/Layouts/app-shell';

type Child = {
    id: number;
    name: string;
    latest_activity: {
        id: number;
        date: string;
        treatment_notes: string | null;
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
        photo?: PhotoInfo | null;
    } | null;
    recent_activities: Array<{ id: number; date: string }>;
    recent_progress: Array<{
        id: number;
        date: string;
        sub_theme: string | null;
        activity_done: string;
        child_proficiency: string;
        development: string;
        photo?: PhotoInfo | null;
    }>;
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
                                        {child.latest_activity.treatment_notes && (
                                            <p className="mt-2 rounded-xl bg-muted/50 px-3 py-2 text-xs">
                                                <span className="text-muted-foreground">
                                                    {t('treatment_notes')}:{' '}
                                                </span>
                                                {child.latest_activity.treatment_notes}
                                            </p>
                                        )}
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
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-sm font-medium">
                                                {child.latest_progress.sub_theme ?? t('progress')}
                                            </p>
                                            <span className="text-xs text-muted-foreground">
                                                {child.latest_progress.date}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <RatingChip value={child.latest_progress.activity_done} />
                                            <RatingChip value={child.latest_progress.child_proficiency} />
                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                                {child.latest_progress.development_proficiency}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="rounded-xl bg-muted/50 px-3 py-2 text-xs">
                                                <p className="text-muted-foreground">{t('permata_activity')}</p>
                                                <p className="font-medium">
                                                    {child.latest_progress.permata_activity}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-muted/50 px-3 py-2 text-xs">
                                                <p className="text-muted-foreground">{t('free_activity')}</p>
                                                <p className="font-medium">
                                                    {child.latest_progress.free_activity}
                                                </p>
                                            </div>
                                        </div>
                                        {child.latest_progress.notes && (
                                            <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs italic text-muted-foreground">
                                                {child.latest_progress.notes}
                                            </p>
                                        )}
                                        {child.latest_progress.photo && (
                                            <PhotoThumb photo={child.latest_progress.photo} size="size-24" />
                                        )}
                                    </div>
                                ) : (
                                    <p className="py-4 text-center text-sm text-muted-foreground">
                                        {t('no_data')}
                                    </p>
                                )}
                            </div>

                            {/* History */}
                            {(child.recent_activities?.length > 0 ||
                                child.recent_progress?.length > 0) && (
                                <div className="border-t pt-4">
                                    <p className="mb-2 text-sm font-semibold">{t('recent_records')}</p>
                                    <div className="space-y-1">
                                        {child.recent_activities?.map((a) => (
                                            <div
                                                key={`a${a.id}`}
                                                className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-1.5 text-xs"
                                            >
                                                <span className="text-muted-foreground">
                                                    {t('daily_activities')}
                                                </span>
                                                <span>{a.date}</span>
                                            </div>
                                        ))}
                                        {child.recent_progress?.map((p) => (
                                            <div
                                                key={`p${p.id}`}
                                                className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-xs"
                                            >
                                                <span className="truncate text-muted-foreground">
                                                    {p.sub_theme ?? t('progress')}
                                                </span>
                                                <span className="flex shrink-0 items-center gap-1.5">
                                                    <RatingChip value={p.activity_done} />
                                                    <span className="text-muted-foreground">{p.date}</span>
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
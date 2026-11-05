import { useState } from 'react';
import { BookOpen, Download } from 'lucide-react';

import PhotoThumb from '@/Components/photo-thumb';
import RatingChip from '@/Components/rating-chip';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { formatDate, localDate, shiftDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { listLabel, useLists } from '@/lib/lists';
import type { PhotoInfo } from '@/lib/photo';

export type ProgressItem = {
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
};

export default function ChildProgressCard({
    studentId,
    progress,
}: {
    studentId: number;
    progress: ProgressItem[];
}) {
    const { t } = useI18n();
    const lists = useLists();
    const [reportFrom, setReportFrom] = useState(shiftDate(localDate(), -90));
    const [reportTo, setReportTo] = useState(localDate());

    return (
        <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="size-4 text-primary" />
                    {t('progress')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border bg-muted/20 p-3">
                    <div className="w-full space-y-1 md:w-40">
                        <Label className="text-[11px]" htmlFor="report-from">
                            {t('from')}
                        </Label>
                        <Input
                            id="report-from"
                            type="date"
                            className="h-9"
                            aria-label={t('from')}
                            value={reportFrom}
                            onChange={(e) => setReportFrom(e.target.value)}
                        />
                    </div>
                    <div className="w-full space-y-1 md:w-40">
                        <Label className="text-[11px]" htmlFor="report-to">
                            {t('to')}
                        </Label>
                        <Input
                            id="report-to"
                            type="date"
                            className="h-9"
                            aria-label={t('to')}
                            value={reportTo}
                            onChange={(e) => setReportTo(e.target.value)}
                        />
                    </div>
                    <a
                        href={route('parent.children.progress-report', {
                            student: studentId,
                            from: reportFrom,
                            to: reportTo,
                        })}
                    >
                        <Button variant="outline" className="gap-1.5">
                            <Download className="size-4" />
                            {t('progress_report')}
                        </Button>
                    </a>
                </div>

                {progress.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t('no_data')}</p>
                ) : (
                    <div className="space-y-2">
                        {progress.map((p) => (
                            <div key={p.id} className="rounded-xl border p-3">
                                <div className="flex items-center justify-between gap-2 text-sm">
                                    <span className="font-medium">
                                        {p.sub_theme ?? t('progress')}
                                    </span>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {formatDate(p.date)}
                                    </span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <RatingChip value={p.activity_done} />
                                    <RatingChip value={p.child_proficiency} />
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                        {listLabel(lists, 'progress_development', p.development_proficiency)}
                                    </span>
                                </div>
                                <p className="mt-1.5 text-[11px] text-muted-foreground">
                                    {t('permata_activity')}:{' '}
                                    {listLabel(lists, 'progress_permata', p.permata_activity)} ·{' '}
                                    {t('free_activity')}:{' '}
                                    {listLabel(lists, 'progress_free', p.free_activity)}
                                </p>
                                {p.notes && (
                                    <p className="mt-1 text-[11px] italic text-muted-foreground">
                                        {p.notes}
                                    </p>
                                )}
                                {p.photo && (
                                    <div className="mt-2">
                                        <PhotoThumb photo={p.photo} size="size-20" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

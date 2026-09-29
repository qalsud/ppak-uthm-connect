import { router, useForm } from '@inertiajs/react';
import { CalendarPlus, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { localDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';

export type Absence = {
    id: number;
    start_date: string;
    end_date: string;
    days: number;
    type: 'sick' | 'personal' | 'other';
    reason: string | null;
    status: 'pending' | 'approved' | 'declined';
    review_note: string | null;
    reviewed_by: string | null;
};

const chip = (status: Absence['status']) =>
    status === 'approved'
        ? 'bg-emerald-100 text-emerald-700'
        : status === 'declined'
          ? 'bg-rose-100 text-rose-700'
          : 'bg-amber-100 text-amber-700';

/** Upcoming absences for a child, plus a form to report a new one. */
export default function AbsencePanel({ child }: { child: { id: number; name: string; absences: Absence[] } }) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);

    const form = useForm({
        start_date: localDate(),
        end_date: localDate(),
        type: 'sick',
        reason: '',
    });

    const submit = () =>
        form.post(route('parent.absences.store', { student: child.id }), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('reason');
                setOpen(false);
            },
        });

    const withdraw = (id: number) =>
        router.delete(route('parent.absences.destroy', { absence: id }), { preserveScroll: true });

    return (
        <div className="border-t pt-4">
            <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarPlus className="size-4 text-primary" />
                    {t('absences')}
                </p>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setOpen((v) => !v)}
                >
                    {t('absence_request')}
                </Button>
            </div>

            {child.absences.length === 0 && !open && (
                <p className="text-[11px] text-muted-foreground">{t('absence.none')}</p>
            )}

            {child.absences.length > 0 && (
                <div className="space-y-1.5">
                    {child.absences.map((a) => (
                        <div
                            key={a.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-xs font-medium">
                                    {a.start_date === a.end_date
                                        ? a.start_date
                                        : `${a.start_date} → ${a.end_date}`}{' '}
                                    · {a.days} {t('absence_days')}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                    {t(`absence.${a.type}`)}
                                    {a.reason ? ` · ${a.reason}` : ''}
                                    {a.review_note ? ` · ${a.review_note}` : ''}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${chip(a.status)}`}
                                >
                                    {t(a.status)}
                                </span>
                                {a.status === 'pending' && (
                                    <button
                                        type="button"
                                        onClick={() => withdraw(a.id)}
                                        className="text-muted-foreground hover:text-destructive"
                                        aria-label={t('cancel_request')}
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {open && (
                <div className="mt-2 space-y-2 rounded-xl border p-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label htmlFor={`from-${child.id}`}>{t('absence_from')}</Label>
                            <Input
                                id={`from-${child.id}`}
                                type="date"
                                value={form.data.start_date}
                                onChange={(e) => form.setData('start_date', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor={`to-${child.id}`}>{t('absence_to')}</Label>
                            <Input
                                id={`to-${child.id}`}
                                type="date"
                                value={form.data.end_date}
                                onChange={(e) => form.setData('end_date', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>{t('absence_type')}</Label>
                        <Select value={form.data.type} onValueChange={(v) => form.setData('type', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="sick">{t('absence.sick')}</SelectItem>
                                <SelectItem value="personal">{t('absence.personal')}</SelectItem>
                                <SelectItem value="other">{t('absence.other')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor={`reason-${child.id}`}>{t('absence_reason')}</Label>
                        <Input
                            id={`reason-${child.id}`}
                            value={form.data.reason}
                            placeholder={t('absence_reason_placeholder')}
                            onChange={(e) => form.setData('reason', e.target.value)}
                        />
                    </div>

                    {(form.errors.start_date || form.errors.end_date) && (
                        <p className="text-xs text-destructive">
                            {form.errors.start_date ?? form.errors.end_date}
                        </p>
                    )}

                    <Button
                        onClick={submit}
                        disabled={form.processing}
                        className="h-10 w-full rounded-xl"
                    >
                        {t('absence_request')}
                    </Button>
                </div>
            )}
        </div>
    );
}

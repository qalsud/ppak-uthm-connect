import { router, useForm } from '@inertiajs/react';
import { CalendarPlus, ChevronRight, Paperclip, Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';

import ProofUpload, { ProofLink, type Proof } from '@/Components/proof-upload';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { localDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { useList } from '@/lib/lists';

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
    attachments: Proof[];
};

const statusChip = (status: Absence['status']) =>
    status === 'approved'
        ? 'bg-emerald-100 text-emerald-700'
        : status === 'declined'
          ? 'bg-rose-100 text-rose-700'
          : 'bg-amber-100 text-amber-700';

const typeTint = (type: Absence['type']) =>
    type === 'sick'
        ? 'bg-rose-50 text-rose-700'
        : type === 'personal'
          ? 'bg-sky-50 text-sky-700'
          : 'bg-slate-100 text-slate-600';

/** Upcoming absences for a child, plus a big friendly "report an absence" card. */
export default function AbsencePanel({ child }: { child: { id: number; name: string; absences: Absence[] } }) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const attachRef = useRef<HTMLInputElement>(null);
    const [attachFor, setAttachFor] = useState<number | null>(null);

    const form = useForm<{
        start_date: string;
        end_date: string;
        type: string;
        reason: string;
        document: File | null;
    }>({
        start_date: localDate(),
        end_date: localDate(),
        type: 'sick',
        reason: '',
        document: null,
    });

    const submit = () =>
        form.post(route('parent.absences.store', { student: child.id }), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
            },
        });

    const withdraw = (id: number) =>
        router.delete(route('parent.absences.destroy', { absence: id }), { preserveScroll: true });

    const pickProof = (id: number) => {
        setAttachFor(id);
        attachRef.current?.click();
    };

    const uploadProof = (file: File | null) => {
        if (!file || attachFor === null) {
            return;
        }

        router.post(
            route('parent.absences.attach', { absence: attachFor }),
            { document: file },
            {
                preserveScroll: true,
                forceFormData: true,
                onFinish: () => {
                    setAttachFor(null);
                    if (attachRef.current) {
                        attachRef.current.value = '';
                    }
                },
            },
        );
    };

    const dateRange = (a: Absence) =>
        a.start_date === a.end_date ? a.start_date : `${a.start_date} → ${a.end_date}`;

    return (
        <div className="border-t pt-4">
            {/* Hidden input shared by the per-row "attach proof" buttons. */}
            <input
                ref={attachRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => uploadProof(e.target.files?.[0] ?? null)}
            />

            <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarPlus className="size-4 text-primary" />
                    {t('absences')}
                </p>
                {child.absences.length > 0 && !open && (
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setOpen(true)}>
                        <Plus className="size-3.5" />
                        {t('absence_request')}
                    </Button>
                )}
            </div>

            {/* The big clickable "report an absence" card. */}
            {!open && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/[0.04] px-4 py-3.5 text-left transition-all hover:border-primary hover:bg-primary/[0.08] active:scale-[0.995]"
                >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <CalendarPlus className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{t('absence_request')}</span>
                        <span className="block text-[11px] text-muted-foreground">{t('absence_hint')}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
            )}

            {/* Existing requests. */}
            {child.absences.length > 0 && (
                <div className="mt-2 space-y-1.5">
                    {child.absences.map((a) => (
                        <div key={a.id} className="rounded-xl border bg-muted/30 px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold">{dateRange(a)}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {a.days} {t('absence_days')}
                                        {a.reason ? ` · ${a.reason}` : ''}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeTint(a.type)}`}
                                    >
                                        {t(`absence.${a.type}`)}
                                    </span>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusChip(a.status)}`}
                                    >
                                        {t(a.status)}
                                    </span>
                                    {a.status === 'pending' && (
                                        <button
                                            type="button"
                                            onClick={() => withdraw(a.id)}
                                            className="text-muted-foreground transition-colors hover:text-destructive"
                                            aria-label={t('cancel_request')}
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Proof documents */}
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                {a.attachments.map((proof) => (
                                    <ProofLink key={proof.id} proof={proof} />
                                ))}
                                {a.status === 'pending' && (
                                    <button
                                        type="button"
                                        onClick={() => pickProof(a.id)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-dashed px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                                    >
                                        <Paperclip className="size-3" />
                                        {t('absence_proof_attach')}
                                    </button>
                                )}
                                {a.attachments.length === 0 && a.status !== 'pending' && (
                                    <span className="text-[11px] text-muted-foreground">
                                        {t('absence_proof_none')}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {child.absences.length === 0 && !open && (
                <p className="mt-2 text-[11px] text-muted-foreground">{t('absence.none')}</p>
            )}

            {/* The form. */}
            {open && (
                <div className="mt-2 space-y-3 rounded-2xl border-2 border-primary/30 p-3 shadow-sm">
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
                                {useList('absence_type').map((a) => (
                                    <SelectItem key={a.value} value={a.value}>
                                        {a.label}
                                    </SelectItem>
                                ))}
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

                    <div className="space-y-1">
                        <Label>{t('absence_proof')}</Label>
                        <ProofUpload
                            value={form.data.document}
                            onChange={(file) => form.setData('document', file)}
                        />
                    </div>

                    {(form.errors.start_date || form.errors.end_date || form.errors.document) && (
                        <p className="text-xs text-destructive">
                            {form.errors.start_date ?? form.errors.end_date ?? form.errors.document}
                        </p>
                    )}

                    <div className="flex gap-2">
                        <Button
                            onClick={submit}
                            disabled={form.processing}
                            className="h-11 flex-1 rounded-xl font-semibold"
                        >
                            {form.processing ? t('saving') : t('absence_request')}
                        </Button>
                        <Button
                            variant="outline"
                            className="h-11 rounded-xl"
                            onClick={() => {
                                setOpen(false);
                                form.reset();
                            }}
                        >
                            {t('cancel')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useForm } from '@inertiajs/react';
import { CameraOff } from 'lucide-react';
import { useState } from 'react';

import PhotoUpload from '@/Components/photo-upload';
import { Button } from '@/Components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { useI18n } from '@/lib/i18n';

export type Collector = {
    id: string;
    name: string;
    relationship: string | null;
    phone: string | null;
    photo_url: string | null;
    guardian: boolean;
};

export default function CheckoutDialog({
    studentId,
    studentName,
    open,
    onOpenChange,
    date,
    collectors = [],
}: {
    studentId: number;
    studentName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    date?: string;
    /** Adults authorised to collect this child (guardians + listed people). */
    collectors?: Collector[];
}) {
    const { t } = useI18n();
    const [skip, setSkip] = useState(false);

    const form = useForm({
        photo: null as File | null,
        note: '',
        skip_photo: false,
        override_reason: '',
        collected_by: '',
        collector_override: '',
        ...(date ? { date } : {}),
    });

    const chosen = collectors.find((c) => c.id === form.data.collected_by);
    const notListed = form.data.collected_by === 'other';

    const reset = () => {
        setSkip(false);
        form.reset();
    };

    const close = (next: boolean) => {
        if (!next) {
            reset();
        }
        onOpenChange(next);
    };

    const toggleSkip = (value: boolean) => {
        setSkip(value);
        form.setData('skip_photo', value);

        if (value) {
            form.setData('photo', null);
        } else {
            form.setData('override_reason', '');
        }
    };

    const canSubmit =
        (skip ? form.data.override_reason.trim().length > 0 : form.data.photo !== null) &&
        (form.data.collected_by !== '' &&
            (!notListed || form.data.collector_override.trim().length > 0));

    const submit = () =>
        form.post(route('teacher.attendance.checkout', { student: studentId }), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => close(false),
        });

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {t('checkout_title')} · {studentName}
                    </DialogTitle>
                    <DialogDescription>{t('checkout_desc')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Safeguarding: confirm who is collecting the child. */}
                    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/[0.03] p-3">
                        <Label>{t('select_collector')}</Label>

                        {collectors.length > 0 ? (
                            <div className="max-h-48 space-y-1.5 overflow-y-auto">
                                {collectors.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => {
                                            form.setData('collected_by', c.id);
                                            form.setData('collector_override', '');
                                        }}
                                        className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                                            form.data.collected_by === c.id
                                                ? 'border-primary bg-primary/10'
                                                : 'hover:bg-muted/60'
                                        }`}
                                    >
                                        {c.photo_url ? (
                                            <img
                                                src={c.photo_url}
                                                alt=""
                                                className="size-9 shrink-0 rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                                                {c.name.slice(0, 2).toUpperCase()}
                                            </span>
                                        )}
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium">{c.name}</span>
                                            <span className="block truncate text-[11px] text-muted-foreground">
                                                {c.relationship ? t(`relationship.${c.relationship}`, c.relationship) : ''}
                                                {c.phone ? ` · ${c.phone}` : ''}
                                            </span>
                                        </span>
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => {
                                        form.setData('collected_by', 'other');
                                        form.setData('collector_override', '');
                                    }}
                                    className={`w-full rounded-lg border border-dashed px-2.5 py-2 text-left text-xs transition-colors ${
                                        notListed ? 'border-amber-400 bg-amber-50' : 'hover:bg-muted/60'
                                    }`}
                                >
                                    {t('not_authorised_label')}
                                </button>
                            </div>
                        ) : (
                            <p className="text-[11px] text-muted-foreground">{t('no_collectors')}</p>
                        )}

                        {notListed && (
                            <div className="space-y-1.5 pt-1">
                                <Label htmlFor="collector-override">{t('collector_override')}</Label>
                                <Input
                                    id="collector-override"
                                    value={form.data.collector_override}
                                    onChange={(e) => form.setData('collector_override', e.target.value)}
                                />
                            </div>
                        )}

                        {form.errors.collected_by && (
                            <p className="text-xs text-destructive">{form.errors.collected_by}</p>
                        )}
                        {form.errors.collector_override && (
                            <p className="text-xs text-destructive">{form.errors.collector_override}</p>
                        )}

                        {chosen && !notListed && (
                            <p className="text-[11px] text-muted-foreground">
                                {t('collected_by')}: {chosen.name}
                            </p>
                        )}
                    </div>

                    {!skip && (
                        <PhotoUpload
                            value={form.data.photo}
                            onChange={(file) => form.setData('photo', file)}
                            error={form.errors.photo}
                        />
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="checkout-note">{t('checkout_note')}</Label>
                        <Input
                            id="checkout-note"
                            value={form.data.note}
                            placeholder={t('checkout_note_placeholder')}
                            onChange={(e) => form.setData('note', e.target.value)}
                        />
                    </div>

                    <div className="space-y-2 rounded-xl border p-3">
                        <button
                            type="button"
                            onClick={() => toggleSkip(!skip)}
                            className="flex w-full items-center gap-2 text-left text-xs font-medium text-muted-foreground"
                        >
                            <CameraOff className="size-4" />
                            {t('skip_photo')}
                        </button>
                        {skip && (
                            <div className="space-y-1.5">
                                <Label htmlFor="override-reason">{t('override_reason')}</Label>
                                <Input
                                    id="override-reason"
                                    value={form.data.override_reason}
                                    onChange={(e) => form.setData('override_reason', e.target.value)}
                                />
                                {form.errors.override_reason && (
                                    <p className="text-xs text-destructive">
                                        {form.errors.override_reason}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => close(false)}>
                        {t('cancel')}
                    </Button>
                    <Button onClick={submit} disabled={!canSubmit || form.processing}>
                        {form.processing ? t('uploading') : t('confirm_checkout')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

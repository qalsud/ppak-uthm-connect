import { useForm } from '@inertiajs/react';
import { Camera, CameraOff, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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

const MAX_BYTES = 10 * 1024 * 1024;

export default function CheckoutDialog({
    studentId,
    studentName,
    open,
    onOpenChange,
    date,
}: {
    studentId: number;
    studentName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    date?: string;
}) {
    const { t } = useI18n();
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [pickError, setPickError] = useState<string | null>(null);
    const [skip, setSkip] = useState(false);

    const form = useForm({
        photo: null as File | null,
        note: '',
        skip_photo: false,
        override_reason: '',
        ...(date ? { date } : {}),
    });

    // Revoke the preview object URL when it changes or the dialog unmounts.
    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    const reset = () => {
        setPreview(null);
        setPickError(null);
        setSkip(false);
        form.reset();
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const close = (next: boolean) => {
        if (!next) {
            reset();
        }
        onOpenChange(next);
    };

    const pick = (file: File | null) => {
        setPickError(null);

        if (!file) {
            setPreview(null);
            form.setData('photo', null);

            return;
        }

        if (!file.type.startsWith('image/')) {
            setPickError(t('photo_invalid_type'));

            return;
        }

        if (file.size > MAX_BYTES) {
            setPickError(t('photo_too_large'));

            return;
        }

        setPreview(URL.createObjectURL(file));
        form.setData('photo', file);
    };

    const toggleSkip = (value: boolean) => {
        setSkip(value);
        form.setData('skip_photo', value);

        if (value) {
            form.setData('photo', null);
            setPreview(null);
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        } else {
            form.setData('override_reason', '');
        }
    };

    const canSubmit = skip
        ? form.data.override_reason.trim().length > 0
        : form.data.photo !== null;

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

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => pick(e.target.files?.[0] ?? null)}
                />

                <div className="space-y-4">
                    {!skip && (
                        <div className="space-y-2">
                            {preview ? (
                                <div className="overflow-hidden rounded-xl border">
                                    <img src={preview} alt="" className="max-h-64 w-full object-contain" />
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => inputRef.current?.click()}
                                    className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors hover:bg-muted/50"
                                >
                                    <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                                        <Camera className="size-5" />
                                    </span>
                                    <span className="text-sm font-medium">{t('take_photo')}</span>
                                </button>
                            )}

                            {preview && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => inputRef.current?.click()}
                                >
                                    <Upload className="size-4" />
                                    {t('retake_photo')}
                                </Button>
                            )}

                            {pickError && <p className="text-xs text-destructive">{pickError}</p>}
                            {form.errors.photo && (
                                <p className="text-xs text-destructive">{form.errors.photo}</p>
                            )}
                        </div>
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

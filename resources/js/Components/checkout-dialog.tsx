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
    const [skip, setSkip] = useState(false);

    const form = useForm({
        photo: null as File | null,
        note: '',
        skip_photo: false,
        override_reason: '',
        ...(date ? { date } : {}),
    });

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

                <div className="space-y-4">
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

import { useForm } from '@inertiajs/react';

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

/** Check a child in — with an optional temperature / health note. */
export default function CheckInDialog({
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

    const form = useForm({
        action: 'arrive',
        temperature: '',
        health_note: '',
        ...(date ? { date } : {}),
    });

    const submit = () =>
        form.post(route('teacher.attendance.store', { student: studentId }), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onOpenChange(false);
            },
        });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>
                        {t('check_in_title')} · {studentName}
                    </DialogTitle>
                    <DialogDescription>{t('check_in_desc')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="temperature">{t('temperature')}</Label>
                        <Input
                            id="temperature"
                            type="number"
                            step="0.1"
                            min="30"
                            max="45"
                            inputMode="decimal"
                            value={form.data.temperature}
                            onChange={(e) => form.setData('temperature', e.target.value)}
                        />
                        <p className="text-[11px] text-muted-foreground">{t('temperature_hint')}</p>
                        {form.errors.temperature && (
                            <p className="text-xs text-destructive">{form.errors.temperature}</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="health_note">{t('health_note')}</Label>
                        <Input
                            id="health_note"
                            value={form.data.health_note}
                            placeholder={t('health_note_placeholder')}
                            onChange={(e) => form.setData('health_note', e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('cancel')}
                    </Button>
                    <Button onClick={submit} disabled={form.processing}>
                        {form.processing ? t('saving') : t('confirm_check_in')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

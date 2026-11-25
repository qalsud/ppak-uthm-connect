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
import { actionRoute } from '@/lib/shell';

const TYPES = ['sick', 'personal', 'other'] as const;

export default function AbsentDialog({
    studentId,
    studentName,
    open,
    onOpenChange,
    date,
    isAdmin = false,
}: {
    studentId: number;
    studentName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    date?: string;
    isAdmin?: boolean;
}) {
    const { t } = useI18n();

    const form = useForm({
        absence_type: 'sick',
        absence_note: '',
        ...(date ? { date } : {}),
    });

    const submit = () => {
        form.transform((data) => ({ ...data, ...(date ? { date } : {}) }));
        form.post(actionRoute(isAdmin, 'attendance.absent', { student: studentId }), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>
                        {t('absent_title').replace(':name', studentName)}
                    </DialogTitle>
                    <DialogDescription>{t('absent_desc')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="absence-type">{t('absent_reason')}</Label>
                        <select
                            id="absence-type"
                            value={form.data.absence_type}
                            onChange={(e) => form.setData('absence_type', e.target.value)}
                            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                        >
                            {TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {t(`absence.${type}`)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="absence-note">{t('absent_note')}</Label>
                        <Input
                            id="absence-note"
                            value={form.data.absence_note}
                            placeholder={t('absent_note_placeholder')}
                            onChange={(e) => form.setData('absence_note', e.target.value)}
                        />
                    </div>

                    {form.errors.absence_type && (
                        <p className="text-xs text-destructive">{form.errors.absence_type}</p>
                    )}
                    {form.errors.date && (
                        <p className="text-xs text-destructive">{form.errors.date}</p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('cancel')}
                    </Button>
                    <Button variant="destructive" onClick={submit} disabled={form.processing}>
                        {form.processing ? t('saving') : t('confirm_absent')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

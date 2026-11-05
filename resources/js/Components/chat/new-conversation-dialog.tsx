import { useState } from 'react';

import { Button } from '@/Components/ui/button';
import { useI18n } from '@/lib/i18n';

export default function NewConversationDialog({
    students,
    onClose,
    onStart,
}: {
    students: Array<{ id: number; name: string; class: string }>;
    onClose: () => void;
    onStart: (studentId: number) => void;
}) {
    const { t } = useI18n();
    const [picked, setPicked] = useState('');

    const start = () => {
        if (!picked) {
            return;
        }

        onStart(Number(picked));
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm space-y-3 rounded-2xl border bg-card p-4"
                onClick={(e) => e.stopPropagation()}
            >
                <p className="text-sm font-semibold">{t('new_conversation')}</p>
                <select
                    value={picked}
                    onChange={(e) => setPicked(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                    <option value="">{t('select_student')}</option>
                    {students.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button onClick={start} disabled={!picked}>
                        {t('open')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

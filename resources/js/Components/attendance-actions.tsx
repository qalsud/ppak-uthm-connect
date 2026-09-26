import { router } from '@inertiajs/react';
import { LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';

import CheckoutDialog from '@/Components/checkout-dialog';
import PhotoThumb from '@/Components/photo-thumb';
import { Button } from '@/Components/ui/button';
import type { PhotoInfo } from '@/lib/photo';
import { useI18n } from '@/lib/i18n';

export type AttendanceSummary = {
    status: 'none' | 'school' | 'home';
    arrived_at: string | null;
    departed_at: string | null;
    photo?: PhotoInfo | null;
    note?: string | null;
    photo_override?: boolean;
};

const empty: AttendanceSummary = {
    status: 'none',
    arrived_at: null,
    departed_at: null,
    photo: null,
    note: null,
    photo_override: false,
};

export default function AttendanceActions({
    studentId,
    studentName,
    attendance = empty,
    role,
    date,
    showChip = true,
}: {
    studentId: number;
    studentName?: string;
    attendance?: AttendanceSummary;
    role: 'parent' | 'teacher';
    /** Register date (teachers only). Defaults to today server-side. */
    date?: string;
    /** Render the status chip (set false when the caller shows its own). */
    showChip?: boolean;
}) {
    const { t } = useI18n();
    const [busy, setBusy] = useState(false);
    const [checkoutOpen, setCheckoutOpen] = useState(false);

    // Parents are read-only: attendance is marked by teachers.
    const readOnly = role === 'parent';

    const markArrival = () => {
        setBusy(true);
        router.post(
            route('teacher.attendance.store', { student: studentId }),
            date ? { action: 'arrive', date } : { action: 'arrive' },
            { preserveScroll: true, onFinish: () => setBusy(false) },
        );
    };

    const { status, arrived_at, departed_at, photo, note, photo_override } = attendance;

    const chip =
        status === 'school'
            ? { label: `${t('at_school')}${arrived_at ? ` · ${arrived_at}` : ''}`, cls: 'bg-sky-100 text-sky-700' }
            : status === 'home'
              ? { label: `${t('back_home')}${departed_at ? ` · ${departed_at}` : ''}`, cls: 'bg-emerald-100 text-emerald-700' }
              : { label: t('not_arrived'), cls: 'bg-slate-100 text-slate-600' };

    return (
        <div className="space-y-2">
            {showChip && (
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${chip.cls}`}>
                    {chip.label}
                </span>
            )}

            {/* Checkout proof */}
            {(photo || note || photo_override) && (
                <div className="flex items-center gap-2">
                    {photo && <PhotoThumb photo={photo} />}
                    <div className="min-w-0">
                        {note && <p className="truncate text-[11px] text-muted-foreground">{note}</p>}
                        {photo_override && (
                            <p className="text-[11px] text-amber-600">{t('photo_override')}</p>
                        )}
                    </div>
                </div>
            )}

            {readOnly ? (
                <p className="text-[11px] text-muted-foreground">{t('updated_by_teacher')}</p>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-10 gap-1.5 rounded-xl text-xs"
                        disabled={busy || status === 'school'}
                        onClick={markArrival}
                    >
                        <LogIn className="size-4" />
                        {t('at_school')}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-10 gap-1.5 rounded-xl text-xs"
                        disabled={busy || status === 'home'}
                        onClick={() => setCheckoutOpen(true)}
                    >
                        <LogOut className="size-4" />
                        {t('back_home')}
                    </Button>
                </div>
            )}

            {!readOnly && (
                <CheckoutDialog
                    studentId={studentId}
                    studentName={studentName ?? ''}
                    date={date}
                    open={checkoutOpen}
                    onOpenChange={setCheckoutOpen}
                />
            )}
        </div>
    );
}

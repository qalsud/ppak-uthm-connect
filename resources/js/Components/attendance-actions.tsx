import { LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';

import CheckInDialog from '@/Components/check-in-dialog';
import CheckoutDialog from '@/Components/checkout-dialog';
import PhotoThumb from '@/Components/photo-thumb';
import { Button } from '@/Components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { PhotoInfo } from '@/lib/photo';

export type AttendanceSummary = {
    status: 'none' | 'school' | 'home';
    arrived_at: string | null;
    departed_at: string | null;
    temperature?: string | null;
    health_note?: string | null;
    photo?: PhotoInfo | null;
    note?: string | null;
    photo_override?: boolean;
};

const empty: AttendanceSummary = {
    status: 'none',
    arrived_at: null,
    departed_at: null,
    temperature: null,
    health_note: null,
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
    const [checkInOpen, setCheckInOpen] = useState(false);
    const [checkoutOpen, setCheckoutOpen] = useState(false);

    // Parents are read-only: attendance is marked by teachers.
    const readOnly = role === 'parent';

    const { status, arrived_at, departed_at, temperature, health_note, photo, note, photo_override } =
        attendance;

    const elevated = temperature !== null && temperature !== undefined && parseFloat(temperature) >= 37.5;

    const chip =
        status === 'school'
            ? {
                  label: `${t('at_school')}${arrived_at ? ` · ${arrived_at}` : ''}${
                      temperature ? ` · ${temperature}°C` : ''
                  }`,
                  cls: elevated ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700',
              }
            : status === 'home'
              ? { label: `${t('back_home')}${departed_at ? ` · ${departed_at}` : ''}`, cls: 'bg-emerald-100 text-emerald-700' }
              : { label: t('not_arrived'), cls: 'bg-slate-100 text-slate-600' };

    return (
        <div className="space-y-2">
            {showChip && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${chip.cls}`}>
                    {chip.label}
                    {elevated && (
                        <span className="rounded-full bg-amber-200 px-1.5 text-[9px] font-semibold text-amber-800">
                            {t('elevated')}
                        </span>
                    )}
                </span>
            )}

            {health_note && <p className="text-[11px] text-muted-foreground">{health_note}</p>}

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
                        disabled={status === 'school'}
                        onClick={() => setCheckInOpen(true)}
                    >
                        <LogIn className="size-4" />
                        {t('at_school')}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-10 gap-1.5 rounded-xl text-xs"
                        disabled={status === 'home'}
                        onClick={() => setCheckoutOpen(true)}
                    >
                        <LogOut className="size-4" />
                        {t('back_home')}
                    </Button>
                </div>
            )}

            {!readOnly && (
                <>
                    <CheckInDialog
                        studentId={studentId}
                        studentName={studentName ?? ''}
                        date={date}
                        open={checkInOpen}
                        onOpenChange={setCheckInOpen}
                    />
                    <CheckoutDialog
                        studentId={studentId}
                        studentName={studentName ?? ''}
                        date={date}
                        open={checkoutOpen}
                        onOpenChange={setCheckoutOpen}
                    />
                </>
            )}
        </div>
    );
}

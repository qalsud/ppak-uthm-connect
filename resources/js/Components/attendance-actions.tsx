import { router } from '@inertiajs/react';
import { LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/Components/ui/button';
import { useI18n } from '@/lib/i18n';

export type AttendanceSummary = {
    status: 'none' | 'school' | 'home';
    arrived_at: string | null;
    departed_at: string | null;
};

const empty: AttendanceSummary = { status: 'none', arrived_at: null, departed_at: null };

export default function AttendanceActions({
    studentId,
    attendance = empty,
    role,
}: {
    studentId: number;
    attendance?: AttendanceSummary;
    role: 'parent' | 'teacher';
}) {
    const { t } = useI18n();
    const [busy, setBusy] = useState<'arrive' | 'depart' | null>(null);

    const post = (action: 'arrive' | 'depart') => {
        setBusy(action);
        router.post(
            route(
                role === 'parent' ? 'parent.attendance.store' : 'teacher.attendance.store',
                { student: studentId },
            ),
            { action },
            { preserveScroll: true, onFinish: () => setBusy(null) },
        );
    };

    const { status, arrived_at, departed_at } = attendance;

    const chip =
        status === 'school'
            ? { label: `${t('at_school')}${arrived_at ? ` · ${arrived_at}` : ''}`, cls: 'bg-sky-100 text-sky-700' }
            : status === 'home'
              ? { label: `${t('back_home')}${departed_at ? ` · ${departed_at}` : ''}`, cls: 'bg-emerald-100 text-emerald-700' }
              : { label: t('not_arrived'), cls: 'bg-slate-100 text-slate-600' };

    const arriveLabel = role === 'parent' ? t('send_to_school') : t('at_school');
    const departLabel = role === 'parent' ? t('bring_home') : t('back_home');

    return (
        <div className="space-y-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${chip.cls}`}>
                {chip.label}
            </span>
            <div className="grid grid-cols-2 gap-2">
                <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-1.5 rounded-xl text-xs"
                    disabled={busy !== null || status === 'school'}
                    onClick={() => post('arrive')}
                >
                    <LogIn className="size-4" />
                    {arriveLabel}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-1.5 rounded-xl text-xs"
                    disabled={busy !== null || status === 'home'}
                    onClick={() => post('depart')}
                >
                    <LogOut className="size-4" />
                    {departLabel}
                </Button>
            </div>
        </div>
    );
}
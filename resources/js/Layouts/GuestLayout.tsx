import type { PropsWithChildren } from 'react';

import BrandLockup from '@/Components/brand-lockup';
import { useI18n } from '@/lib/i18n';

export default function GuestLayout({ children }: PropsWithChildren) {
    const { t } = useI18n();

    return (
        <div className="flex min-h-screen bg-background">
            {/* Brand panel */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-navy p-10 text-white lg:flex">
                <div className="pointer-events-none absolute -right-24 top-10 size-96 rounded-full bg-brand-accent/20 blur-3xl" />
                <div className="pointer-events-none absolute -left-24 bottom-0 size-96 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="relative">
                    <BrandLockup />
                </div>
                <div className="relative">
                    <h2 className="max-w-md text-3xl font-extrabold leading-tight">
                        {t('guest_tagline_title')}
                    </h2>
                    <p className="mt-4 max-w-md text-sm text-white/60">
                        {t('guest_tagline_body')}
                    </p>
                </div>
                <div className="relative">
                    <p className="text-xs text-white/40">
                        © {new Date().getFullYear()} Pusat Pendidikan Awal Kanak-Kanak UTHM
                    </p>
                </div>
            </div>

            {/* Form panel */}
            <div className="flex w-full flex-col items-center justify-center px-6 py-10 lg:w-1/2">
                <div className="w-full max-w-sm">{children}</div>
            </div>
        </div>
    );
}
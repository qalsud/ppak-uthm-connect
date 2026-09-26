import { GraduationCap } from 'lucide-react';
import type { PropsWithChildren } from 'react';

export default function GuestLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen bg-background">
            {/* Brand panel */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-navy p-10 text-white lg:flex">
                <div className="pointer-events-none absolute -right-24 top-10 size-96 rounded-full bg-brand-accent/20 blur-3xl" />
                <div className="pointer-events-none absolute -left-24 bottom-0 size-96 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="relative flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-brand-accent text-white">
                        <GraduationCap className="size-5" />
                    </span>
                    <span className="text-sm font-bold">PPAK UTHM Connect</span>
                </div>
                <div className="relative">
                    <h2 className="max-w-md text-3xl font-extrabold leading-tight">
                        One platform for parents, teachers and administrators.
                    </h2>
                    <p className="mt-4 max-w-md text-sm text-white/60">
                        Track daily activities, manage fees, share progress and stay connected —
                        all in one place.
                    </p>
                </div>
                <p className="relative text-xs text-white/40">
                    © {new Date().getFullYear()} Pusat Pendidikan Awal Kanak-Kanak UTHM
                </p>
            </div>

            {/* Form panel */}
            <div className="flex w-full flex-col items-center justify-center px-6 py-10 lg:w-1/2">
                <div className="w-full max-w-sm">{children}</div>
            </div>
        </div>
    );
}
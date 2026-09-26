import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BellRing,
    BookOpen,
    CalendarCheck,
    CreditCard,
    GraduationCap,
    MessagesSquare,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';

import LanguageSwitcher from '@/Components/language-switcher';
import { Button } from '@/Components/ui/button';
import { useI18n } from '@/lib/i18n';
import { homePathFor } from '@/lib/navigation';
import type { PageProps } from '@/types';

export default function Welcome({ auth }: PageProps) {
    const { t } = useI18n();

    const features = [
        { icon: CalendarCheck, title: 'Activity tracking', body: 'Daily meals, naps, health and classroom activities logged in real time.' },
        { icon: CreditCard, title: 'Payment management', body: 'Monthly fees, overtime and digital receipts with online payment.' },
        { icon: BellRing, title: 'Memos & events', body: 'Announcements and event updates delivered straight to parents.' },
        { icon: MessagesSquare, title: 'Direct messaging', body: 'Parents and teachers keep in touch inside the platform.' },
        { icon: BookOpen, title: 'Progress reports', body: 'Learning progress aligned with PERMATA and KSPK syllabi.' },
        { icon: ShieldCheck, title: 'Secure & private', body: 'Role-based access with verified accounts and approval flow.' },
    ];

    const dashboardHref = homePathFor(auth.user);

    return (
        <>
            <Head title="PPAK UTHM Connect System" />
            <div className="min-h-screen bg-white">
                {/* Nav */}
                <header className="sticky top-0 z-40 bg-brand-navy">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                        <Link href="/" className="flex items-center gap-2.5">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-accent text-white">
                                <GraduationCap className="size-5" />
                            </span>
                            <span className="text-sm font-bold text-white">PPAK UTHM</span>
                        </Link>
                        <nav className="hidden items-center gap-7 text-sm text-white/70 md:flex">
                            <a href="#features" className="transition-colors hover:text-white">
                                Features
                            </a>
                            <a href="#about" className="transition-colors hover:text-white">
                                About
                            </a>
                        </nav>
                        <div className="flex items-center gap-2">
                            <LanguageSwitcher />
                            {auth.user ? (
                                <Link href={dashboardHref}>
                                    <Button size="sm" className="gap-1.5">
                                        {t('dashboard')}
                                        <ArrowRight className="size-4" />
                                    </Button>
                                </Link>
                            ) : (
                                <Link href="/login">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="bg-white/10 text-white hover:bg-white/20"
                                    >
                                        {t('login')}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                {/* Hero */}
                <section className="relative overflow-hidden bg-brand-navy pb-24 pt-16 text-white">
                    <div className="pointer-events-none absolute -right-24 top-0 size-96 rounded-full bg-brand-accent/20 blur-3xl" />
                    <div className="pointer-events-none absolute -left-24 bottom-0 size-96 rounded-full bg-indigo-500/20 blur-3xl" />
                    <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white/90">
                            <Sparkles className="size-3.5" />
                            Digital platform for PPAK UTHM
                        </span>
                        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                            Manage your centre easily with one connected portal
                        </h1>
                        <p className="mx-auto mt-5 max-w-2xl text-base text-white/70">
                            PPAK UTHM Connect System is a school management solution that gives a
                            personalised experience to every user — parents, teachers and
                            administrators — through a single secure login.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                            <Link href="/register">
                                <Button size="lg" className="gap-2">
                                    {t('register')}
                                    <ArrowRight className="size-4" />
                                </Button>
                            </Link>
                            <Link href="/login">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                                >
                                    {t('login')}
                                </Button>
                            </Link>
                        </div>

                        {/* Product preview */}
                        <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
                            <div className="flex items-center gap-1.5 border-b bg-[#f7f8fa] px-4 py-3">
                                <span className="size-2.5 rounded-full bg-rose-400" />
                                <span className="size-2.5 rounded-full bg-amber-400" />
                                <span className="size-2.5 rounded-full bg-emerald-400" />
                                <span className="ml-3 text-xs text-muted-foreground">
                                    ppak-uthm-connect.test
                                </span>
                            </div>
                            <div className="flex">
                                <div className="hidden w-44 shrink-0 space-y-1 bg-sidebar p-3 sm:block">
                                    <p className="mb-3 px-2 text-xs font-bold text-white">
                                        PPAK UTHM
                                    </p>
                                    {['Dashboard', 'Students', 'Teachers', 'Payments', 'Memos'].map(
                                        (item, i) => (
                                            <div
                                                key={item}
                                                className={`rounded-md px-2 py-1.5 text-[11px] ${
                                                    i === 0
                                                        ? 'bg-sidebar-primary text-white'
                                                        : 'text-white/60'
                                                }`}
                                            >
                                                {item}
                                            </div>
                                        ),
                                    )}
                                </div>
                                <div className="flex-1 space-y-3 bg-[#f7f8fa] p-4">
                                    <div className="grid grid-cols-3 gap-3">
                                        {['Students', 'Teachers', 'Income'].map((k) => (
                                            <div
                                                key={k}
                                                className="rounded-xl border bg-white p-3"
                                            >
                                                <p className="text-[10px] text-muted-foreground">
                                                    {k}
                                                </p>
                                                <p className="text-sm font-bold">
                                                    {k === 'Income' ? 'RM 3,720' : '128'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex h-24 items-end gap-1.5 rounded-xl border bg-white p-3">
                                        {[40, 65, 45, 80, 55, 90, 70, 60, 85, 50, 75, 95].map(
                                            (h, i) => (
                                                <div
                                                    key={i}
                                                    className="flex-1 rounded-t bg-primary/80"
                                                    style={{ height: `${h}%` }}
                                                />
                                            ),
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight">
                            Everything your centre needs
                        </h2>
                        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                            From daily activity logs to fee collection, all in one place.
                        </p>
                    </div>
                    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((f) => (
                            <div
                                key={f.title}
                                className="rounded-2xl border bg-white p-6 transition-shadow hover:shadow-md"
                            >
                                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                                    <f.icon className="size-5" />
                                </span>
                                <h3 className="mt-4 font-semibold">{f.title}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* About / footer */}
                <footer id="about" className="bg-brand-navy py-14 text-white">
                    <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center sm:px-6">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-brand-accent text-white">
                            <GraduationCap className="size-6" />
                        </span>
                        <p className="text-lg font-semibold">PPAK UTHM Connect System</p>
                        <p className="max-w-xl text-sm text-white/60">
                            Pusat Pendidikan Awal Kanak-Kanak, Universiti Tun Hussein Onn Malaysia.
                            Supporting Taska Hikmah UTHM and Tadika Khalifah Junior.
                        </p>
                        <p className="mt-4 text-xs text-white/40">
                            © {new Date().getFullYear()} PPAK UTHM. All rights reserved.
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
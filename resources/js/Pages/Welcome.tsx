import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BellRing,
    BookOpen,
    CalendarCheck,
    CreditCard,
    GraduationCap,
    Menu,
    MessagesSquare,
    ShieldCheck,
    Sparkles,
    X,
} from 'lucide-react';
import { useState } from 'react';

import LanguageSwitcher from '@/Components/language-switcher';
import Logo from '@/Components/logo';
import { Button } from '@/Components/ui/button';
import { useI18n } from '@/lib/i18n';
import { homePathFor } from '@/lib/navigation';
import type { PageProps } from '@/types';

export default function Welcome({ auth }: PageProps) {
    const { t } = useI18n();
    const [menuOpen, setMenuOpen] = useState(false);

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
                            <Logo chip className="size-9" />
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
                            <div className="hidden sm:block">
                                <LanguageSwitcher />
                            </div>
                            {auth.user ? (
                                <Link href={dashboardHref}>
                                    <Button size="sm" className="gap-1.5">
                                        {t('dashboard')}
                                        <ArrowRight className="size-4" />
                                    </Button>
                                </Link>
                            ) : (
                                <Link href="/login" className="hidden sm:block">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="bg-white/10 text-white hover:bg-white/20"
                                    >
                                        {t('login')}
                                    </Button>
                                </Link>
                            )}
                            <button
                                onClick={() => setMenuOpen((v) => !v)}
                                className="flex size-9 items-center justify-center rounded-lg text-white hover:bg-white/10 md:hidden"
                                aria-label="Menu"
                            >
                                {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile menu */}
                    {menuOpen && (
                        <div className="border-t border-white/10 px-4 pb-4 pt-2 md:hidden">
                            <div className="flex flex-col">
                                <a
                                    href="#features"
                                    onClick={() => setMenuOpen(false)}
                                    className="py-3 text-sm text-white/80"
                                >
                                    Features
                                </a>
                                <a
                                    href="#about"
                                    onClick={() => setMenuOpen(false)}
                                    className="py-3 text-sm text-white/80"
                                >
                                    About
                                </a>
                                <div className="mt-2 flex items-center gap-2">
                                    <LanguageSwitcher />
                                    {!auth.user && (
                                        <Link href="/login" className="flex-1">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="w-full bg-white/10 text-white hover:bg-white/20"
                                            >
                                                {t('login')}
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </header>

                {/* Hero */}
                <section className="relative overflow-hidden bg-brand-navy pb-16 pt-12 text-white sm:pb-24 sm:pt-16">
                    <div className="pointer-events-none absolute -right-24 top-0 size-80 rounded-full bg-brand-accent/20 blur-3xl" />
                    <div className="pointer-events-none absolute -left-24 bottom-0 size-80 rounded-full bg-indigo-500/20 blur-3xl" />
                    <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
                        <div className="mb-6 flex flex-wrap items-center justify-center gap-3 sm:mb-7 sm:gap-5">
                            <Logo chip className="size-20 sm:size-24" />
                            <Logo variant="uthm" chip className="h-20 w-56 sm:h-24 sm:w-72" />
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white/90">
                            <Sparkles className="size-3.5" />
                            Digital platform for PPAK UTHM
                        </span>
                        <h1 className="mx-auto mt-6 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                            Manage your centre easily with one connected portal
                        </h1>
                        <p className="mx-auto mt-4 max-w-2xl text-sm text-white/70 sm:mt-5 sm:text-base">
                            PPAK UTHM Connect System is a school management solution that gives a
                            personalised experience to every user — parents, teachers and
                            administrators — through a single secure login.
                        </p>
                        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                            <Link href="/register">
                                <Button size="lg" className="w-full gap-2 sm:w-auto">
                                    {t('register')}
                                    <ArrowRight className="size-4" />
                                </Button>
                            </Link>
                            <Link href="/login">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
                                >
                                    {t('login')}
                                </Button>
                            </Link>
                        </div>

                        {/* Product preview */}
                        <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl sm:mt-14">
                            <div className="flex items-center gap-1.5 border-b bg-[#f7f8fa] px-4 py-2.5">
                                <span className="size-2.5 rounded-full bg-rose-400" />
                                <span className="size-2.5 rounded-full bg-amber-400" />
                                <span className="size-2.5 rounded-full bg-emerald-400" />
                                <span className="ml-3 truncate text-[11px] text-muted-foreground">
                                    ppak-uthm-connect.test
                                </span>
                            </div>
                            <div className="flex">
                                <div className="hidden w-40 shrink-0 space-y-1 bg-sidebar p-3 sm:block">
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
                                <div className="flex-1 space-y-2.5 bg-[#f7f8fa] p-3 sm:space-y-3 sm:p-4">
                                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                        {['Students', 'Teachers', 'Income'].map((k) => (
                                            <div key={k} className="rounded-xl border bg-white p-2 sm:p-3">
                                                <p className="text-[10px] text-muted-foreground">{k}</p>
                                                <p className="text-xs font-bold sm:text-sm">
                                                    {k === 'Income' ? 'RM 3,720' : '128'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex h-20 items-end gap-1 rounded-xl border bg-white p-2 sm:h-24 sm:gap-1.5 sm:p-3">
                                        {[40, 65, 45, 80, 55, 90, 70, 60, 85, 50, 75, 95].map((h, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 rounded-t bg-primary/80"
                                                style={{ height: `${h}%` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section id="features" className="mx-auto max-w-6xl px-4 py-14 sm:py-20 sm:px-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                            Everything your centre needs
                        </h2>
                        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            From daily activity logs to fee collection, all in one place.
                        </p>
                    </div>
                    <div className="mt-9 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                        {features.map((f) => (
                            <div
                                key={f.title}
                                className="rounded-2xl border bg-white p-5 transition-shadow hover:shadow-md sm:p-6"
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

                {/* Footer */}
                <footer id="about" className="bg-brand-navy py-12 text-white sm:py-14">
                    <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <Logo chip className="size-16 sm:size-20" />
                            <Logo variant="uthm" chip className="h-16 w-52 sm:h-20 sm:w-64" />
                        </div>
                        <p className="text-lg font-semibold">PPAK UTHM Connect System</p>
                        <p className="max-w-xl text-sm text-white/60">
                            Pusat Pendidikan Awal Kanak-Kanak, Universiti Tun Hussein Onn Malaysia.
                            Supporting Taska Hikmah UTHM and Tadika Khalifah Junior.
                        </p>
                        <p className="mt-2 text-xs text-white/40">
                            © {new Date().getFullYear()} PPAK UTHM. All rights reserved.
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
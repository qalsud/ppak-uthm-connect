import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Check, GraduationCap, Megaphone, Menu, Pin, ShieldCheck, Users, X } from 'lucide-react';
import { useState } from 'react';

import LanguageSwitcher from '@/Components/language-switcher';
import BrandLockup from '@/Components/brand-lockup';
import Logo from '@/Components/logo';
import { Button } from '@/Components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { formatDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { homePathFor } from '@/lib/navigation';
import type { PageProps } from '@/types';

type Announcement = {
    id: number;
    title: string;
    excerpt: string;
    description: string;
    date: string | null;
    pinned: boolean;
};

export default function Welcome({
    auth,
    announcements = [],
}: PageProps<{ announcements?: Announcement[] }>) {
    const { t } = useI18n();
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeNotice, setActiveNotice] = useState<Announcement | null>(null);

    const dashboardHref = homePathFor(auth.user);
    const featured = announcements.find((notice) => notice.pinned) ?? announcements[0];
    const otherNotices = featured
        ? announcements.filter((notice) => notice.id !== featured.id)
        : [];

    const audiences = [
        {
            icon: Users,
            title: t('landing.for_parents'),
            note: t('landing.parents_note'),
            items: [t('attendance'), t('daily_updates'), t('progress'), t('payments'), t('messages')],
        },
        {
            icon: GraduationCap,
            title: t('landing.for_teachers'),
            note: t('landing.teachers_note'),
            items: [t('attendance'), t('daily_activities'), t('progress'), t('messages')],
        },
        {
            icon: ShieldCheck,
            title: t('landing.for_admin'),
            note: t('landing.admin_note'),
            items: [t('students'), t('teachers'), t('payments'), t('memos'), t('registrations')],
        },
    ];

    const steps = [
        { title: t('landing.step1_title'), body: t('landing.step1_body') },
        { title: t('landing.step2_title'), body: t('landing.step2_body') },
        { title: t('landing.step3_title'), body: t('landing.step3_body') },
    ];

    return (
        <>
            <Head title={t('welcome')} />
            <div className="min-h-screen bg-white">
                {/* Nav */}
                <header className="sticky top-0 z-40 bg-brand-navy">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                        <Link href="/" className="flex items-center gap-2.5">
                            <Logo chip className="size-9" />
                            <span className="text-sm font-bold text-white">PPAK UTHM</span>
                        </Link>

                        <nav className="hidden items-center gap-7 text-sm text-white/70 md:flex">
                            {announcements.length > 0 && (
                                <a href="#news" className="transition-colors hover:text-white">
                                    {t('landing.news_nav')}
                                </a>
                            )}
                            <a href="#about" className="transition-colors hover:text-white">
                                {t('landing.nav_about')}
                            </a>
                            <a href="#start" className="transition-colors hover:text-white">
                                {t('landing.nav_start')}
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
                                aria-label={t('menu')}
                            >
                                {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile menu */}
                    {menuOpen && (
                        <div className="border-t border-white/10 px-4 pb-4 pt-2 md:hidden">
                            <div className="flex flex-col">
                                {announcements.length > 0 && (
                                    <a
                                        href="#news"
                                        onClick={() => setMenuOpen(false)}
                                        className="py-3 text-sm text-white/80"
                                    >
                                        {t('landing.news_nav')}
                                    </a>
                                )}
                                <a
                                    href="#about"
                                    onClick={() => setMenuOpen(false)}
                                    className="py-3 text-sm text-white/80"
                                >
                                    {t('landing.nav_about')}
                                </a>
                                <a
                                    href="#start"
                                    onClick={() => setMenuOpen(false)}
                                    className="py-3 text-sm text-white/80"
                                >
                                    {t('landing.nav_start')}
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

                <main>
                    {/* Hero — a welcome, not a sales pitch */}
                <section className="relative overflow-hidden bg-brand-navy pb-14 pt-12 text-white sm:pb-20 sm:pt-16">
                    <div className="pointer-events-none absolute -right-24 top-0 size-80 rounded-full bg-brand-accent/20 blur-3xl" />
                    <div className="pointer-events-none absolute -left-24 bottom-0 size-80 rounded-full bg-indigo-500/20 blur-3xl" />
                    <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
                        <div className="mb-7 flex justify-center">
                            <BrandLockup />
                        </div>
                        <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white/90">
                            {t('landing.badge')}
                        </span>
                        <h1 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl">
                            {t('landing.title')}
                        </h1>
                        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
                            {t('landing.subtitle')}
                        </p>
                        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                            {auth.user ? (
                                <Link href={dashboardHref}>
                                    <Button size="lg" className="w-full gap-2 sm:w-auto">
                                        {t('dashboard')}
                                        <ArrowRight className="size-4" />
                                    </Button>
                                </Link>
                            ) : (
                                <>
                                    <Link href="/login">
                                        <Button size="lg" className="w-full gap-2 sm:w-auto">
                                            {t('login')}
                                            <ArrowRight className="size-4" />
                                        </Button>
                                    </Link>
                                    <Link href="/register">
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className="w-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
                                        >
                                            {t('register')}
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* Notice board — public, text-only announcements. Kept in normal
                    page flow so it never competes with the PWA install banner. */}
                {featured && (
                    <section id="news" className="border-b bg-[#f7f8fa] py-10 sm:py-14">
                        <div className="mx-auto max-w-6xl px-4 sm:px-6">
                            <div className="flex items-center gap-2.5">
                                <span className="flex size-9 items-center justify-center rounded-xl bg-brand-navy text-white">
                                    <Megaphone className="size-4.5" />
                                </span>
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight sm:text-xl">
                                        {t('landing.news_title')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground sm:text-sm">
                                        {t('landing.news_subtitle')}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3 sm:mt-6 sm:space-y-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveNotice(featured)}
                                    className="group flex w-full flex-col rounded-2xl border border-brand-navy/15 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md sm:p-6"
                                >
                                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
                                        {featured.pinned && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-accent-foreground">
                                                <Pin className="size-3" />
                                                {t('landing.news_pinned')}
                                            </span>
                                        )}
                                        <span>{formatDate(featured.date)}</span>
                                    </div>
                                    <h3 className="mt-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary sm:text-lg">
                                        {featured.title}
                                    </h3>
                                    <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                                        {featured.excerpt}
                                    </p>
                                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                                        {t('landing.news_read_more')}
                                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                </button>

                                {otherNotices.length > 0 && (
                                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                                        {otherNotices.map((notice) => (
                                            <button
                                                key={notice.id}
                                                type="button"
                                                onClick={() => setActiveNotice(notice)}
                                                className="group flex flex-col rounded-2xl border bg-white p-4 text-left transition-shadow hover:shadow-md sm:p-5"
                                            >
                                                <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
                                                    {notice.pinned && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-accent-foreground">
                                                            <Pin className="size-3" />
                                                            {t('landing.news_pinned')}
                                                        </span>
                                                    )}
                                                    <span>{formatDate(notice.date)}</span>
                                                </div>
                                                <h3 className="mt-1.5 font-semibold leading-snug transition-colors group-hover:text-primary">
                                                    {notice.title}
                                                </h3>
                                                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                                                    {notice.excerpt}
                                                </p>
                                                <span className="mt-auto pt-2 text-xs font-semibold text-primary">
                                                    {t('landing.news_read_more')}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* Who this portal is for */}
                <section id="audiences" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
                    <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
                        {audiences.map((a) => (
                            <div key={a.title} className="rounded-2xl border bg-white p-5 sm:p-6">
                                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                                    <a.icon className="size-5" />
                                </span>
                                <h2 className="mt-4 font-semibold">{a.title}</h2>
                                <p className="mt-1 text-sm text-muted-foreground">{a.note}</p>
                                <div className="mt-4 flex flex-wrap gap-1.5">
                                    {a.items.map((item) => (
                                        <span
                                            key={item}
                                            className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Getting started */}
                <section id="start" className="bg-[#f7f8fa] py-14 sm:py-20">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                {t('landing.start_title')}
                            </h2>
                            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                                {t('landing.start_subtitle')}
                            </p>
                        </div>

                        <div className="mt-9 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-5">
                            {steps.map((step, i) => (
                                <div key={step.title} className="rounded-2xl border bg-white p-5 sm:p-6">
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-8 items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white">
                                            {i + 1}
                                        </span>
                                        <h3 className="font-semibold">{step.title}</h3>
                                    </div>
                                    <p className="mt-3 text-sm text-muted-foreground">{step.body}</p>
                                </div>
                            ))}
                        </div>

                        {!auth.user && (
                            <div className="mt-8 text-center">
                                <Link href="/register">
                                    <Button size="lg" variant="outline" className="gap-2">
                                        <Check className="size-4" />
                                        {t('register')}
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </section>

                {/* About */}
                <section id="about" className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {t('landing.about_title')}
                    </h2>
                    <p className="mx-auto mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {t('landing.about_body')}
                    </p>
                    <p className="mt-8 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('landing.centres')}
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-3">
                        <span className="rounded-full border bg-white px-4 py-2 text-sm font-medium">
                            Taska Hikmah UTHM
                        </span>
                        <span className="rounded-full border bg-white px-4 py-2 text-sm font-medium">
                            Tadika Khalifah Junior
                        </span>
                    </div>
                </section>

                {/* CTA */}
                {!auth.user && (
                    <section className="bg-brand-navy py-14 text-white sm:py-16">
                        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                {t('landing.cta_title')}
                            </h2>
                            <p className="mx-auto mt-3 max-w-xl text-sm text-white/70 sm:text-base">
                                {t('landing.cta_body')}
                            </p>
                            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                                <Link href="/login">
                                    <Button size="lg" className="w-full gap-2 sm:w-auto">
                                        {t('login')}
                                        <ArrowRight className="size-4" />
                                    </Button>
                                </Link>
                                <Link href="/register">
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="w-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
                                    >
                                        {t('register')}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </section>
                )}

                </main>

                {/* Footer */}
                <footer className="border-t bg-white py-12 sm:py-14">
                    <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
                        <BrandLockup variant="plain" />
                        <p className="text-lg font-semibold">PPAK UTHM Connect</p>
                        <p className="max-w-xl text-sm text-muted-foreground">{t('landing.address')}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            © {new Date().getFullYear()} PPAK UTHM. All rights reserved.
                        </p>
                    </div>
                </footer>

                <Dialog
                    open={activeNotice !== null}
                    onOpenChange={(open) => !open && setActiveNotice(null)}
                >
                    <DialogContent className="max-w-2xl gap-0 p-0">
                        <DialogHeader className="border-b px-6 pb-4 pt-6">
                            <DialogTitle className="pr-8 text-left text-lg sm:text-xl">
                                {activeNotice?.title}
                            </DialogTitle>
                            <DialogDescription className="flex flex-wrap items-center gap-2 text-left">
                                {activeNotice?.pinned && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                                        <Pin className="size-3" />
                                        {t('landing.news_pinned')}
                                    </span>
                                )}
                                <span>{formatDate(activeNotice?.date)}</span>
                            </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap px-6 py-5 text-sm leading-relaxed text-muted-foreground">
                            {activeNotice?.description}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

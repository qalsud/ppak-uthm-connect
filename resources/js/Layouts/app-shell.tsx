import { Link, router, usePage } from '@inertiajs/react';
import { LifeBuoy, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';

import GlobalSearch from '@/Components/global-search';
import LanguageSwitcher from '@/Components/language-switcher';
import Logo from '@/Components/logo';
import NotificationBell from '@/Components/notification-bell';
import CentreSwitcher from '@/Components/centre-switcher';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { Button } from '@/Components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Input } from '@/Components/ui/input';
import { useI18n } from '@/lib/i18n';
import type { NavItem } from '@/lib/navigation';
import type { PageProps } from '@/types';

type Props = {
    children: ReactNode;
    nav?: NavItem[];
    bottomNav?: NavItem[];
    title?: string;
};

export default function AppShell({ children, nav = [], bottomNav = [], title }: Props) {
    const { t } = useI18n();
    const page = usePage<PageProps>();
    const user = page.props.auth.user;
    const unreadMessages = (page.props.unreadMessages as number) ?? 0;
    const activeUrl = page.url;

    const allNav = [...nav, ...bottomNav];
    const matchScore = (href: string) =>
        activeUrl === href ? href.length + 1000 : activeUrl.startsWith(`${href}/`) ? href.length : -1;
    const activeHref = allNav.reduce(
        (best, item) => (matchScore(item.href) > matchScore(best) ? item.href : best),
        '',
    );

    const activeNav = allNav.find((item) => item.href === activeHref);
    const heading = title ?? (activeNav ? t(activeNav.label) : t('dashboard'));

    const initials = (user?.name ?? 'U')
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const handleLogout = () => router.post(route('logout'));

    const isActive = (href: string) => href === activeHref;

    return (
        <div className="min-h-screen bg-background">
            <div className="flex min-h-screen">
                {nav.length > 0 && (
                    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
                        {/* Brand */}
                        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
                            <Logo chip className="size-9" />
                            <div className="leading-tight">
                                <p className="text-sm font-bold text-white">PPAK UTHM</p>
                                <p className="text-[11px] text-sidebar-foreground/70">
                                    Connect System
                                </p>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                            {nav.map((item, index) => (
                                <SidebarLink
                                    key={item.href}
                                    item={item}
                                    active={isActive(item.href)}
                                    isNew={index === 0}
                                    badge={item.label === 'messages' ? unreadMessages : 0}
                                />
                            ))}
                        </nav>

                        {/* Support + user */}
                        <div className="space-y-1 border-t border-sidebar-border px-3 py-3">
                            <a
                                href="mailto:ppak@uthm.edu.my"
                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-white"
                            >
                                <LifeBuoy className="size-4 shrink-0" />
                                Support
                            </a>
                            <p className="truncate px-3 pt-1 text-[11px] text-sidebar-foreground/50">
                                {user?.email}
                            </p>
                        </div>
                    </aside>
                )}

                <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
                    {/* Top bar */}
                    <header className="sticky top-0 z-30 border-b bg-card">
                        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
                            <div className="flex min-w-0 items-center gap-3">
                                {nav.length > 0 && (
                                    <Link href="/" className="lg:hidden">
                                        <Logo chip className="size-8" />
                                    </Link>
                                )}
                                <h1 className="truncate text-lg font-semibold text-foreground">
                                    {heading}
                                </h1>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <div className="hidden sm:block">
                                    <CentreSwitcher />
                                </div>
                                <GlobalSearch />
                                <NotificationBell />
                                {nav.length === 0 && <LanguageSwitcher />}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="gap-2 pl-1.5 pr-3">
                                            <Avatar className="size-8">
                                                <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="hidden text-sm font-medium sm:block">
                                                {user?.name}
                                            </span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <DropdownMenuLabel>
                                            <p className="text-sm font-semibold">{user?.name}</p>
                                            <p className="text-xs font-normal text-muted-foreground">
                                                {user?.email}
                                            </p>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <div className="py-1 pl-1 lg:hidden">
                                            <LanguageSwitcher />
                                        </div>
                                        <DropdownMenuItem onClick={handleLogout}>
                                            <LogOut className="size-4" />
                                            {t('logout')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {nav.length > 0 && bottomNav.length === 0 && (
                            <nav className="flex gap-2 overflow-x-auto px-4 pb-2 lg:hidden">
                                {nav.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                                            isActive(item.href)
                                                ? 'bg-sidebar text-white'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {t(item.label)}
                                    </Link>
                                ))}
                            </nav>
                        )}
                    </header>

                    <main
                        className={`flex-1 px-4 py-6 sm:px-6 lg:px-8 ${
                            bottomNav.length > 0 ? 'pb-28 lg:pb-6' : ''
                        }`}
                    >
                        {children}
                    </main>
                </div>
            </div>

            {/* Mobile bottom tab bar — floating pill */}
            {bottomNav.length > 0 && (
                <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] lg:hidden">
                    <div className="mx-auto flex max-w-md items-center gap-1 rounded-full border border-border/60 bg-card/95 p-1.5 shadow-lg shadow-black/10 backdrop-blur">
                        {bottomNav.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-2 text-[10px] font-medium transition-colors ${
                                        active
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    <span className="relative">
                                        <Icon className="size-5" />
                                        {item.label === 'messages' && unreadMessages > 0 && (
                                            <span className="absolute -right-2 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                                                {unreadMessages > 9 ? '9+' : unreadMessages}
                                            </span>
                                        )}
                                    </span>
                                    <span className="truncate">{t(item.shortLabel ?? item.label)}</span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            )}
        </div>
    );
}

function SidebarLink({
    item,
    active,
    isNew,
    badge = 0,
}: {
    item: NavItem;
    active: boolean;
    isNew?: boolean;
    badge?: number;
}) {
    const { t } = useI18n();
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'
            }`}
        >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{t(item.label)}</span>
            {badge > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                </span>
            )}
            {isNew && !active && (
                <span className="rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                    New
                </span>
            )}
        </Link>
    );
}
import { Link, router, usePage } from '@inertiajs/react';
import { LifeBuoy, LogOut, Search } from 'lucide-react';
import type { ReactNode } from 'react';

import LanguageSwitcher from '@/Components/language-switcher';
import Logo from '@/Components/logo';
import NotificationBell from '@/Components/notification-bell';
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
    title?: string;
};

export default function AppShell({ children, nav = [], title }: Props) {
    const { t } = useI18n();
    const page = usePage<PageProps>();
    const user = page.props.auth.user;
    const activeUrl = page.url;

    const activeNav = nav.find(
        (item) => activeUrl === item.href || activeUrl.startsWith(`${item.href}/`),
    );
    const heading = title ?? (activeNav ? t(activeNav.label) : t('dashboard'));

    const initials = (user?.name ?? 'U')
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const handleLogout = () => router.post(route('logout'));

    const isActive = (href: string) => activeUrl === href || activeUrl.startsWith(`${href}/`);

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
                                <div className="relative hidden md:block">
                                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input className="h-9 w-60 pl-9" placeholder="Search…" />
                                </div>
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

                        {nav.length > 0 && (
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

                    <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
                </div>
            </div>
        </div>
    );
}

function SidebarLink({
    item,
    active,
    isNew,
}: {
    item: NavItem;
    active: boolean;
    isNew?: boolean;
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
            {isNew && !active && (
                <span className="rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                    New
                </span>
            )}
        </Link>
    );
}
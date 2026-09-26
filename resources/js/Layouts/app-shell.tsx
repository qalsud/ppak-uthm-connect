import { Link, router, usePage } from '@inertiajs/react';
import { GraduationCap, LogOut, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import LanguageSwitcher from '@/Components/language-switcher';
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
import { Separator } from '@/Components/ui/separator';
import { useI18n } from '@/lib/i18n';
import type { NavItem } from '@/lib/navigation';
import type { PageProps } from '@/types';

type Props = {
    children: ReactNode;
    nav?: NavItem[];
    title?: string;
};

/**
 * Shared authenticated shell — brand header, optional role sidebar,
 * language switch and user menu.
 */
export default function AppShell({ children, nav = [], title }: Props) {
    const { t } = useI18n();
    const page = usePage<PageProps>();
    const user = page.props.auth.user;
    const activeUrl = page.url;

    const initials = (user?.name ?? 'U')
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const handleLogout = () => {
        router.post(route('logout'));
    };

    const isActive = (href: string) => {
        if (href === '/') return activeUrl === '/';

        return activeUrl === href || activeUrl.startsWith(`${href}/`);
    };

    return (
        <div className="min-h-screen bg-muted/40">
            <header className="sticky top-0 z-30 border-b bg-card">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-red to-brand-blue text-white">
                            <GraduationCap className="size-5" />
                        </span>
                        <div className="leading-tight">
                            <p className="text-sm font-bold">
                                <span className="text-brand-red-strong">PPAK</span>{' '}
                                <span className="text-brand-blue">UTHM</span>
                            </p>
                            {title && <p className="text-xs text-muted-foreground">{title}</p>}
                        </div>
                    </Link>

                    <div className="flex items-center gap-2">
                        {nav.length === 0 && <LanguageSwitcher />}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="gap-2 pl-1.5 pr-3">
                                    <Avatar className="size-8">
                                        <AvatarFallback className="bg-brand-blue/15 text-xs text-brand-blue">
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
                                <div className="py-1 pl-1">
                                    <LanguageSwitcher />
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout}>
                                    <LogOut className="size-4" />
                                    {t('logout')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
                {nav.length > 0 && (
                    <aside className="hidden w-56 shrink-0 lg:block">
                        <nav className="sticky top-24 space-y-1">
                            {nav.map((item) => (
                                <SidebarLink
                                    key={item.href}
                                    item={item}
                                    active={isActive(item.href)}
                                />
                            ))}
                        </nav>
                    </aside>
                )}

                <main className="min-w-0 flex-1">
                    {nav.length > 0 && (
                        <nav className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                            {nav.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                                        isActive(item.href)
                                            ? 'border-brand-blue bg-brand-blue text-white'
                                            : 'border-border bg-card text-muted-foreground'
                                    }`}
                                >
                                    {t(item.label)}
                                </Link>
                            ))}
                        </nav>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}

function SidebarLink({
    item,
    active,
}: {
    item: NavItem;
    active: boolean;
    icon?: LucideIcon;
}) {
    const { t } = useI18n();
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                    ? 'bg-brand-blue text-white'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
        >
            <Icon className="size-4 shrink-0" />
            {t(item.label)}
        </Link>
    );
}
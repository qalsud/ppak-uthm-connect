import { router, usePage } from '@inertiajs/react';
import { GraduationCap, LogOut } from 'lucide-react';
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
import { useI18n } from '@/lib/i18n';
import type { PageProps } from '@/types';

type Props = {
    children: ReactNode;
};

/**
 * Shared authenticated shell â€” brand header, language switch, user menu.
 * Role-specific navigation/sidebars get added to this in later phases.
 */
export default function AppShell({ children }: Props) {
    const { t } = useI18n();
    const { props } = usePage<PageProps>();
    const user = props.auth.user;

    const initials = (user?.name ?? 'U')
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const handleLogout = () => {
        router.post(route('logout'));
    };

    return (
        <div className="min-h-screen bg-muted/40">
            <header className="border-b bg-card">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
                    <div className="flex items-center gap-2">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-red to-brand-blue text-white">
                            <GraduationCap className="size-5" />
                        </span>
                        <div className="leading-tight">
                            <p className="text-sm font-bold">
                                <span className="text-brand-red-strong">PPAK</span>{' '}
                                <span className="text-brand-blue">UTHM</span>
                            </p>
                            <p className="text-xs text-muted-foreground">{t('dashboard')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="gap-2 pl-1.5 pr-3">
                                    <Avatar className="size-8">
                                        <AvatarFallback className="bg-brand-blue/15 text-brand-blue text-xs">
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
                                <DropdownMenuItem onClick={handleLogout}>
                                    <LogOut className="size-4" />
                                    {t('logout')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
        </div>
    );
}

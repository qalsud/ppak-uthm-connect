import {
    BellRing,
    BookOpen,
    CalendarCheck,
    ClipboardList,
    FileText,
    GraduationCap,
    LayoutDashboard,
    Settings,
    Users,
    Wallet,
    type LucideIcon,
} from 'lucide-react';

export type NavItem = {
    /** i18n key */
    label: string;
    href: string;
    icon: LucideIcon;
};

export const adminNav: NavItem[] = [
    { label: 'dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'registrations', href: '/admin/registrations', icon: ClipboardList },
    { label: 'teachers', href: '/admin/teachers', icon: Users },
    { label: 'students', href: '/admin/students', icon: GraduationCap },
    { label: 'payments', href: '/admin/payments', icon: Wallet },
    { label: 'memos', href: '/admin/memos', icon: FileText },
    { label: 'fee_settings', href: '/admin/fees', icon: Settings },
];

export const teacherNav: NavItem[] = [
    { label: 'dashboard', href: '/teacher', icon: LayoutDashboard },
    { label: 'daily_activities', href: '/teacher/activities', icon: CalendarCheck },
    { label: 'progress', href: '/teacher/progress', icon: BookOpen },
    { label: 'daily_updates', href: '/teacher/daily-updates', icon: BellRing },
    { label: 'memos', href: '/teacher/memos', icon: FileText },
];

export const parentNav: NavItem[] = [
    { label: 'dashboard', href: '/parent', icon: LayoutDashboard },
    { label: 'daily_update', href: '/parent/daily-update', icon: CalendarCheck },
    { label: 'activities', href: '/parent/activities', icon: BookOpen },
    { label: 'financials', href: '/parent/financials', icon: Wallet },
    { label: 'memos', href: '/parent/memos', icon: FileText },
];

/** Role-aware landing path (replaces the removed generic `dashboard` route). */
export function homePathFor(user?: { role?: string } | null): string {
    switch (user?.role) {
        case 'admin':
            return '/admin';
        case 'teacher':
            return '/teacher';
        case 'parent':
            return '/parent';
        default:
            return '/';
    }
}
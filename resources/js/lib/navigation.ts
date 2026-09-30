import {
    BellRing,
    BookOpen,
    Building2,
    CalendarCheck,
    CalendarClock,
    ClipboardList,
    CreditCard,
    Eye,
    FileText,
    GraduationCap,
    History,
    LayoutDashboard,
    ListChecks,
    MessageSquare,
    Ruler,
    Settings,
    Settings2,
    ShieldCheck,
    Trash2,
    UserRound,
    Users,
    Wallet,
    type LucideIcon,
} from 'lucide-react';

export type NavItem = {
    /** i18n key */
    label: string;
    /** Optional shorter i18n key used only in the mobile bottom bar. */
    shortLabel?: string;
    href: string;
    icon: LucideIcon;
    /** When present, this item is a collapsible group (its own href is ignored). */
    children?: NavItem[];
};

export const adminNav: NavItem[] = [
    { label: 'dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'registrations', href: '/admin/registrations', icon: ClipboardList },
    { label: 'teachers', href: '/admin/teachers', icon: Users },
    { label: 'students', href: '/admin/students', icon: GraduationCap },
    { label: 'parents', href: '/admin/parents', icon: UserRound },
    { label: 'payments', href: '/admin/payments', icon: Wallet },
    { label: 'transactions', href: '/admin/transactions', icon: CreditCard },
    // The teacher screens admins can act on, grouped so the sidebar stays short.
    {
        label: 'teacher_views',
        href: '',
        icon: Eye,
        children: [
            { label: 'attendance', href: '/admin/register/attendance', icon: CalendarClock },
            { label: 'daily_activities', href: '/admin/register/activities', icon: CalendarCheck },
            { label: 'progress', href: '/admin/register/progress', icon: BookOpen },
            { label: 'growth', href: '/admin/register/growth', icon: Ruler },
            { label: 'daily_updates', href: '/admin/register/daily-updates', icon: BellRing },
        ],
    },
    { label: 'conversations', href: '/admin/conversations', icon: MessageSquare },
    { label: 'memos', href: '/admin/memos', icon: FileText },
    { label: 'activity_log', href: '/admin/activity', icon: History },
    { label: 'recently_deleted', href: '/admin/trash', icon: Trash2 },
    { label: 'lists', href: '/admin/lists', icon: ListChecks },
    { label: 'centres', href: '/admin/centres', icon: Building2 },
    { label: 'fee_settings', href: '/admin/fees', icon: Settings },
    { label: 'settings', href: '/admin/settings', icon: Settings2 },
    { label: 'administrators', href: '/admin/administrators', icon: ShieldCheck },
];

/** Mobile bottom tab bar for admins (max 5 items). */
export const adminBottomNav: NavItem[] = [
    { label: 'dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'students', href: '/admin/students', icon: GraduationCap },
    { label: 'teachers', href: '/admin/teachers', icon: Users },
    { label: 'payments', href: '/admin/payments', icon: Wallet },
    { label: 'registrations', href: '/admin/registrations', icon: ClipboardList },
];

export const teacherNav: NavItem[] = [
    { label: 'dashboard', href: '/teacher', icon: LayoutDashboard },
    { label: 'attendance', href: '/teacher/attendance', icon: CalendarClock },
    { label: 'daily_activities', href: '/teacher/activities', icon: CalendarCheck },
    { label: 'progress', href: '/teacher/progress', icon: BookOpen },
    { label: 'growth', href: '/teacher/growth', icon: Ruler },
    { label: 'daily_updates', href: '/teacher/daily-updates', icon: BellRing },
    { label: 'messages', href: '/teacher/messages', icon: MessageSquare },
    { label: 'memos', href: '/teacher/memos', icon: FileText },
];

/** Mobile bottom tab bar for teachers (max 5 items). */
export const teacherBottomNav: NavItem[] = [
    { label: 'dashboard', href: '/teacher', icon: LayoutDashboard },
    { label: 'attendance', href: '/teacher/attendance', icon: CalendarClock },
    { label: 'daily_activities', shortLabel: 'activities', href: '/teacher/activities', icon: CalendarCheck },
    { label: 'daily_updates', shortLabel: 'updates', href: '/teacher/daily-updates', icon: BellRing },
    { label: 'messages', href: '/teacher/messages', icon: MessageSquare },
];

export const parentNav: NavItem[] = [
    { label: 'dashboard', href: '/parent', icon: LayoutDashboard },
    { label: 'attendance', href: '/parent/attendance', icon: CalendarClock },
    { label: 'daily_update', href: '/parent/daily-update', icon: CalendarCheck },
    { label: 'activities', href: '/parent/activities', icon: BookOpen },
    { label: 'financials', href: '/parent/financials', icon: Wallet },
    { label: 'messages', href: '/parent/messages', icon: MessageSquare },
    { label: 'memos', href: '/parent/memos', icon: FileText },
    { label: 'teachers', href: '/parent/teachers', icon: Users },
];

/** Mobile bottom tab bar for parents (max 5 items). */
export const parentBottomNav: NavItem[] = [
    { label: 'dashboard', href: '/parent', icon: LayoutDashboard },
    { label: 'attendance', href: '/parent/attendance', icon: CalendarClock },
    { label: 'daily_update', shortLabel: 'update', href: '/parent/daily-update', icon: CalendarCheck },
    { label: 'financials', href: '/parent/financials', icon: Wallet },
    { label: 'messages', href: '/parent/messages', icon: MessageSquare },
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
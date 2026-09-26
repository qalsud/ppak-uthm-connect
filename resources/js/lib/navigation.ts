import {
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
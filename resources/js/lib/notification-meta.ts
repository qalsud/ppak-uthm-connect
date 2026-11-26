import {
    Bell,
    CalendarX2,
    CreditCard,
    Megaphone,
    MessageCircle,
    Pill,
    Sparkles,
    TrendingUp,
    UserCheck,
    UserCog,
    UserPlus,
    Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NotificationCategoryMeta = {
    icon: LucideIcon;
    className: string;
    labelKey: string;
};

const META: Record<string, NotificationCategoryMeta> = {
    attendance: {
        icon: UserCheck,
        className: 'bg-sky-100 text-sky-700',
        labelKey: 'notification.category.attendance',
    },
    absence: {
        icon: CalendarX2,
        className: 'bg-amber-100 text-amber-700',
        labelKey: 'notification.category.absence',
    },
    medication: {
        icon: Pill,
        className: 'bg-rose-100 text-rose-700',
        labelKey: 'notification.category.medication',
    },
    progress: {
        icon: TrendingUp,
        className: 'bg-emerald-100 text-emerald-700',
        labelKey: 'notification.category.progress',
    },
    activities: {
        icon: Sparkles,
        className: 'bg-violet-100 text-violet-700',
        labelKey: 'notification.category.activities',
    },
    fees: {
        icon: Wallet,
        className: 'bg-orange-100 text-orange-700',
        labelKey: 'notification.category.fees',
    },
    payments: {
        icon: CreditCard,
        className: 'bg-teal-100 text-teal-700',
        labelKey: 'notification.category.payments',
    },
    messages: {
        icon: MessageCircle,
        className: 'bg-blue-100 text-blue-700',
        labelKey: 'notification.category.messages',
    },
    memos: {
        icon: Megaphone,
        className: 'bg-indigo-100 text-indigo-700',
        labelKey: 'notification.category.memos',
    },
    account: {
        icon: UserCog,
        className: 'bg-slate-200 text-slate-700',
        labelKey: 'notification.category.account',
    },
    registration: {
        icon: UserPlus,
        className: 'bg-fuchsia-100 text-fuchsia-700',
        labelKey: 'notification.category.registration',
    },
    system: {
        icon: Bell,
        className: 'bg-muted text-muted-foreground',
        labelKey: 'notification.category.system',
    },
};

export function categoryMeta(category?: string | null): NotificationCategoryMeta {
    return (category && META[category]) || META.system;
}

export const NOTIFICATION_CATEGORIES = Object.keys(META);

/** Types shared by the bell feed and the notification centre page. */
export type NotificationItem = {
    id: string;
    read_at: string | null;
    created_at: string;
    data: {
        title?: string;
        body?: string;
        url?: string;
        category?: string;
        priority?: 'high' | 'normal' | 'low';
        student_id?: number | null;
    };
};

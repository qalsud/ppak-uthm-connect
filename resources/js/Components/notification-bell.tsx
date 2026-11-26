import { router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { Bell, CheckCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/Components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Separator } from '@/Components/ui/separator';
import { formatDateTime } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { categoryMeta, type NotificationItem } from '@/lib/notification-meta';
import { cn } from '@/lib/utils';
import type { PageProps } from '@/types';

/**
 * In-app notification bell. Polls the compact feed and refreshes instantly
 * when Reverb delivers a broadcast notification.
 */
export default function NotificationBell() {
    const { t } = useI18n();
    const userId = usePage<PageProps>().props.auth.user.id;
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [count, setCount] = useState(0);

    const load = useCallback(async () => {
        try {
            const { data } = await window.axios.get('/notifications/feed');
            setCount(data.count ?? 0);
            setItems(data.data ?? []);
        } catch {
            // ignore transient errors
        }
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, 15000);

        return () => clearInterval(interval);
    }, [load]);

    // Laravel broadcasts every database notification on the user's private
    // channel. The poll above remains as a safety net when Reverb is offline.
    useEcho(`App.Models.User.${userId}`, '.notification', () => load(), [userId, load]);

    const open = async (item: NotificationItem) => {
        if (!item.read_at) {
            try {
                const { data } = await window.axios.post(`/notifications/${item.id}/read`);
                setCount(data.count ?? 0);
                setItems((current) =>
                    current.map((entry) =>
                        entry.id === item.id ? { ...entry, read_at: data.read_at } : entry,
                    ),
                );
            } catch {
                // ignore; the link is still useful
            }
        }

        if (item.data.url) {
            router.visit(item.data.url);
        }
    };

    const markAllRead = async () => {
        try {
            await window.axios.post('/notifications/read-all');
            setCount(0);
            setItems((current) =>
                current.map((entry) => ({
                    ...entry,
                    read_at: entry.read_at ?? new Date().toISOString(),
                })),
            );
        } catch {
            // ignore
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label={t('notifications')}>
                    <Bell className="size-5" aria-hidden="true" />
                    {count > 0 && (
                        <span
                            aria-hidden="true"
                            className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
                        >
                            {count > 9 ? '9+' : count}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={8}
                collisionPadding={8}
                className="flex max-h-[var(--radix-dropdown-menu-content-available-height)] w-80 max-w-[calc(100vw-1rem)] flex-col overflow-hidden p-0"
            >
                <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
                    <p className="text-sm font-semibold">{t('notifications')}</p>
                    {count > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={markAllRead}
                        >
                            <CheckCheck className="size-3" aria-hidden="true" />
                            {t('mark_all_read')}
                        </Button>
                    )}
                </div>
                <Separator className="shrink-0" />
                {items.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                        {t('no_notifications')}
                    </p>
                ) : (
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {items.map((item) => {
                            const meta = categoryMeta(item.data.category);
                            const Icon = meta.icon;

                            return (
                                <DropdownMenuItem
                                    key={item.id}
                                    onClick={() => open(item)}
                                    className="cursor-pointer items-start gap-2.5 px-3 py-2.5"
                                >
                                    <span
                                        className={cn(
                                            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg',
                                            meta.className,
                                        )}
                                    >
                                        <Icon className="size-3.5" aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-start gap-2">
                                            <span className="min-w-0 flex-1 break-words text-sm font-medium">
                                                {item.data.title}
                                            </span>
                                            {!item.read_at && (
                                                <span
                                                    aria-hidden="true"
                                                    className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-blue"
                                                />
                                            )}
                                        </span>
                                        <span className="mt-0.5 line-clamp-2 block break-words text-xs text-muted-foreground">
                                            {item.data.body}
                                        </span>
                                        <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
                                            {formatDateTime(item.created_at)}
                                        </span>
                                    </span>
                                </DropdownMenuItem>
                            );
                        })}
                    </div>
                )}
                <Separator className="shrink-0" />
                <button
                    type="button"
                    onClick={() => router.visit('/notifications')}
                    className="shrink-0 px-3 py-2.5 text-center text-xs font-semibold text-primary transition-colors hover:bg-muted"
                >
                    {t('view_all_notifications')}
                </button>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

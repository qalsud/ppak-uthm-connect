import { router, usePage } from '@inertiajs/react';
import { Check, CheckCheck, Inbox, Trash2, Undo2 } from 'lucide-react';
import { useState } from 'react';

import EmptyState from '@/Components/empty-state';
import FilterTabs from '@/Components/filter-tabs';
import PageHeader from '@/Components/page-header';
import Pagination from '@/Components/pagination';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { formatDateTime } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { categoryMeta, NOTIFICATION_CATEGORIES, type NotificationItem } from '@/lib/notification-meta';
import {
    adminBottomNav,
    adminNav,
    parentBottomNav,
    parentNav,
    teacherBottomNav,
    teacherNav,
} from '@/lib/navigation';
import { cn } from '@/lib/utils';
import AppShell from '@/Layouts/app-shell';
import type { PageProps, Paginator } from '@/types';

type Props = PageProps<{
    notifications: Paginator<NotificationItem>;
    filters: { category: string | null; unread: boolean };
    categories: Array<{ value: string; unread: number }>;
    unreadCount: number;
}>;

const ALL = 'all';

export default function Notifications({ notifications, filters, categories, unreadCount }: Props) {
    const { t } = useI18n();
    const { auth } = usePage<PageProps>().props;
    const role = auth.user.role;
    const [busy, setBusy] = useState<string | null>(null);

    const nav = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : parentNav;
    const bottomNav =
        role === 'admin' ? adminBottomNav : role === 'teacher' ? teacherBottomNav : parentBottomNav;

    const category = filters.category ?? ALL;
    const unreadOnly = filters.unread;

    const refresh = () =>
        router.reload({
            only: ['notifications', 'categories', 'unreadCount', 'filters'],
        });

    const applyFilters = (next: { category?: string; unread?: boolean }) => {
        const params: Record<string, string> = {};

        const nextCategory = next.category ?? category;
        const nextUnread = next.unread ?? unreadOnly;

        if (nextCategory !== ALL) {
            params.category = nextCategory;
        }

        if (nextUnread) {
            params.unread = '1';
        }

        router.get('/notifications', params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const markRead = async (item: NotificationItem, read: boolean) => {
        setBusy(item.id);

        try {
            await window.axios.post(
                `/notifications/${item.id}/${read ? 'read' : 'unread'}`,
            );
            refresh();
        } catch {
            // ignore
        } finally {
            setBusy(null);
        }
    };

    const remove = async (item: NotificationItem) => {
        setBusy(item.id);

        try {
            await window.axios.delete(`/notifications/${item.id}`);
            refresh();
        } catch {
            // ignore
        } finally {
            setBusy(null);
        }
    };

    const markAll = async () => {
        setBusy('all');

        try {
            await window.axios.post('/notifications/read-all');
            refresh();
        } catch {
            // ignore
        } finally {
            setBusy(null);
        }
    };

    const open = async (item: NotificationItem) => {
        if (!item.read_at) {
            try {
                await window.axios.post(`/notifications/${item.id}/read`);
            } catch {
                // ignore
            }
        }

        if (item.data.url) {
            router.visit(item.data.url);
        } else {
            refresh();
        }
    };

    return (
        <AppShell nav={nav} bottomNav={bottomNav} title={t('notifications')}>
            <PageHeader title={t('notifications')} description={t('notifications_desc')}>
                {unreadCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={busy === 'all'}
                        onClick={markAll}
                    >
                        <CheckCheck className="size-4" />
                        {t('mark_all_read')}
                    </Button>
                )}
            </PageHeader>

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <FilterTabs
                    className="mb-0"
                    value={unreadOnly ? 'unread' : 'all'}
                    onChange={(value) => applyFilters({ unread: value === 'unread' })}
                    tabs={[
                        { value: 'all', label: t('notification.all') },
                        {
                            value: 'unread',
                            label: t('notification.unread'),
                            count: unreadCount,
                        },
                    ]}
                />

                <Select value={category} onValueChange={(value) => applyFilters({ category: value })}>
                    <SelectTrigger className="h-10 w-full sm:w-56" aria-label={t('notification.category_filter')}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>{t('notification.all_categories')}</SelectItem>
                        {NOTIFICATION_CATEGORIES.map((value) => {
                            const meta = categoryMeta(value);
                            const unread = categories.find((entry) => entry.value === value)?.unread ?? 0;

                            return (
                                <SelectItem key={value} value={value}>
                                    <span className="flex items-center gap-2">
                                        {t(meta.labelKey)}
                                        {unread > 0 && (
                                            <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                                                {unread}
                                            </span>
                                        )}
                                    </span>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            {notifications.data.length === 0 ? (
                <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                    <EmptyState
                        icon={Inbox}
                        title={t('notification.empty_title')}
                        description={t('notification.empty_desc')}
                    />
                </Card>
            ) : (
                <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                    <ul className="divide-y">
                        {notifications.data.map((item) => {
                            const meta = categoryMeta(item.data.category);
                            const Icon = meta.icon;
                            const unread = !item.read_at;

                            return (
                                <li key={item.id}>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => open(item)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                open(item);
                                            }
                                        }}
                                        className={cn(
                                            'flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none',
                                            unread && 'bg-primary/[0.04]',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl',
                                                meta.className,
                                            )}
                                        >
                                            <Icon className="size-4.5" aria-hidden="true" />
                                        </span>

                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-start gap-2">
                                                <span className="min-w-0 flex-1 text-sm font-semibold leading-snug">
                                                    {item.data.title}
                                                </span>
                                                {unread && (
                                                    <span
                                                        aria-label={t('notification.unread')}
                                                        className="mt-1 size-2 shrink-0 rounded-full bg-brand-blue"
                                                    />
                                                )}
                                            </span>
                                            <span className="mt-0.5 block whitespace-pre-wrap break-words text-sm text-muted-foreground">
                                                {item.data.body}
                                            </span>
                                            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground/80">
                                                <span
                                                    className={cn(
                                                        'rounded-full px-2 py-0.5 font-medium',
                                                        meta.className,
                                                    )}
                                                >
                                                    {t(meta.labelKey)}
                                                </span>
                                                <span>{formatDateTime(item.created_at)}</span>
                                            </span>
                                        </span>

                                        <span className="flex shrink-0 flex-col gap-1 sm:flex-row">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8"
                                                disabled={busy === item.id}
                                                aria-label={
                                                    unread
                                                        ? t('notification.mark_read')
                                                        : t('notification.mark_unread')
                                                }
                                                title={
                                                    unread
                                                        ? t('notification.mark_read')
                                                        : t('notification.mark_unread')
                                                }
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    markRead(item, unread);
                                                }}
                                            >
                                                {unread ? (
                                                    <Check className="size-4" />
                                                ) : (
                                                    <Undo2 className="size-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8 text-muted-foreground hover:text-destructive"
                                                disabled={busy === item.id}
                                                aria-label={t('delete')}
                                                title={t('delete')}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    remove(item);
                                                }}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    <Pagination
                        links={notifications.links}
                        from={notifications.from}
                        to={notifications.to}
                        total={notifications.total}
                    />
                </Card>
            )}
        </AppShell>
    );
}

import { router, usePage } from '@inertiajs/react';
import { RotateCcw, Trash2 } from 'lucide-react';

import EmptyState from '@/Components/empty-state';
import PageHeader from '@/Components/page-header';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useI18n } from '@/lib/i18n';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import type { PageProps } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Item = {
    id: number;
    deleted_at: string | null;
    summary: string;
};

type Group = {
    type: string;
    label: string;
    count: number;
    items: Item[];
};

type Page = PageProps<{
    groups: Group[];
    total: number;
}>;

export default function AdminTrash() {
    const { t } = useI18n();
    const { props } = usePage<Page>();
    const { groups, total } = props;

    const restore = (type: string, id: number) =>
        router.post(route('admin.trash.restore', { type, id }), {}, { preserveScroll: true });

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('recently_deleted')} description={t('recently_deleted_desc')} />

            {total === 0 ? (
                <Card className="rounded-2xl border-0 shadow-sm">
                    <CardContent className="py-10">
                        <EmptyState
                            icon={Trash2}
                            title={t('nothing_deleted')}
                            description={t('nothing_deleted_desc')}
                        />
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {groups.map((group) => (
                        <Card key={group.type} className="rounded-2xl border-0 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    {t(`trash.${group.type}`, group.label)}
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                        {group.count}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1.5">
                                {group.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{item.summary}</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {t('deleted_on')}: {item.deleted_at}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 gap-1.5 rounded-lg text-xs"
                                            onClick={() => restore(group.type, item.id)}
                                        >
                                            <RotateCcw className="size-3.5" />
                                            {t('restore')}
                                        </Button>
                                    </div>
                                ))}

                                {group.count > group.items.length && (
                                    <p className="pt-1 text-[11px] text-muted-foreground">
                                        {t('showing_first')} {group.items.length} / {group.count}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </AppShell>
    );
}

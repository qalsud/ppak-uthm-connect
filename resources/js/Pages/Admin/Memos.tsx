import { router, useForm } from '@inertiajs/react';
import { ChevronDown, FileText, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import ConfirmDialog from '@/Components/confirm-dialog';
import EmptyState from '@/Components/empty-state';
import PageHeader from '@/Components/page-header';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { formatDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Memo = {
    id: number;
    title: string;
    description: string;
    created_at: string;
    author: { id: number; name: string } | null;
};

export default function Memos({ memos }: { memos: Memo[] }) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState<number[]>([]);
    const [deleteTarget, setDeleteTarget] = useState<Memo | null>(null);

    const form = useForm({ title: '', description: '' });

    const submit = () =>
        form.post(route('admin.memos.store'), {
            onSuccess: () => {
                setOpen(false);
                form.reset();
            },
        });

    const confirmRemove = () => {
        if (!deleteTarget) {
            return;
        }

        router.delete(route('admin.memos.destroy', { memo: deleteTarget.id }), {
            preserveScroll: true,
            onFinish: () => setDeleteTarget(null),
        });
    };

    const toggle = (id: number) =>
        setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('memos')} description={t('announcements_desc')}>
                <Button onClick={() => setOpen(true)} className="gap-1.5">
                    <Plus className="size-4" />
                    {t('add')} {t('memo')}
                </Button>
            </PageHeader>

            {memos.length === 0 ? (
                <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                    <EmptyState
                        icon={FileText}
                        title={t('memos_empty_title')}
                        description={t('memos_empty_desc')}
                    />
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {memos.map((memo) => {
                        const isExpanded = expanded.includes(memo.id);

                        return (
                            <Card key={memo.id} className="rounded-2xl border-0 shadow-sm">
                                <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
                                    <div>
                                        <CardTitle className="text-base">{memo.title}</CardTitle>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {memo.author?.name} · {formatDate(memo.created_at)}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive"
                                        onClick={() => setDeleteTarget(memo)}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <p
                                        className={`whitespace-pre-wrap text-sm text-muted-foreground ${
                                            isExpanded ? '' : 'line-clamp-4'
                                        }`}
                                    >
                                        {memo.description}
                                    </p>
                                    {memo.description.length > 180 && (
                                        <button
                                            type="button"
                                            onClick={() => toggle(memo.id)}
                                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary"
                                        >
                                            <ChevronDown
                                                className={`size-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            />
                                            {isExpanded ? t('view_less') : t('view_more')}
                                        </button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t('add')} {t('memo')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>{t('title')}</Label>
                            <Input
                                value={form.data.title}
                                onChange={(e) => form.setData('title', e.target.value)}
                            />
                            {form.errors.title && (
                                <p className="text-xs text-destructive">{form.errors.title}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label>{t('description')}</Label>
                            <Textarea
                                rows={6}
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                            />
                            {form.errors.description && (
                                <p className="text-xs text-destructive">{form.errors.description}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            {t('cancel')}
                        </Button>
                        <Button onClick={submit} disabled={form.processing}>
                            {t('create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(v) => !v && setDeleteTarget(null)}
                title={`${t('delete')}: ${deleteTarget?.title ?? ''}?`}
                description={t('cannot_be_undone')}
                confirmLabel={t('delete')}
                onConfirm={confirmRemove}
            />
        </AppShell>
    );
}

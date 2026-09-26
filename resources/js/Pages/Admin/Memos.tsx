import { router, useForm } from '@inertiajs/react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

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
import { useI18n } from '@/lib/i18n';
import { adminNav } from '@/lib/navigation';
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

    const form = useForm({ title: '', description: '' });

    const submit = () =>
        form.post(route('admin.memos.store'), {
            onSuccess: () => {
                setOpen(false);
                form.reset();
            },
        });

    const remove = (memo: Memo) => {
        if (confirm(`${t('delete')}: ${memo.title}?`)) {
            router.delete(route('admin.memos.destroy', { memo: memo.id }), { preserveScroll: true });
        }
    };

    return (
        <AppShell nav={adminNav} title={t('admin')}>
            <PageHeader title={t('memos')} description="Publish announcements to parents & teachers">
                <Button onClick={() => setOpen(true)} className="gap-1.5">
                    <Plus className="size-4" />
                    {t('add')} {t('memo')}
                </Button>
            </PageHeader>

            {memos.length === 0 ? (
                <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                    <EmptyState
                        icon={FileText}
                        title="No memos yet"
                        description="Publish your first announcement for parents and teachers."
                    />
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {memos.map((memo) => (
                        <Card key={memo.id} className="rounded-2xl border-0 shadow-sm">
                            <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
                                <div>
                                    <CardTitle className="text-base">{memo.title}</CardTitle>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {memo.author?.name} ·{' '}
                                        {new Date(memo.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive"
                                    onClick={() => remove(memo)}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
                                    {memo.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('add')} {t('memo')}</DialogTitle>
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
                                <p className="text-xs text-destructive">
                                    {form.errors.description}
                                </p>
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
        </AppShell>
    );
}
import { router, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Separator } from '@/Components/ui/separator';
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

    const submit = () => {
        form.post(route('admin.memos.store'), {
            onSuccess: () => {
                setOpen(false);
                form.reset();
            },
        });
    };

    const remove = (memo: Memo) => {
        if (confirm(`${t('delete')}: ${memo.title}?`)) {
            router.delete(route('admin.memos.destroy', { memo: memo.id }), {
                preserveScroll: true,
            });
        }
    };

    return (
        <AppShell nav={adminNav} title={t('admin')}>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('memos')}</h1>
                <Button onClick={() => setOpen(true)} className="gap-1">
                    <Plus className="size-4" />
                    {t('add')}
                </Button>
            </div>

            <div className="space-y-4">
                {memos.length === 0 ? (
                    <Card>
                        <CardContent className="py-10 text-center text-muted-foreground">
                            {t('no_data')}
                        </CardContent>
                    </Card>
                ) : (
                    memos.map((memo) => (
                        <Card key={memo.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <CardTitle>{memo.title}</CardTitle>
                                        <CardDescription>
                                            {memo.author?.name} ·{' '}
                                            {new Date(memo.created_at).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive"
                                        onClick={() => remove(memo)}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap text-sm">{memo.description}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('memos')}</DialogTitle>
                    </DialogHeader>
                    <Separator />
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label htmlFor="mtitle">{t('title')}</Label>
                            <Input
                                id="mtitle"
                                value={form.data.title}
                                onChange={(e) => form.setData('title', e.target.value)}
                            />
                            {form.errors.title && (
                                <p className="text-xs text-destructive">{form.errors.title}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="mdesc">{t('description')}</Label>
                            <Textarea
                                id="mdesc"
                                rows={5}
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
        </AppShell>
    );
}
import { router, useForm } from '@inertiajs/react';
import { ChevronDown, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import ConfirmDialog from '@/Components/confirm-dialog';
import EmptyState from '@/Components/empty-state';
import FormDialog from '@/Components/form-dialog';
import PageHeader from '@/Components/page-header';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { FormField } from '@/Components/ui/form-field';
import { Input } from '@/Components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import { formatDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Memo = {
    id: number;
    title: string;
    description: string;
    audience: 'all' | 'parents' | 'teachers' | 'class';
    class: string | null;
    created_at: string;
    author: { id: number; name: string } | null;
};

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : c === '6bintang' ? '6 Bintang' : c);

export default function Memos({ memos, classes }: { memos: Memo[]; classes: string[] }) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Memo | null>(null);
    const [expanded, setExpanded] = useState<number[]>([]);
    const [deleteTarget, setDeleteTarget] = useState<Memo | null>(null);

    const form = useForm({ title: '', description: '', audience: 'all', class: '' });

    const audienceLabel = (memo: Memo) =>
        memo.audience === 'class'
            ? classLabel(memo.class ?? '')
            : memo.audience === 'parents'
              ? t('parents')
              : memo.audience === 'teachers'
                ? t('teachers')
                : t('audience_all');

    const openCreate = () => {
        setEditing(null);
        form.setData({ title: '', description: '', audience: 'all', class: '' });
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (memo: Memo) => {
        setEditing(memo);
        form.setData({
            title: memo.title,
            description: memo.description,
            audience: memo.audience,
            class: memo.class ?? '',
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit = () => {
        if (editing) {
            form.put(route('admin.memos.update', { memo: editing.id }), {
                onSuccess: () => setOpen(false),
            });
        } else {
            form.post(route('admin.memos.store'), { onSuccess: () => setOpen(false) });
        }
    };

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
                <Button onClick={openCreate} className="gap-1.5">
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
                                    <div className="min-w-0">
                                        <CardTitle className="text-base">{memo.title}</CardTitle>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {memo.author?.name} · {formatDate(memo.created_at)}
                                        </p>
                                        <Badge variant="secondary" className="mt-1.5">
                                            {audienceLabel(memo)}
                                        </Badge>
                                    </div>
                                    <div className="flex shrink-0">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => openEdit(memo)}
                                        >
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive"
                                            onClick={() => setDeleteTarget(memo)}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
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

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? `${t('edit')} ${t('memo')}` : `${t('add')} ${t('memo')}`}
                onSubmit={submit}
                submitLabel={editing ? t('save') : t('create')}
                processing={form.processing}
            >
                <FormField label={t('title')} error={form.errors.title}>
                    <Input
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                    />
                </FormField>

                <FormField label={t('audience')}>
                    <Select value={form.data.audience} onValueChange={(v) => form.setData('audience', v)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('audience_all')}</SelectItem>
                            <SelectItem value="parents">{t('parents')}</SelectItem>
                            <SelectItem value="teachers">{t('teachers')}</SelectItem>
                            <SelectItem value="class">{t('audience_class')}</SelectItem>
                        </SelectContent>
                    </Select>
                </FormField>

                {form.data.audience === 'class' && (
                    <FormField label={t('class')} error={form.errors.class}>
                        <Select value={form.data.class} onValueChange={(v) => form.setData('class', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('class')} />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {classLabel(c)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                )}

                <FormField label={t('description')} error={form.errors.description}>
                    <Textarea
                        rows={6}
                        value={form.data.description}
                        onChange={(e) => form.setData('description', e.target.value)}
                    />
                </FormField>
            </FormDialog>

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

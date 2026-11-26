import { router, useForm } from '@inertiajs/react';
import { ChevronDown, Clock, FileText, Globe2, Pencil, Pin, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import ConfirmDialog from '@/Components/confirm-dialog';
import EmptyState from '@/Components/empty-state';
import FormDialog from '@/Components/form-dialog';
import IconButton from '@/Components/icon-button';
import MemoPhotos from '@/Components/memo-photos';
import PageHeader from '@/Components/page-header';
import PhotoPicker from '@/Components/photo-picker';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { FormCheckbox, FormField, FormGrid } from '@/Components/ui/form-field';
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
import { useClassLabel as useClassLabelHook } from '@/lib/lists';
import { useList } from '@/lib/lists';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import type { PhotoInfo } from '@/lib/photo';
import AppShell from '@/Layouts/app-shell';

type Memo = {
    id: number;
    title: string;
    description: string;
    audience: 'all' | 'parents' | 'teachers' | 'class';
    class: string | null;
    centre_id: number | null;
    centre: { id: number; name: string; short_name: string | null } | null;
    created_at: string;
    author: { id: number; name: string } | null;
    photos: PhotoInfo[];
    is_public: boolean;
    publish_at: string | null;
    expires_at: string | null;
    is_pinned: boolean;
    notify_users: boolean;
};

const MAX_PHOTOS = 3;


export default function Memos({
    memos,
    classes,
}: {
    memos: Memo[];
    classes: string[];
}) {
    const { t } = useI18n();
    const classLabel = useClassLabelHook();
    const audienceOptions = useList('memo_audience');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Memo | null>(null);
    const [expanded, setExpanded] = useState<number[]>([]);
    const [deleteTarget, setDeleteTarget] = useState<Memo | null>(null);

    const form = useForm({
        title: '',
        description: '',
        audience: 'all',
        class: '',
        centre_id: '',
        is_public: false,
        publish_at: '',
        expires_at: '',
        is_pinned: false,
        notify_users: true,
        attachments: [] as File[],
        remove_attachments: [] as number[],
    });

    const audienceLabel = (memo: Memo) => {
        const base =
            memo.audience === 'class'
                ? classLabel(memo.class ?? '')
                : memo.audience === 'parents'
                  ? t('parents')
                  : memo.audience === 'teachers'
                    ? t('teachers')
                    : t('audience_all');

        // Show which centre a memo belongs to, since class names repeat.
        return memo.centre ? `${memo.centre.name} · ${base}` : base;
    };

    /** Public-visibility state: scheduled, live, or expired. */
    const publicStatus = (memo: Memo): 'scheduled' | 'live' | 'expired' | null => {
        if (!memo.is_public) {
            return null;
        }

        const now = Date.now();

        if (memo.publish_at && new Date(memo.publish_at).getTime() > now) {
            return 'scheduled';
        }

        if (memo.expires_at && new Date(memo.expires_at).getTime() <= now) {
            return 'expired';
        }

        return 'live';
    };

    const openCreate = () => {
        setEditing(null);
        form.setData({
            title: '',
            description: '',
            audience: 'all',
            class: '',
            centre_id: '',
            is_public: false,
            publish_at: '',
            expires_at: '',
            is_pinned: false,
            notify_users: true,
            attachments: [],
            remove_attachments: [],
        });
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
            centre_id: memo.centre_id ? String(memo.centre_id) : '',
            is_public: memo.is_public,
            publish_at: memo.publish_at ? memo.publish_at.slice(0, 16) : '',
            expires_at: memo.expires_at ? memo.expires_at.slice(0, 16) : '',
            is_pinned: memo.is_pinned,
            notify_users: memo.notify_users,
            attachments: [],
            remove_attachments: [],
        });
        form.clearErrors();
        setOpen(true);
    };

    const toggleExistingPhoto = (id: number) =>
        form.setData(
            'remove_attachments',
            form.data.remove_attachments.includes(id)
                ? form.data.remove_attachments.filter((x) => x !== id)
                : [...form.data.remove_attachments, id],
        );

    const submit = () => {
        const options = { forceFormData: true, onSuccess: () => setOpen(false) };

        if (editing) {
            form.put(route('admin.memos.update', { memo: editing.id }), options);
        } else {
            form.post(route('admin.memos.store'), options);
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
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            <Badge variant="secondary">{audienceLabel(memo)}</Badge>
                                            {memo.is_public && (
                                                <Badge variant="outline" className="gap-1">
                                                    <Globe2 className="size-3" />
                                                    {t('memo_public_badge')}
                                                </Badge>
                                            )}
                                            {memo.is_pinned && (
                                                <Badge variant="outline" className="gap-1">
                                                    <Pin className="size-3" />
                                                    {t('memo_pinned_badge')}
                                                </Badge>
                                            )}
                                            {publicStatus(memo) === 'scheduled' && (
                                                <Badge variant="outline" className="gap-1">
                                                    <Clock className="size-3" />
                                                    {t('memo_scheduled')}
                                                </Badge>
                                            )}
                                            {publicStatus(memo) === 'expired' && (
                                                <Badge variant="outline" className="gap-1 text-muted-foreground">
                                                    <Clock className="size-3" />
                                                    {t('memo_expired')}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0">
                                        <IconButton label={t('edit')} onClick={() => openEdit(memo)}>
                                            <Pencil className="size-4" />
                                        </IconButton>
                                        <IconButton
                                            destructive
                                            label={t('delete')}
                                            onClick={() => setDeleteTarget(memo)}
                                        >
                                            <Trash2 className="size-4" />
                                        </IconButton>
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
                                    <MemoPhotos photos={memo.photos} />
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

                <FormCheckbox
                    label={t('memo_public')}
                    description={t('memo_public_hint')}
                    checked={form.data.is_public}
                    onChange={(checked) => {
                        form.setData({
                            ...form.data,
                            is_public: checked,
                            audience: checked ? 'all' : form.data.audience,
                            class: checked ? '' : form.data.class,
                            attachments: checked ? [] : form.data.attachments,
                            // A public notice is text-only: clear existing
                            // photos in the same save so the update is valid.
                            remove_attachments: checked
                                ? (editing?.photos ?? []).map((photo) => photo.id)
                                : [],
                        });
                    }}
                />

                {form.data.is_public ? (
                    <>
                        <FormField label={t('description')} error={form.errors.description}>
                            <Textarea
                                rows={6}
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                            />
                        </FormField>

                        <FormGrid>
                            <FormField
                                label={t('memo_publish_at')}
                                hint={t('memo_publish_at_hint')}
                                error={form.errors.publish_at}
                            >
                                <Input
                                    type="datetime-local"
                                    value={form.data.publish_at}
                                    onChange={(e) => form.setData('publish_at', e.target.value)}
                                />
                            </FormField>
                            <FormField
                                label={t('memo_expires_at')}
                                hint={t('memo_expires_at_hint')}
                                error={form.errors.expires_at}
                            >
                                <Input
                                    type="datetime-local"
                                    value={form.data.expires_at}
                                    onChange={(e) => form.setData('expires_at', e.target.value)}
                                />
                            </FormField>
                        </FormGrid>

                        <FormCheckbox
                            label={t('memo_pinned')}
                            description={t('memo_pinned_hint')}
                            checked={form.data.is_pinned}
                            onChange={(checked) => form.setData('is_pinned', checked)}
                        />

                        <FormCheckbox
                            label={t('memo_notify_users')}
                            description={t('memo_notify_users_hint')}
                            checked={form.data.notify_users}
                            onChange={(checked) => form.setData('notify_users', checked)}
                        />

                        <p className="rounded-xl bg-muted p-3 text-[11px] text-muted-foreground">
                            {t('memo_public_text_only_note')}
                            {editing && editing.photos.length > 0 && (
                                <span className="mt-1 block font-medium text-amber-700">
                                    {t('memo_public_photos_removed')}
                                </span>
                            )}
                        </p>
                    </>
                ) : (
                    <>
                        <FormField label={t('audience')}>
                            <Select
                                value={form.data.audience}
                                onValueChange={(v) => form.setData('audience', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {audienceOptions.map((a) => (
                                        <SelectItem key={a.value} value={a.value}>
                                            {a.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>

                        {form.data.audience === 'class' && (
                            <FormField label={t('class')} error={form.errors.class}>
                                <Select
                                    value={form.data.class}
                                    onValueChange={(v) => form.setData('class', v)}
                                >
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

                        <FormField label={t('photos')} error={form.errors.attachments}>
                            <PhotoPicker
                                files={form.data.attachments}
                                onChange={(files) => form.setData('attachments', files)}
                                existing={editing?.photos ?? []}
                                removed={form.data.remove_attachments}
                                onToggleExisting={toggleExistingPhoto}
                                max={MAX_PHOTOS}
                            />
                        </FormField>

                        <FormCheckbox
                            label={t('memo_notify_users')}
                            description={t('memo_notify_users_hint')}
                            checked={form.data.notify_users}
                            onChange={(checked) => form.setData('notify_users', checked)}
                        />
                    </>
                )}
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

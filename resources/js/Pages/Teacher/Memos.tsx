import { useForm } from '@inertiajs/react';
import { Info, Plus } from 'lucide-react';
import { useState } from 'react';

import FormDialog from '@/Components/form-dialog';
import MemoList from '@/Components/memo-list';
import PageHeader from '@/Components/page-header';
import PhotoPicker from '@/Components/photo-picker';
import { Button } from '@/Components/ui/button';
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
import { useI18n } from '@/lib/i18n';
import { useClassLabel } from '@/lib/lists';
import { teacherBottomNav, teacherNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Memo = {
    id: number;
    title: string;
    description: string;
    created_at: string;
    author: { name: string } | null;
};

type Centre = { id: number; name: string };

export default function TeacherMemos({
    memos,
    canPublish,
    assignedClass,
    centres,
}: {
    memos: Memo[];
    canPublish: boolean;
    assignedClass: string | null;
    centres: Centre[];
}) {
    const { t } = useI18n();
    const classLabel = useClassLabel();
    const [open, setOpen] = useState(false);

    const form = useForm({
        title: '',
        description: '',
        centre_id: centres.length === 1 ? String(centres[0].id) : '',
        attachments: [] as File[],
    });

    const submit = () => {
        form.post(route('teacher.memos.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
            },
        });
    };

    return (
        <AppShell nav={teacherNav} bottomNav={teacherBottomNav} title={t('teacher')}>
            <PageHeader title={t('memos')} description={t('teacher_memos_desc')}>
                {canPublish && (
                    <Button onClick={() => setOpen(true)} className="gap-1.5">
                        <Plus className="size-4" />
                        {t('publish_memo')}
                    </Button>
                )}
            </PageHeader>

            {!canPublish && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>{t('no_class_cannot_publish')}</p>
                </div>
            )}

            <MemoList memos={memos} emptyLabel={t('no_data')} />

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={t('publish_memo')}
                description={t('publish_memo_desc')}
                onSubmit={submit}
                submitLabel={t('publish')}
                processing={form.processing}
            >
                <div className="rounded-xl border bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{t('memo_class_scope')}: </span>
                    <span className="font-medium">{classLabel(assignedClass ?? '')}</span>
                </div>

                {centres.length > 1 && (
                    <FormField label={t('centre')} error={form.errors.centre_id}>
                        <Select
                            value={form.data.centre_id}
                            onValueChange={(v) => form.setData('centre_id', v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('select_centre')} />
                            </SelectTrigger>
                            <SelectContent>
                                {centres.map((centre) => (
                                    <SelectItem key={centre.id} value={String(centre.id)}>
                                        {centre.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                )}

                <FormField label={t('title')} htmlFor="memo-title" error={form.errors.title}>
                    <Input
                        id="memo-title"
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                    />
                </FormField>

                <FormField
                    label={t('description')}
                    htmlFor="memo-description"
                    error={form.errors.description}
                >
                    <Textarea
                        id="memo-description"
                        rows={5}
                        value={form.data.description}
                        onChange={(e) => form.setData('description', e.target.value)}
                    />
                </FormField>

                <FormField label={t('photos')} error={form.errors.attachments}>
                    <PhotoPicker
                        files={form.data.attachments}
                        onChange={(files) => form.setData('attachments', files)}
                        max={3}
                    />
                </FormField>
            </FormDialog>
        </AppShell>
    );
}
